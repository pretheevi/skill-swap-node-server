const connectDb = require('../db');
const { v4: uuidv4 } = require("uuid");

class ChatRoom {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS ChatRoom (
          id TEXT PRIMARY KEY,
          user1_id TEXT NOT NULL,
          user2_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user1_id) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (user2_id) REFERENCES User(id) ON DELETE CASCADE,
          UNIQUE (user1_id, user2_id)
        );
      `);
    } catch (error) {
      console.error("Error creating ChatRoom table:", error);
      throw error;
    }
  }

  // get existing room or create one between two users
  static async findOrCreate(userAId, userBId) {
    try {
      const db = await this.getDb();

      // always store user ids in consistent order to respect UNIQUE constraint
      const user1_id = userAId < userBId ? userAId : userBId;
      const user2_id = userAId < userBId ? userBId : userAId;

      // check if room already exists
      const existing = await db.execute({
        sql: `SELECT * FROM ChatRoom WHERE user1_id = ? AND user2_id = ?`,
        args: [user1_id, user2_id],
      });

      if (existing.rows.length > 0) return existing.rows[0];

      // create new room
      const roomId = uuidv4();
      await db.execute({
        sql: `INSERT INTO ChatRoom (id, user1_id, user2_id) VALUES (?, ?, ?)`,
        args: [roomId, user1_id, user2_id],
      });

      const result = await db.execute({
        sql: `SELECT * FROM ChatRoom WHERE id = ?`,
        args: [roomId],
      });

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // get room by id
  static async findById(roomId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT * FROM ChatRoom WHERE id = ?`,
        args: [roomId],
      });
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // get all rooms for a user with other user's info and last message
  static async findByUserId(userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT 
            cr.id AS room_id,
            cr.created_at,
            u.id AS other_user_id,
            u.name AS other_user_name,
            u.avatar AS other_user_avatar,
            m.text AS last_message,
            m.created_at AS last_message_at,
            m.sender_id AS last_sender_id,
            (
              SELECT COUNT(*) FROM Message
              WHERE room_id = cr.id AND is_read = 0 AND sender_id != ?
            ) AS unread_count
          FROM ChatRoom cr
          JOIN User u ON u.id = CASE
            WHEN cr.user1_id = ? THEN cr.user2_id
            ELSE cr.user1_id
          END
          LEFT JOIN Message m ON m.id = (
            SELECT id FROM Message WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1
          )
          WHERE cr.user1_id = ? OR cr.user2_id = ?
          ORDER BY COALESCE(m.created_at, cr.created_at) DESC
        `,
        args: [userId, userId, userId, userId],
      });
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // delete a room
  static async delete(roomId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM ChatRoom WHERE id = ?`,
        args: [roomId],
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ChatRoom;