const connectDb = require("../db");
const { errHandler } = require('../errorHandler');

class UserFollows {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_follows (
          follower_id TEXT NOT NULL,
          following_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (follower_id) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (following_id) REFERENCES User(id) ON DELETE CASCADE,
          UNIQUE (follower_id, following_id),
          CHECK (follower_id != following_id)
        );
      `);
    } catch (error) {
      console.log(error);
    }
  }

  static async getCounts(userId) {
    const db = await this.getDb();

    const followersResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?`,
      args: [userId],
    });

    const followingResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?`,
      args: [userId],
    });

    return {
      followers: followersResult.rows[0].count,
      following: followingResult.rows[0].count,
    };
  }

  static async getFollowers(userId, loggedUserId, limit = 20, offset = 0) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT 
            u.id,
            u.name,
            u.avatar,
            CASE WHEN EXISTS (
              SELECT 1 FROM user_follows
              WHERE follower_id = ? AND following_id = u.id
            ) THEN 1 ELSE 0 END AS is_following
          FROM user_follows AS uf
          JOIN User AS u ON u.id = uf.follower_id
          WHERE uf.following_id = ?
          LIMIT ? OFFSET ?
        `,
        args: [loggedUserId, userId, limit, offset],
      });
      return result.rows;
    } catch (error) {
      throw new Error(`getFollowers failed: ${error.message}`);
    }
  }

  static async getFollowing(userId, loggedUserId, limit = 20, offset = 0) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT 
            u.id,
            u.name,
            u.avatar,
            CASE WHEN EXISTS (
              SELECT 1 FROM user_follows
              WHERE follower_id = ? AND following_id = u.id
            ) THEN 1 ELSE 0 END AS is_following
          FROM user_follows AS uf
          JOIN User AS u ON u.id = uf.following_id
          WHERE uf.follower_id = ?
          LIMIT ? OFFSET ?
        `,
        args: [loggedUserId, userId, limit, offset],
      });
      return result.rows;
    } catch (error) {
      throw new Error(`getFollowing failed: ${error.message}`);
    }
  }

  static async isFollowing(followerId, followingId) {
    const db = await this.getDb();
    const result = await db.execute({
      sql: `SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1`,
      args: [followerId, followingId],
    });
    return result.rows.length > 0;
  }

  static async follow(followerId, followingId) {
    try {
      const db = await this.getDb();

      const exists = await db.execute({
        sql: `SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?`,
        args: [followerId, followingId],
      });

      if (exists.rows.length > 0) throw errHandler(400, 'Already following');

      await db.execute({
        sql: `INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)`,
        args: [followerId, followingId],
      });
    } catch (err) {
      throw err;
    }
  }

  static async unfollow(followerId, followingId) {
    const db = await this.getDb();
    await db.execute({
      sql: `DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?`,
      args: [followerId, followingId],
    });
  }
}

module.exports = UserFollows;