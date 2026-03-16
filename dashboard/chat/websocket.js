const url = require("url");
const { WebSocket } = require("ws");
const JWT = require("../../middleware/jwt");
const ChatRoom = require("../../models/chatRoom");
const Message = require("../../models/chatMessage");
const UserFollows = require("../../models/userFollows");

const clients = {};

function BroadcastPresenceToContacts(userId, contactIds, isOnline) {
  for (let contactId of contactIds) {
    if (clients[contactId]) {
      for (let cws of Array.from(clients[contactId])) {
        if (cws.readyState === WebSocket.OPEN) {
          cws.send(JSON.stringify({ type: "presence", userId, isOnline }));
        }
      }
    }
  }
}

async function wsConnectionHandler(ws, req) {
  const request = url.parse(req.url, true);
  const token = request.query.token;

  if (!token) {
    ws.close();
    return;
  }

  let user;
  try {
    user = JWT.verify(token);
  } catch {
    ws.close();
    return;
  }

  console.log("✅ User connected:", user.id);
  const userId = String(user.id);

  // Initialize client set
  if (!clients[userId]) clients[userId] = new Set();
  clients[userId].add(ws);

  const contactIds = await UserFollows.getContactIds(userId);
  BroadcastPresenceToContacts(userId, contactIds, true);

  // send snapshot of already-online contacts to the newly connected user
  for (const contactId of contactIds) {
    if (clients[contactId]) {
      ws.send(JSON.stringify({ type: 'presence', userId: contactId, isOnline: true }));
    }
  }

  ws.on("message", async (data) => {
    const sender_id = userId;
    let type, receiver_id, text, room_id;
    try{
      ({ room_id, receiver_id, type, text } = JSON.parse(data));
    } catch(error) {
      ws.send(JSON.stringify({success: false, message: "Incorrect data format"}));
      return;
    }

    if (type === 'ping') {
      console.log('ws ping received');
      return;
    }

    if (type === 'delete_message') {
      const { message_id } = JSON.parse(data);
      const targets = [receiver_id, sender_id]; // ✅ both users

      for (const targetId of targets) {
        if (clients[targetId]) {
          for (let cws of Array.from(clients[targetId])) {
            if (cws.readyState === WebSocket.OPEN) {
              cws.send(JSON.stringify({ type: 'delete_message', message_id }));
            }
          }
        }
      }
      return;
    }

    if (type === 'typing') {
      console.log('aaaaa')
      if (clients[receiver_id]) {
        for (let cws of Array.from(clients[receiver_id])) {
          if (cws.readyState === WebSocket.OPEN) {
            cws.send(JSON.stringify({ type: 'typing', sender_id }));
          }
        }
      }
      return; // don't fall through to Message.create
    }

    if (!room_id) {
      const newRoom = await ChatRoom.findOrCreate(sender_id, receiver_id);
      room_id = newRoom.id;
    }

    await Message.create(room_id, sender_id, text);
    if (clients[receiver_id]) {
      for (let cws of Array.from(clients[receiver_id])) {
        if (cws.readyState === WebSocket.OPEN) {
          cws.send(JSON.stringify({
            room_id,
            sender_id,
            type,
            text,
            success: true,
          }));
        } else {
          clients[receiver_id].delete(cws);
        }
      };
    }

    if (type === 'message') {
      ws.send(JSON.stringify({
        room_id,
        sender_id,
        type,
        text,
        success: true,
      }))
    }
  });

  ws.on("close", async () => {
    clients[userId]?.delete(ws);
    if (clients[userId]?.size === 0) {
      delete clients[userId];
    }

    const contactIds = await UserFollows.getContactIds(userId);
    BroadcastPresenceToContacts(userId, contactIds, false);
  });
}

module.exports = wsConnectionHandler;
