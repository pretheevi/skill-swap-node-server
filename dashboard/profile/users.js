const express = require("express");
const router = express.Router();
const jwt = require("../../middleware/jwt");
const UserModel = require("../../models/user");
const UserFollows = require("../../models/userFollows");
const SkillModel = require("../../models/skills");
const cloudinary = require("../../config/cloudinary");
const { errHandler } = require("../../errorHandler");
const { uploadProfilePic } = require("../../middleware/upload");

router.get("/profile", jwt.authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userInfo = await UserModel.findById(req.user.id);
    const counts = await UserFollows.getCounts(userId);
    const postsCount = await SkillModel.getPostCountByUserId(userId);

    res.json({
      ...userInfo,
      followers_count: counts.followers,
      following_count: counts.following,
      posts_count: postsCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/profileById/:id", jwt.authMiddleware, async (req, res, next) => {
  try {
    const loggedUser = req.user.id;
    const userId = req.params.id;

    const userInfo = await UserModel.findById(userId);
    const counts = await UserFollows.getCounts(userId);
    const isFollowing = await UserFollows.isFollowing(loggedUser, userId);

    res.json({
      ...userInfo,
      followers_count: counts.followers,
      following_count: counts.following,
      is_following: isFollowing,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/users/search", jwt.authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const search = req.query.q?.trim();

    if (!search) return res.json([]);

    const users = await UserModel.searchUsers(search, userId);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/profile",
  jwt.authMiddleware,
  uploadProfilePic,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const user = await UserModel.findById(userId);

      if (!user) throw errHandler(404, "User not found");

      const updateData = {
        name: req.body.name || user.name,
        bio: req.body.bio || user.bio,
        avatar: user.avatar || "",
        avatar_public_id: user.avatar_public_id || "",
      };

      if (req.file) {
        if (user.avatar_public_id) {
          try {
            const result = await cloudinary.uploader.destroy(
              user.avatar_public_id,
              { resource_type: "image" },
            );
            console.log("Cloudinary destroy result:", result);
          } catch (cloudErr) {
            console.log("cloudinary delete failed", cloudErr);
          }
        }
        updateData.avatar = req.file.path;
        updateData.avatar_public_id = req.file.filename;
      } else if (req.body.remove_avatar === "true" || req.body.avatar === "") {
        if (user.avatar_public_id) {
          try {
            const result = await cloudinary.uploader.destroy(
              user.avatar_public_id,
              { resource_type: "image" },
            );
            console.log("Cloudinary destroy result (removing avatar):", result);
          } catch (cloudErr) {
            console.log("cloudinary delete failed", cloudErr);
          }
        }
        updateData.avatar = "";
        updateData.avatar_public_id = "";
      }

      await UserModel.update(userId, updateData);

      const updatedUser = await UserModel.findById(userId);
      res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          bio: updatedUser.bio,
          avatar: updatedUser.avatar || "",
        },
      });
    } catch (err) {
      if (req.file) {
        try {
          if (req.file.filename) {
            await cloudinary.uploader.destroy(req.file.filename, {
              resource_type: "image",
            });
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up uploaded file:", cleanupErr);
        }
      }
      next(err);
    }
  },
);

router.delete("/profile/avatar", jwt.authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user.avatar) throw errHandler(400, "No avatar to delete");
    await UserModel.deleteAvatar(req.user.id);
    res.json({ message: "Avatar deleted successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
