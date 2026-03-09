const express = require('express');
const router = express.Router();
const jwt = require('../../middleware/jwt');
const Comment = require('../../models/comment');
const {errHandler} = require('../../errorHandler');
const { commentLikeLimiter } = require('../../middleware/rateLimit');
const CommentLikesModel = require('../../models/commentLikes');

router.get('/comments/:skill_id', jwt.authMiddleware, async (req, res, next) => {
  try {
    const skill_id = req.params.skill_id;
    const comments = await Comment.findBySkillId(skill_id);
    
    // Optionally add like counts and user's like status to each comment
    const userId = req.user.id;
    const commentsWithLikeInfo = await Promise.all(
      comments.map(async (comment) => {
        const likeCount = await CommentLikesModel.countByCommentId(comment.id);
        const userLiked = await CommentLikesModel.hasUserLiked(comment.id, userId);
        return {
          ...comment,
          like_count: likeCount,
          user_liked: userLiked
        };
      })
    );
    
    res.status(200).json(commentsWithLikeInfo);
  } catch (err) {
    next(err);
  }
});

router.post('/comment', jwt.authMiddleware, async (req, res, next) => {
  try{
    const {text, skill_id} = req.body;

    if (!text || !text.trim()) throw errHandler(400, 'Comment text is required');

    if (!skill_id || typeof skill_id !== "string") throw errHandler(400, 'Valid skill ID is required');

    const user_id = req.user.id;
    const newComment = await Comment.create({skill_id, user_id, text})
    res.status(201).json(newComment);
  } catch(err) {
    next(err);
  }
});

// Like a comment
router.post('/commentlike', jwt.authMiddleware, commentLikeLimiter, async (req, res, next) => {
  try{
    const { comment_id } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!comment_id || typeof comment_id !== "string") {
      throw errHandler(400, 'Valid comment ID is required');
    }

    // Check if comment exists
    const comment = await Comment.findById(comment_id);
    if (!comment) {
      throw errHandler(404, 'Comment not found');
    }

    // Add like
    const like = await CommentLikesModel.addLike(comment_id, user_id);
    
    if (!like) {
      // User already liked this comment
      throw errHandler(400, 'You have already liked this comment');
    }

    // Get updated like count
    const likeCount = await CommentLikesModel.countByCommentId(comment_id);

    res.status(201).json({
      message: 'Comment liked successfully',
      comment_id,
      like_count: likeCount,
      like
    });
  }catch(err) {
    next(err);
  }
});

// Unlike a comment
router.delete('/commentlike', jwt.authMiddleware, commentLikeLimiter, async (req, res, next) => {
  try{
    const { comment_id } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!comment_id || typeof comment_id !== "string") {
      throw errHandler(400, 'Valid comment ID is required');
    }

    // Check if comment exists
    const comment = await Comment.findById(comment_id);
    if (!comment) {
      throw errHandler(404, 'Comment not found');
    }

    // Remove like
    const removed = await CommentLikesModel.removeLike(comment_id, user_id);
    
    if (!removed) {
      // User hadn't liked this comment
      throw errHandler(400, 'You have not liked this comment');
    }

    // Get updated like count
    const likeCount = await CommentLikesModel.countByCommentId(comment_id);

    res.status(200).json({
      message: 'Comment unliked successfully',
      comment_id,
      like_count: likeCount
    });
  }catch(err) {
    next(err);
  }
});

// Toggle comment like (alternative approach)
router.post('/commentlike/toggle', jwt.authMiddleware, commentLikeLimiter, async (req, res, next) => {
  try{
    const { comment_id } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!comment_id || typeof comment_id !== "string") {
      throw errHandler(400, 'Valid comment ID is required');
    }

    // Check if comment exists
    const comment = await Comment.findById(comment_id);
    if (!comment) {
      throw errHandler(404, 'Comment not found');
    }

    // Toggle like
    const result = await CommentLikesModel.toggleLike(comment_id, user_id);
    
    // Get updated like count
    const likeCount = await CommentLikesModel.countByCommentId(comment_id);

    res.status(200).json({
      message: result.liked ? 'Comment liked' : 'Comment unliked',
      comment_id,
      liked: result.liked,
      like_count: likeCount
    });
  }catch(err) {
    next(err);
  }
});

// Get users who liked a comment
router.get('/comment/:comment_id/likes', jwt.authMiddleware, async (req, res, next) => {
  try{
    const comment_id = req.params.comment_id;

    // Check if comment exists
    const comment = await Comment.findById(comment_id);
    if (!comment) {
      throw errHandler(404, 'Comment not found');
    }

    const likes = await CommentLikesModel.findByCommentId(comment_id);
    const likeCount = await CommentLikesModel.countByCommentId(comment_id);

    res.status(200).json({
      comment_id,
      like_count: likeCount,
      likes
    });
  }catch(err) {
    next(err);
  }
});

// Check if current user liked a specific comment
router.get('/comment/:comment_id/liked', jwt.authMiddleware, async (req, res, next) => {
  try{
    const comment_id = req.params.comment_id;
    const user_id = req.user.id;

    // Check if comment exists
    const comment = await Comment.findById(comment_id);
    if (!comment) {
      throw errHandler(404, 'Comment not found');
    }

    const liked = await CommentLikesModel.hasUserLiked(comment_id, user_id);
    const likeCount = await CommentLikesModel.countByCommentId(comment_id);

    res.status(200).json({
      comment_id,
      liked,
      like_count: likeCount
    });
  }catch(err) {
    next(err);
  }
});

router.delete('/comment/:comment_id', jwt.authMiddleware, async (req, res) => {
  try {
    const commentId = req.params.comment_id;

    await Comment.delete(commentId);
    res.status(200).json({
      commentId,
      message: 'comment deleted successfully',
    });
  } catch(error) {
    next(error);
  }
})

module.exports = router;