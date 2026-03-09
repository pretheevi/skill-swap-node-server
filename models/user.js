const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");

class UserModel {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS User (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          avatar TEXT DEFAULT '',
          avatar_public_id TEXT,
          bio TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (error) {
      console.error("Error creating user table:", error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const db = await this.getDb();
      const userId = uuidv4();
      const { name, email, password, avatar = '', bio = '' } = userData;
      await db.execute({
        sql: `INSERT INTO User (id, name, email, password, avatar, bio) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [userId, name, email, password, avatar, bio],
      });
      return { id: userId, ...userData };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT * FROM User WHERE email = ?`,
        args: [email],
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  static async findByName(name) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT * FROM User WHERE name = ?`,
        args: [name],
      });
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT * FROM User WHERE id = ?`,
        args: [id],
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding user by id:", error);
      throw error;
    }
  }

  static async update(id, userData) {
    try {
      const db = await this.getDb();
      const fields = [];
      const values = [];

      if (userData.name !== undefined)             { fields.push('name = ?');             values.push(userData.name); }
      if (userData.avatar !== undefined)           { fields.push('avatar = ?');           values.push(userData.avatar); }
      if (userData.avatar_public_id !== undefined) { fields.push('avatar_public_id = ?'); values.push(userData.avatar_public_id); }
      if (userData.bio !== undefined)              { fields.push('bio = ?');              values.push(userData.bio); }

      if (fields.length === 0) return { id };

      values.push(id);
      await db.execute({
        sql: `UPDATE User SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: values,
      });
      return { id, ...userData };
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  static async deleteAvatar(id) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `UPDATE User SET avatar = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [id],
      });
      return { id, avatar: '' };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM User WHERE id = ?`,
        args: [id],
      });
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  static async searchUsers(search, currentUserId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT 
            u.id,
            u.name,
            u.avatar,
            (uf.follower_id IS NOT NULL) AS is_following
          FROM User u
          LEFT JOIN user_follows uf
            ON uf.following_id = u.id
           AND uf.follower_id = ?
          WHERE u.name LIKE ?
            AND u.id != ?
          ORDER BY u.name ASC
          LIMIT 20
        `,
        args: [currentUserId, `%${search}%`, currentUserId],
      });
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;