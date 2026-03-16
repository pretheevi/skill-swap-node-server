const express = require('express');
const router = express.Router();
const JWT = require('../../middleware/jwt');
const ChatRoom = require("../../models/chatRoom");
const Message = require('../../models/chatMessage');

router.post("/chat/send", JWT.authMiddleware, async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, text } = req.body;

    // create room if not exists, returns exisiting if it does
    const room = await ChatRoom.findOrCreate(senderId, receiver_id, text);
    const message = await Message.create(room.id, senderId, text);

    res.json({ success: true, data:{ room, message } })
  } catch(error) {
    next(error);
  }
});

router.get("/chat/rooms", JWT.authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rooms = await ChatRoom.findByUserId(userId);
    // console.log('aaaaaa',rooms)
    res.json({success: true, rooms})
  } catch(error) {
    next(error);
  }
});

router.get("/chat/room/conversation/:roomId", JWT.authMiddleware, async (req, res, next) => {
  try {
    const roomId = req.params.roomId;
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;
    
    const [roomConversation, totalCount] = await Promise.all([
      Message.findByRoomId(roomId, limit, offset),
      Message.getCountByRoomId(roomId)
    ]);
    
    res.json({
      success: true, 
      roomConversation,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch(error) {
    next(error);
  }
});


// PATCH /chat/room/:room_id/read
router.patch('/chat/room/:room_id/read', JWT.authMiddleware, async (req, res) => {
  const { room_id } = req.params;
  const userId = req.user.id;

  await Message.markAsRead(room_id, userId)

  res.json({ success: true });
});

router.delete('/chat/message/:messageId', JWT.authMiddleware, async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.id;

  await Message.delete(messageId, userId);

  res.json({ success: true });
})

module.exports = router;