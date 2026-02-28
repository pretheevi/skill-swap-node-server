const express = require("express");
const router = express.Router();
const jwt = require("../../middleware/jwt");
const SkillLikesModel = require("../../models/skillLikes");
const { skillLikeLimiter } = require('../../middleware/rateLimit');
/**
 * @route   POST /api/skills/:skillId/like
 * @desc    Like a skill
 * @access  Private
 */
router.post("/:skillId/like", jwt.authMiddleware, async (req, res) => {
  try {
    const { skillId } = req.params;
    const userId = req.user.id;

    const result = await SkillLikesModel.addLike(skillId, userId);
    
    if (!result) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already liked this skill" 
      });
    }

    // Get updated like count
    const likeCount = await SkillLikesModel.countBySkillId(skillId);

    res.status(201).json({
      success: true,
      message: "Skill liked successfully",
      data: {
        like: result,
        likeCount
      }
    });
  } catch (error) {
    console.error("Error liking skill:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to like skill" 
    });
  }
});

/**
 * @route   DELETE /api/skills/:skillId/like
 * @desc    Unlike a skill
 * @access  Private
 */
router.delete("/:skillId/like", jwt.authMiddleware, async (req, res) => {
  try {
    const { skillId } = req.params;
    const userId = req.user.id;

    const removed = await SkillLikesModel.removeLike(skillId, userId);
    
    if (!removed) {
      return res.status(404).json({ 
        success: false, 
        message: "Like not found" 
      });
    }

    // Get updated like count
    const likeCount = await SkillLikesModel.countBySkillId(skillId);

    res.json({
      success: true,
      message: "Skill unliked successfully",
      data: {
        likeCount
      }
    });
  } catch (error) {
    console.error("Error unliking skill:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to unlike skill" 
    });
  }
});

/**
 * @route   GET /api/skills/:skillId/likes
 * @desc    Get all likes for a specific skill
 * @access  Public
 */
router.get("/:skillId/likes", async (req, res) => {
  try {
    const { skillId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const likes = await SkillLikesModel.findBySkillId(skillId);
    const likeCount = await SkillLikesModel.countBySkillId(skillId);

    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLikes = likes.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        likes: paginatedLikes,
        totalCount: likeCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(likeCount / limit),
        hasMore: endIndex < likeCount
      }
    });
  } catch (error) {
    console.error("Error getting skill likes:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get skill likes" 
    });
  }
});

/**
 * @route   GET /api/skills/:skillId/like/status
 * @desc    Check if current user liked a skill
 * @access  Private
 */
router.get("/:skillId/like/status", jwt.authMiddleware, async (req, res) => {
  try {
    const { skillId } = req.params;
    const userId = req.user.id;

    const hasLiked = await SkillLikesModel.hasUserLiked(skillId, userId);

    res.json({
      success: true,
      data: {
        liked: hasLiked
      }
    });
  } catch (error) {
    console.error("Error checking like status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to check like status" 
    });
  }
});

/**
 * @route   POST /api/skills/:skillId/like/toggle
 * @desc    Toggle like/unlike for a skill
 * @access  Private
 */
router.post("/:skillId/like/toggle", jwt.authMiddleware, skillLikeLimiter, async (req, res) => {
  try {
    const { skillId } = req.params;
    const userId = req.user.id;

    const result = await SkillLikesModel.toggleLike(skillId, userId);
    
    // Get updated like count
    const likeCount = await SkillLikesModel.countBySkillId(skillId);

    res.json({
      success: true,
      message: result.liked ? "Skill liked" : "Skill unliked",
      data: {
        liked: result.liked,
        likeCount
      }
    });
  } catch (error) {
    console.error("Error toggling skill like:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to toggle like" 
    });
  }
});

/**
 * @route   GET /api/users/me/liked-skills
 * @desc    Get all skills liked by current user
 * @access  Private
 */
router.get("/users/me/liked-skills", jwt.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const likedSkills = await SkillLikesModel.findByUserId(userId);
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLikes = likedSkills.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        likedSkills: paginatedLikes,
        totalCount: likedSkills.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(likedSkills.length / limit),
        hasMore: endIndex < likedSkills.length
      }
    });
  } catch (error) {
    console.error("Error getting user liked skills:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get liked skills" 
    });
  }
});

/**
 * @route   GET /api/users/:userId/liked-skills
 * @desc    Get all skills liked by a specific user
 * @access  Public
 */
router.get("/users/:userId/liked-skills", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const likedSkills = await SkillLikesModel.findByUserId(userId);
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLikes = likedSkills.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        likedSkills: paginatedLikes,
        totalCount: likedSkills.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(likedSkills.length / limit),
        hasMore: endIndex < likedSkills.length
      }
    });
  } catch (error) {
    console.error("Error getting user liked skills:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get liked skills" 
    });
  }
});

/**
 * @route   GET /api/skills/likes/batch
 * @desc    Get like counts for multiple skills (batch operation)
 * @access  Public
 */
router.post("/likes/batch", async (req, res) => {
  try {
    const { skillIds } = req.body;
    
    if (!skillIds || !Array.isArray(skillIds)) {
      return res.status(400).json({ 
        success: false, 
        message: "skillIds array is required" 
      });
    }

    const likeCounts = await SkillLikesModel.getLikeCountsForSkills(skillIds);

    res.json({
      success: true,
      data: likeCounts
    });
  } catch (error) {
    console.error("Error getting batch like counts:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get like counts" 
    });
  }
});

/**
 * @route   POST /api/skills/likes/status/batch
 * @desc    Check if user liked multiple skills (batch operation)
 * @access  Private
 */
router.post("/likes/status/batch", jwt.authMiddleware, async (req, res) => {
  try {
    const { skillIds } = req.body;
    const userId = req.user.id;
    
    if (!skillIds || !Array.isArray(skillIds)) {
      return res.status(400).json({ 
        success: false, 
        message: "skillIds array is required" 
      });
    }

    const likedStatus = await SkillLikesModel.getUserLikesForSkills(userId, skillIds);

    res.json({
      success: true,
      data: likedStatus
    });
  } catch (error) {
    console.error("Error getting batch like status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get like status" 
    });
  }
});

/**
 * @route   DELETE /api/admin/skills/:skillId/likes
 * @desc    Delete all likes for a skill (admin only)
 * @access  Private/Admin
 */
router.delete("/admin/:skillId/likes", jwt.authMiddleware, async (req, res) => {
  try {
    const { skillId } = req.params;
    
    await SkillLikesModel.deleteBySkillId(skillId);

    res.json({
      success: true,
      message: "All likes for skill deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting skill likes:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete skill likes" 
    });
  }
});

module.exports = router;