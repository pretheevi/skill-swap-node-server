const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");

class CommentLikesModel {
  static async getDb() {
    const db = await connectDb();
    return db;
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      const query = `
        CREATE TABLE IF NOT EXISTS Comment_Likes (
          comment_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          PRIMARY KEY (comment_id, user_id),

          FOREIGN KEY (comment_id) REFERENCES Comment(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `;
      await db.run(query);
    } catch (error) {
      console.error("Error creating comment_likes table:", error);
      throw error;
    }
  }

  // Add a like (since it's a composite primary key, no uuid needed)
  static async addLike(commentId, userId) {
    try {
      const db = await this.getDb();
      const query = `
        INSERT INTO Comment_Likes (comment_id, user_id)
        VALUES (?, ?)
      `;
      await db.run(query, [commentId, userId]);
      
      // Return the like with additional info
      const selectQuery = `
        SELECT CL.*, User.name as user_name, User.avatar as user_avatar
        FROM Comment_Likes CL
        JOIN User ON CL.user_id = User.id
        WHERE CL.comment_id = ? AND CL.user_id = ?
      `;
      
      return await db.get(selectQuery, [commentId, userId]);
    } catch (error) {
      // Handle unique constraint violation (already liked)
      if (error.message.includes('UNIQUE constraint failed')) {
        return null; // Already liked
      }
      console.error("Error adding like:", error);
      throw error;
    }
  }

  // Remove a like
  static async removeLike(commentId, userId) {
    try {
      const db = await this.getDb();
      const query = `
        DELETE FROM Comment_Likes 
        WHERE comment_id = ? AND user_id = ?
      `;
      const result = await db.run(query, [commentId, userId]);
      return result.changes > 0; // Returns true if a like was removed
    } catch (error) {
      console.error("Error removing like:", error);
      throw error;
    }
  }

  // Check if a user liked a specific comment
  static async hasUserLiked(commentId, userId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT 1 FROM Comment_Likes 
        WHERE comment_id = ? AND user_id = ?
      `;
      const result = await db.get(query, [commentId, userId]);
      return !!result;
    } catch (error) {
      console.error("Error checking if user liked comment:", error);
      throw error;
    }
  }

  // Get all likes for a specific comment with user details
  static async findByCommentId(commentId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT CL.*, User.name as user_name, User.avatar as user_avatar
        FROM Comment_Likes CL
        JOIN User ON CL.user_id = User.id
        WHERE CL.comment_id = ?
        ORDER BY CL.created_at DESC
      `;
      return await db.all(query, [commentId]);
    } catch (error) {
      console.error("Error finding likes by comment id:", error);
      throw error;
    }
  }

  // Get count of likes for a comment
  static async countByCommentId(commentId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT COUNT(*) as count 
        FROM Comment_Likes 
        WHERE comment_id = ?
      `;
      const result = await db.get(query, [commentId]);
      return result.count;
    } catch (error) {
      console.error("Error counting likes by comment id:", error);
      throw error;
    }
  }

  // Get all comments liked by a specific user
  static async findByUserId(userId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT CL.*, 
               Comment.text as comment_text,
               Comment.skill_id,
               Skill.title as skill_title
        FROM Comment_Likes CL
        JOIN Comment ON CL.comment_id = Comment.id
        JOIN Skill ON Comment.skill_id = Skill.id
        WHERE CL.user_id = ?
        ORDER BY CL.created_at DESC
      `;
      return await db.all(query, [userId]);
    } catch (error) {
      console.error("Error finding likes by user id:", error);
      throw error;
    }
  }

  // Get likes for multiple comments (useful for batch operations)
  static async findByCommentIds(commentIds) {
    try {
      if (!commentIds.length) return [];
      
      const db = await this.getDb();
      const placeholders = commentIds.map(() => '?').join(',');
      const query = `
        SELECT CL.*, User.name as user_name, User.avatar as user_avatar
        FROM Comment_Likes CL
        JOIN User ON CL.user_id = User.id
        WHERE CL.comment_id IN (${placeholders})
        ORDER BY CL.created_at DESC
      `;
      return await db.all(query, commentIds);
    } catch (error) {
      console.error("Error finding likes by comment ids:", error);
      throw error;
    }
  }

  // Delete all likes for a comment (useful when deleting a comment)
  static async deleteByCommentId(commentId) {
    try {
      const db = await this.getDb();
      const query = `DELETE FROM Comment_Likes WHERE comment_id = ?`;
      await db.run(query, [commentId]);
      return true;
    } catch (error) {
      console.error("Error deleting likes by comment id:", error);
      throw error;
    }
  }

  // Delete all likes by a user (useful when deleting a user)
  static async deleteByUserId(userId) {
    try {
      const db = await this.getDb();
      const query = `DELETE FROM Comment_Likes WHERE user_id = ?`;
      await db.run(query, [userId]);
      return true;
    } catch (error) {
      console.error("Error deleting likes by user id:", error);
      throw error;
    }
  }

  // Toggle like (add if not exists, remove if exists)
  static async toggleLike(commentId, userId) {
    try {
      const hasLiked = await this.hasUserLiked(commentId, userId);
      
      if (hasLiked) {
        await this.removeLike(commentId, userId);
        return { liked: false, commentId, userId };
      } else {
        await this.addLike(commentId, userId);
        return { liked: true, commentId, userId };
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  }
}

module.exports = CommentLikesModel;