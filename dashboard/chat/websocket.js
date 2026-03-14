const url = require("url");
const { WebSocket } = require("ws");
const JWT = require("../../middleware/jwt");
const ChatRoom = require("../../models/chatRoom");
const Message = require("../../models/chatMessage");

const clients = {};

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
}

module.exports = wsConnectionHandler;
