const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");

class CommentModel {
  static async getDb() {
    const db = await connectDb();
    return db;
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      const query = `
        CREATE TABLE IF NOT EXISTS Comment (
          id TEXT PRIMARY KEY,
          skill_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Foreign key constraints
          FOREIGN KEY (skill_id) REFERENCES Skill(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `;
      await db.run(query);
    } catch (error) {
      console.error("Error creating comment table:", error);
      throw error;
    }
  }

  // Optional: Add CRUD methods for convenience
  static async create(commentData) {
    try {
      const db = await this.getDb();
      const commentId = uuidv4();
      const { skill_id, user_id, text } = commentData;
      const query = `
        INSERT INTO Comment (id, skill_id, user_id, text)
        VALUES (?, ?, ?, ?)
      `;
      await db.run(query, [commentId, skill_id, user_id, text]);
      
      // Fetch full comment with join
      const selectQuery = `
        SELECT Comment.*, User.name as user_name, User.avatar as user_avatar
        FROM Comment
        JOIN User ON Comment.user_id = User.id
        WHERE Comment.id = ?
      `;

      const newComment = await db.get(selectQuery, [commentId]);

      return newComment;
      
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  }

  static async findBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT Comment.*, User.name as user_name, User.avatar as user_avatar
        FROM Comment
        JOIN User ON Comment.user_id = User.id
        WHERE Comment.skill_id = ?
        ORDER BY Comment.created_at DESC
      `;
      return await db.all(query, [skillId]);
    } catch (error) {
      console.error("Error finding comments by skill id:", error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT Comment.*, Skill.title as skill_title
        FROM Comment
        JOIN Skill ON Comment.skill_id = Skill.id
        WHERE Comment.user_id = ?
        ORDER BY Comment.created_at DESC
      `;
      return await db.all(query, [userId]);
    } catch (error) {
      console.error("Error finding comments by user id:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const db = await this.getDb();
      const query = `SELECT * FROM Comment WHERE id = ?`;
      return await db.get(query, [id]);
    } catch (error) {
      console.error("Error finding comment by id:", error);
      throw error;
    }
  }

  static async update(id, text) {
    try {
      const db = await this.getDb();
      const query = `
        UPDATE Comment 
        SET text = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await db.run(query, [text, id]);
      return { id, text };
    } catch (error) {
      console.error("Error updating comment:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const db = await this.getDb();
      const query = `DELETE FROM Comment WHERE id = ?`;
      await db.run(query, [id]);
      return true;
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }

  static async deleteBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const query = `DELETE FROM Comment WHERE skill_id = ?`;
      await db.run(query, [skillId]);
      return true;
    } catch (error) {
      console.error("Error deleting comments by skill id:", error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      const db = await this.getDb();
      const query = `DELETE FROM Comment WHERE user_id = ?`;
      await db.run(query, [userId]);
      return true;
    } catch (error) {
      console.error("Error deleting comments by user id:", error);
      throw error;
    }
  }
}

module.exports = CommentModel;