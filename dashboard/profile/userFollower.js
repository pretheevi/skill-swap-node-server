const express = require("express");
const router = express.Router();
const jwt = require("../../middleware/jwt");
const { errHandler } = require("../../errorHandler");
const UserFollows = require("../../models/userFollows");

router.get("/profile/followers", jwt.authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const followers = await UserFollows.getFollowers(userId, userId);

    res.json(followers);
  } catch (err) {
    next(err);
  }
});

router.get(
  "/profile/followers/byId/:id",
  jwt.authMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.params.id;

      const followers = await UserFollows.getFollowers(userId, userId);

      res.json(followers);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/profile/following", jwt.authMiddleware, async (req, res, next) => {
  try {
    const following = await UserFollows.getFollowing(req.user.id);
    res.json(following);
  } catch (err) {
    next(err);
  }
});

router.get(
  "/profile/following/byId/:id",
  jwt.authMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.params.id;

      const following = await UserFollows.getFollowing(userId);

      res.json(following);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/follow/:userId",
  jwt.authMiddleware,
  async (req, res, next) => {
    try {
      console.log("from " + req.user.id + " Follow request received for userId:", req.params.userId);
      const followerId = req.user.id;
      const followingId = req.params.userId;

      if (followerId === followingId)
        throw errHandler("You can't follow yourself");

      await UserFollows.follow(followerId, followingId);

      res.json({ message: "Followed successfully" });
    } catch (err) {
      next(err);
    }
  },
);

router.delete("/follow/:userId", jwt.authMiddleware, async (req, res) => {
  try {
    await UserFollows.unfollow(req.user.id, req.params.userId);
    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
