const connectDb = require("../db");
const {errHandler} = require('../errorHandler');

class UserFollows {
  static async getDb() {
    const db = await connectDb();
    return db;
  }
  static async createTable() {
    try {
      const db = await this.getDb();
      const query = `
        CREATE TABLE IF NOT EXISTS user_follows (
          follower_id TEXT NOT NULL,
          following_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (follower_id) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (following_id) REFERENCES User(id) ON DELETE CASCADE,

          UNIQUE (follower_id, following_id),
          CHECK (follower_id != following_id)
        );
        `;
      await db.run(query);
    } catch (error) {
      console.log(error);
    }
  }

  // UserFollows.js
  static async getCounts(userId) {
    const db = await this.getDb();

    const followers = await db.get(
      `SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?`,
      [userId]
    );

    const following = await db.get(
      `SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?`,
      [userId]
    );

    return {
      followers: followers.count,
      following: following.count,
    };
  }
  
static async getFollowers(userId, currentUserId, limit = 20, offset = 0) {
  const db = await this.getDb();

  return db.all(
    `
    SELECT 
      u.id,
      u.name,
      u.avatar,
      CASE 
        WHEN uf2.follower_id IS NOT NULL THEN 1
        ELSE 0
      END AS is_following
    FROM user_follows AS uf
    JOIN User AS u 
      ON u.id = uf.follower_id
    LEFT JOIN user_follows AS uf2
      ON uf2.follower_id = ?
     AND uf2.following_id = u.id
    WHERE uf.following_id = ?
    LIMIT ? OFFSET ?
    `,
    [currentUserId, userId, limit, offset]
  );
}


  static async getFollowing(userId, limit = 20, offset = 0) {
    const db = await this.getDb();

    return db.all(
      `
      SELECT 
        u.id,
        u.name,
        u.avatar,
        true AS is_following
      FROM user_follows AS uf
      JOIN User AS u ON u.id = uf.following_id
      WHERE uf.follower_id = ?
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    );
  }

  static async isFollowing(followerId, followingId) {
    const db = await this.getDb();

    const row = await db.get(
      `
      SELECT 1
      FROM user_follows
      WHERE follower_id = ?
        AND following_id = ?
      LIMIT 1
      `,
      [followerId, followingId]
    );

    return !!row;
  }



  static async follow(followerId, followingId) {
    try {
      const db = await this.getDb();

      const exists = await db.get('SELECT 1 FROM user_follows WHERE follower_id=? AND following_id=?', [followerId, followingId]);

      if(exists) throw errHandler(400, 'Already following');

      const query = `
      INSERT INTO user_follows (follower_id, following_id)
      VALUES (?, ?)
    `;

      await db.run(query, [followerId, followingId]);
    } catch(err) {
      throw err;
    }
  }

  static async unfollow(followerId, followingId) {
    const db = await this.getDb();

    const query = `
    DELETE FROM user_follows
    WHERE follower_id = ? AND following_id = ?
  `;

    await db.run(query, [followerId, followingId]);
  }
}

module.exports = UserFollows;
