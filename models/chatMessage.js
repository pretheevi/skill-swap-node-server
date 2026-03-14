const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");

class Message {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS Message (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          text TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES ChatRoom(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `);
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_message_room_id ON Message(room_id);`,
      );
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_message_sender_id ON Message(sender_id);`,
      );
    } catch (error) {
      console.error("Error creating Message table:", error);
      throw error;
    }
  }

  // send a message
  static async create(roomId, senderId, text) {
    try {
      const db = await this.getDb();
      console.log('aaaabbbb')
      const messageId = uuidv4();
      await db.execute({
        sql: `INSERT INTO Message (id, room_id, sender_id, text) VALUES (?, ?, ?, ?)`,
        args: [messageId, roomId, senderId, text],
      });
      const result = await db.execute({
        sql: `SELECT * FROM Message WHERE id = ?`,
        args: [messageId],
      });
      console.log(result.rows);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Add to your Message model
  static async findByRoomId(roomId, limit = 100, offset = 0) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
          FROM Message m
          JOIN User u ON u.id = m.sender_id
          WHERE m.room_id = ?
          ORDER BY m.created_at DESC
          LIMIT ? OFFSET ?
        `,
        args: [roomId, limit, offset],
      });
      return result.rows.reverse();
    } catch (error) {
      throw error;
    }
  }

  static async getCountByRoomId(roomId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM Message WHERE room_id = ?`,
        args: [roomId],
      });
      return result.rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // mark all messages in a room as read for a user
  static async markAsRead(roomId, userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `UPDATE Message SET is_read = 1 WHERE room_id = ? AND sender_id != ? AND is_read = 0`,
        args: [roomId, userId],
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // get unread count for a user across all rooms
  static async getUnreadCount(userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM Message WHERE is_read = 0 AND sender_id != ? AND room_id IN (SELECT id FROM ChatRoom WHERE user1_id = ? OR user2_id = ?)`,
        args: [userId, userId, userId],
      });
      return result.rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // delete a message
  static async delete(messageId, senderId) {
    try {
      const db = await this.getDb();
      const msg = await db.execute({
        sql: `SELECT * FROM Message WHERE id = ?`,
        args: [messageId],
      });
      if (!msg.rows[0]) return false;
      if (msg.rows[0].sender_id !== senderId) throw new Error("Not authorized");
      await db.execute({
        sql: `DELETE FROM Message WHERE id = ?`,
        args: [messageId],
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // delete all messages in a room
  static async deleteByRoomId(roomId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Message WHERE room_id = ?`,
        args: [roomId],
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Message;
