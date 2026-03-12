const url = require("url");
const { WebSocket } = require("ws");
const JWT = require("../../middleware/jwt");
const ChatRoom = require("../../models/chatRoom");
const Message = require("../../models/chatMessage");

const clients = {};

function broadcastPresence(userId, status) {
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
  
  console.log('✅ User connected:', user.id);
  const userId = String(user.id);

  // Initialize client set
  if (!clients[userId]) clients[userId] = new Set();
  clients[userId].add(ws);
  
  // Send online users to the new connection
  const onlineUserIds = Object.keys(clients);
  ws.send(JSON.stringify({ type: 'online_users', userIds: onlineUserIds }));
  
  // Broadcast new user online to everyone
  broadcastPresence(userId, 'online');

  ws.on("message", async (data) => {
    let msg;
    try { 
      msg = JSON.parse(data.toString()); 
      console.log('📩 WS message received:', msg);
    } catch { 
      console.error('❌ Failed to parse message:', data.toString());
      return; 
    }

    // ── Ping return ───────────────────────────────────────────
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    
    // ── Typing indicator ──────────────────────────────────────
    if (msg.type === 'typing') {
      const { receiver_id } = msg;
      const receiverId = String(receiver_id);
      
      console.log('✏️ Typing indicator - from:', userId, 'to:', receiverId);
      
      if (!receiverId) return;
      
      // Send typing indicator to receiver if online
      if (clients[receiverId]) {
        for (const toWs of clients[receiverId]) {
          if (toWs?.readyState === WebSocket.OPEN) {
            toWs.send(JSON.stringify({ 
              type: 'typing', 
              sender_id: userId 
            }));
          }
        }
      }
      return;
    }

    // ── Chat message ──────────────────────────────────────────
    // Handle both { type: 'message', ... } and direct { text, receiver_id }
    if (msg.type === 'message' || (msg.text && msg.receiver_id)) {
      const receiver_id = msg.receiver_id;
      const text = msg.text;
      const tempId = msg.tempId;
      
      if (!receiver_id || !text) {
        console.log('❌ Missing receiver_id or text:', msg);
        return;
      }

      const receiverId = String(receiver_id);

      try {
        // Find or create room
        const room = await ChatRoom.findOrCreate(userId, receiverId);
        
        // Save message to database
        const savedMessage = await Message.create(room.id, userId, text);
        
        // Prepare message object with metadata
        const messageData = {
          id: savedMessage.id,
          room_id: room.id,
          sender_id: userId,
          text: savedMessage.text,
          created_at: savedMessage.created_at,
          is_read: savedMessage.is_read || 0
        };

        // Prepare message with tempId for sender confirmation
        const messageWithTempId = {
          ...messageData,
          tempId: tempId
        };

        // Send to receiver if online
        if (clients[receiverId]) {
          for (const toWs of clients[receiverId]) {
            if (toWs?.readyState === WebSocket.OPEN) {
              toWs.send(JSON.stringify({ 
                type: 'message', 
                message: messageData 
              }));
            }
          }
        }

        // Confirm back to sender with tempId
        ws.send(JSON.stringify({
          type: 'sent',
          message: messageWithTempId
        }));

        console.log('✅ Message sent and saved - ID:', savedMessage.id, 'Room:', room.id);

      } catch (err) {
        console.error('❌ WS message error:', err);
        // Send error back to sender
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to send message',
          tempId
        }));
      }
      return;
    }

    // Unknown message type
    console.log('⚠️ Unknown message type:', msg);
  });

  ws.on("close", () => {
    if (clients[userId]) {
      clients[userId].delete(ws);
      if (clients[userId].size === 0) {
        delete clients[userId];
        broadcastPresence(userId, 'offline');
      }
    }
    console.log('🔌 User disconnected:', userId);
  });

  ws.on("error", (error) => {
    console.error('❌ WebSocket error for user', userId, ':', error);
  });
}

module.exports = wsConnectionHandler;