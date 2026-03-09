const connectDb = require("../db");

class CommentLikesModel {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS Comment_Likes (
          comment_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (comment_id, user_id),
          FOREIGN KEY (comment_id) REFERENCES Comment(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `);
    } catch (error) {
      console.error("Error creating comment_likes table:", error);
      throw error;
    }
  }

  static async addLike(commentId, userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `INSERT INTO Comment_Likes (comment_id, user_id) VALUES (?, ?)`,
        args: [commentId, userId],
      });
      const result = await db.execute({
        sql: `
          SELECT CL.*, User.name as user_name, User.avatar as user_avatar
          FROM Comment_Likes CL
          JOIN User ON CL.user_id = User.id
          WHERE CL.comment_id = ? AND CL.user_id = ?
        `,
        args: [commentId, userId],
      });
      return result.rows[0] || null;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) return null;
      console.error("Error adding like:", error);
      throw error;
    }
  }

  static async removeLike(commentId, userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Comment_Likes WHERE comment_id = ? AND user_id = ?`,
        args: [commentId, userId],
      });
      return true;
    } catch (error) {
      console.error("Error removing like:", error);
      throw error;
    }
  }

  static async hasUserLiked(commentId, userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT 1 FROM Comment_Likes WHERE comment_id = ? AND user_id = ?`,
        args: [commentId, userId],
      });
      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking if user liked comment:", error);
      throw error;
    }
  }

  static async findByCommentId(commentId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT CL.*, User.name as user_name, User.avatar as user_avatar
          FROM Comment_Likes CL
          JOIN User ON CL.user_id = User.id
          WHERE CL.comment_id = ?
          ORDER BY CL.created_at DESC
        `,
        args: [commentId],
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding likes by comment id:", error);
      throw error;
    }
  }

  static async countByCommentId(commentId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM Comment_Likes WHERE comment_id = ?`,
        args: [commentId],
      });
      return result.rows[0].count;
    } catch (error) {
      console.error("Error counting likes by comment id:", error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT CL.*, 
                 Comment.text as comment_text,
                 Comment.skill_id,
                 Skill.title as skill_title
          FROM Comment_Likes CL
          JOIN Comment ON CL.comment_id = Comment.id
          JOIN Skill ON Comment.skill_id = Skill.id
          WHERE CL.user_id = ?
          ORDER BY CL.created_at DESC
        `,
        args: [userId],
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding likes by user id:", error);
      throw error;
    }
  }

  static async findByCommentIds(commentIds) {
    try {
      if (!commentIds.length) return [];
      const db = await this.getDb();
      const placeholders = commentIds.map(() => '?').join(',');
      const result = await db.execute({
        sql: `
          SELECT CL.*, User.name as user_name, User.avatar as user_avatar
          FROM Comment_Likes CL
          JOIN User ON CL.user_id = User.id
          WHERE CL.comment_id IN (${placeholders})
          ORDER BY CL.created_at DESC
        `,
        args: commentIds,
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding likes by comment ids:", error);
      throw error;
    }
  }

  static async deleteByCommentId(commentId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Comment_Likes WHERE comment_id = ?`,
        args: [commentId],
      });
      return true;
    } catch (error) {
      console.error("Error deleting likes by comment id:", error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Comment_Likes WHERE user_id = ?`,
        args: [userId],
      });
      return true;
    } catch (error) {
      console.error("Error deleting likes by user id:", error);
      throw error;
    }
  }

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