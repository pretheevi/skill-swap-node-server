const express = require("express");
const router = express.Router();
const jwt = require("../../middleware/jwt");
const { errHandler } = require("../../errorHandler");
const UserFollows = require("../../models/userFollows");
const { followUnfollowLimiter } = require('../../middleware/rateLimit');

router.get(
  "/profile/followers/byId/:id",
  jwt.authMiddleware,
  async (req, res, next) => {
    try {
      const loggedUserId = req.user.id;
      const userId = req.params.id;

      const followers = await UserFollows.getFollowers(userId, loggedUserId);

      res.json(followers);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/profile/following/byId/:id",
  jwt.authMiddleware,
  async (req, res, next) => {
    try {
      const loggedUserId = req.user.id;
      const userId = req.params.id;

      const following = await UserFollows.getFollowing(userId, loggedUserId);

      res.json(following);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/follow/:userId",
  jwt.authMiddleware,
  followUnfollowLimiter,
  async (req, res, next) => {
    try {
      const followerId = req.user.id;
      const followingId = req.params.userId;

      if (followerId === followingId) {
        return res.status(400).json({ success: false, message: "You can't follow yourself" });
      }

      await UserFollows.follow(followerId, followingId);

      res.json({ success: true, message: "Followed successfully" });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/follow/:userId", jwt.authMiddleware, followUnfollowLimiter, async (req, res) => {
  try {
    await UserFollows.unfollow(req.user.id, req.params.userId);
    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
