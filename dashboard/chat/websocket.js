const url = require("url");
const { WebSocket } = require("ws");
const JWT = require("../../middleware/jwt");
const ChatRoom = require("../../models/chatRoom");
const Message = require("../../models/chatMessage");

const clients = {};

function broadcastPresence(userId, status, clients) {
  const event = JSON.stringify({ type: 'presence', userId, status });

  // send to ALL connected users 
  for (const [id, sockets] of Object.entries(clients)) {
    if (String(id) === String(userId)) continue;
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(event);
      }
    }
  }
}

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
  console.log('user', user)
  const userId = user.id;

  if (!clients[userId]) clients[userId] = new Set();
  clients[userId].add(ws);
  const onlineUserIds = Object.keys(clients);
  ws.send(JSON.stringify({ type: 'online_users', userIds: onlineUserIds }));
  broadcastPresence(userId, 'online', clients);

  ws.on("message", async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    // ── Ping return ───────────────────────────────────────────
    if (msg.type === 'ping') return;
    
    // ── Typing indicator ──────────────────────────────────────
    if (msg.type === 'typing') {
      const { receiver_id } = msg;
      console.log('typing received, receiver_id:', receiver_id);
      if (!receiver_id) return;
      console.log('typing...')
      for (const toWs of clients[receiver_id] || []) {
        if (toWs?.readyState === WebSocket.OPEN) {
          toWs.send(JSON.stringify({ 
            type: 'typing', 
            sender_id: userId 
          }));
        }
      }
      return; // don't fall through to message logic
    }

    // ── Chat message ──────────────────────────────────────────
    const { receiver_id, text } = msg;
    if (!receiver_id || !text) return;

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
    if (clients[userId]?.size === 0) {
      delete clients[userId];
      broadcastPresence(userId, 'offline', clients);
    } 
  });
}

module.exports = wsConnectionHandler;