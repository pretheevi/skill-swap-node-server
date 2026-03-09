const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");

class CommentModel {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS Comment (
          id TEXT PRIMARY KEY,
          skill_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (skill_id) REFERENCES Skill(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `);
    } catch (error) {
      console.error("Error creating comment table:", error);
      throw error;
    }
  }

  static async create(commentData) {
    try {
      const db = await this.getDb();
      const commentId = uuidv4();
      const { skill_id, user_id, text } = commentData;
      await db.execute({
        sql: `INSERT INTO Comment (id, skill_id, user_id, text) VALUES (?, ?, ?, ?)`,
        args: [commentId, skill_id, user_id, text],
      });
      const result = await db.execute({
        sql: `
          SELECT Comment.*, User.name as user_name, User.avatar as user_avatar
          FROM Comment
          JOIN User ON Comment.user_id = User.id
          WHERE Comment.id = ?
        `,
        args: [commentId],
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  }

  static async findBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT Comment.*, User.name as user_name, User.avatar as user_avatar
          FROM Comment
          JOIN User ON Comment.user_id = User.id
          WHERE Comment.skill_id = ?
          ORDER BY Comment.created_at DESC
        `,
        args: [skillId],
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding comments by skill id:", error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT Comment.*, Skill.title as skill_title
          FROM Comment
          JOIN Skill ON Comment.skill_id = Skill.id
          WHERE Comment.user_id = ?
          ORDER BY Comment.created_at DESC
        `,
        args: [userId],
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding comments by user id:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT * FROM Comment WHERE id = ?`,
        args: [id],
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding comment by id:", error);
      throw error;
    }
  }

  static async update(id, text) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `UPDATE Comment SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [text, id],
      });
      return { id, text };
    } catch (error) {
      console.error("Error updating comment:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Comment WHERE id = ?`,
        args: [id],
      });
      return true;
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }

  static async deleteBySkillId(skillId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Comment WHERE skill_id = ?`,
        args: [skillId],
      });
      return true;
    } catch (error) {
      console.error("Error deleting comments by skill id:", error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Comment WHERE user_id = ?`,
        args: [userId],
      });
      return true;
    } catch (error) {
      console.error("Error deleting comments by user id:", error);
      throw error;
    }
  }
}

module.exports = CommentModel;