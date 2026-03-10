const url = require("url");
const { WebSocket } = require("ws");
const JWT = require("../../middleware/jwt");
const ChatRoom = require("../../models/chatRoom");
const Message = require("../../models/chatMessage");

const clients = {};

async function wsConnectionHandler(ws, req) {
  const request = url.parse(req.url, true);
  const token = request.query.token;
  if (!token) { ws.close(); return; }

  let user;
  try {
    user = JWT.verify(token);
  } catch {
    ws.close();
    return;
  }

  const userId = user.id; // ← was user._id

  if (!clients[userId]) clients[userId] = new Set();
  clients[userId].add(ws);
  console.log(`WS connected: ${userId}`);

  ws.on("message", async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === 'ping') return;
    
    const { receiver_id, text } = msg;
    if (!receiver_id || !text) return;
    console.log('ws', msg);
    try {
      // save to DB
      const room = await ChatRoom.findOrCreate(userId, receiver_id);
      const message = await Message.create(room.id, userId, text);

      // send to receiver if online
      for (const toWs of clients[receiver_id] || []) {
        if (toWs?.readyState === WebSocket.OPEN) {
          toWs.send(JSON.stringify({ type: 'message', message }));
        }
      }

      // confirm back to sender
      ws.send(JSON.stringify({ type: 'sent', message }));

    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on("close", () => {
    clients[userId]?.delete(ws);
    if (clients[userId]?.size === 0) delete clients[userId];
  });
}

module.exports = wsConnectionHandler;