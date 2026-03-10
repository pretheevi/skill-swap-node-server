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
    res.json({success: true, rooms})
  } catch(error) {
    next(error);
  }
});

router.get("/chat/room/conversation/:roomId", JWT.authMiddleware, async (req, res, next) => {
  try {
    const roomId = req.params.roomId;
    const roomConversation = await Message.findByRoomId(roomId);
    res.json({success: true, roomConversation});
  } catch(error) {
    next(error);
  }
});

module.exports = router;