const connectDb = require("../db");

class SkillLikesModel {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS Skill_Likes (
          skill_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (skill_id, user_id),
          FOREIGN KEY (skill_id) REFERENCES Skill(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_skill_likes_user_id ON Skill_Likes(user_id);`);
    } catch (error) {
      console.error("Error creating skill_likes table:", error);
      throw error;
    }
  }

  static async addLike(skillId, userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `INSERT INTO Skill_Likes (skill_id, user_id) VALUES (?, ?)`,
        args: [skillId, userId],
      });
      const result = await db.execute({
        sql: `
          SELECT SL.*, User.name as user_name, User.avatar as user_avatar
          FROM Skill_Likes SL
          JOIN User ON SL.user_id = User.id
          WHERE SL.skill_id = ? AND SL.user_id = ?
        `,
        args: [skillId, userId],
      });
      return result.rows[0] || null;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) return null;
      console.error("Error adding skill like:", error);
      throw error;
    }
  }

  static async removeLike(skillId, userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Skill_Likes WHERE skill_id = ? AND user_id = ?`,
        args: [skillId, userId],
      });
      return true;
    } catch (error) {
      console.error("Error removing skill like:", error);
      throw error;
    }
  }

  static async hasUserLiked(skillId, userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT 1 FROM Skill_Likes WHERE skill_id = ? AND user_id = ?`,
        args: [skillId, userId],
      });
      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking if user liked skill:", error);
      throw error;
    }
  }

  static async findBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT SL.*, User.name as user_name, User.avatar as user_avatar
          FROM Skill_Likes SL
          JOIN User ON SL.user_id = User.id
          WHERE SL.skill_id = ?
          ORDER BY SL.created_at DESC
        `,
        args: [skillId],
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding likes by skill id:", error);
      throw error;
    }
  }

  static async countBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM Skill_Likes WHERE skill_id = ?`,
        args: [skillId],
      });
      return result.rows[0].count;
    } catch (error) {
      console.error("Error counting likes by skill id:", error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT SL.*, 
                 Skill.title as skill_title,
                 Skill.description as skill_description,
                 Skill.category as skill_category
          FROM Skill_Likes SL
          JOIN Skill ON SL.skill_id = Skill.id
          WHERE SL.user_id = ?
          ORDER BY SL.created_at DESC
        `,
        args: [userId],
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding skill likes by user id:", error);
      throw error;
    }
  }

  static async findBySkillIds(skillIds) {
    try {
      if (!skillIds.length) return [];
      const db = await this.getDb();
      const placeholders = skillIds.map(() => '?').join(',');
      const result = await db.execute({
        sql: `
          SELECT SL.*, User.name as user_name, User.avatar as user_avatar
          FROM Skill_Likes SL
          JOIN User ON SL.user_id = User.id
          WHERE SL.skill_id IN (${placeholders})
          ORDER BY SL.created_at DESC
        `,
        args: skillIds,
      });
      return result.rows;
    } catch (error) {
      console.error("Error finding likes by skill ids:", error);
      throw error;
    }
  }

  static async deleteBySkillId(skillId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Skill_Likes WHERE skill_id = ?`,
        args: [skillId],
      });
      return true;
    } catch (error) {
      console.error("Error deleting likes by skill id:", error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Skill_Likes WHERE user_id = ?`,
        args: [userId],
      });
      return true;
    } catch (error) {
      console.error("Error deleting skill likes by user id:", error);
      throw error;
    }
  }

  static async toggleLike(skillId, userId) {
    try {
      const hasLiked = await this.hasUserLiked(skillId, userId);
      if (hasLiked) {
        await this.removeLike(skillId, userId);
        return { liked: false, skillId, userId };
      } else {
        await this.addLike(skillId, userId);
        return { liked: true, skillId, userId };
      }
    } catch (error) {
      console.error("Error toggling skill like:", error);
      throw error;
    }
  }

  static async getLikeCountsForSkills(skillIds) {
    try {
      if (!skillIds.length) return {};
      const db = await this.getDb();
      const placeholders = skillIds.map(() => '?').join(',');
      const result = await db.execute({
        sql: `
          SELECT skill_id, COUNT(*) as count
          FROM Skill_Likes
          WHERE skill_id IN (${placeholders})
          GROUP BY skill_id
        `,
        args: skillIds,
      });
      const counts = {};
      result.rows.forEach(row => { counts[row.skill_id] = row.count; });
      return counts;
    } catch (error) {
      console.error("Error getting like counts for skills:", error);
      throw error;
    }
  }

  static async getUserLikesForSkills(userId, skillIds) {
    try {
      if (!skillIds.length) return {};
      const db = await this.getDb();
      const placeholders = skillIds.map(() => '?').join(',');
      const result = await db.execute({
        sql: `
          SELECT skill_id FROM Skill_Likes
          WHERE user_id = ? AND skill_id IN (${placeholders})
        `,
        args: [userId, ...skillIds],
      });
      const likedStatus = {};
      result.rows.forEach(row => { likedStatus[row.skill_id] = true; });
      return likedStatus;
    } catch (error) {
      console.error("Error getting user likes for skills:", error);
      throw error;
    }
  }
}

module.exports = SkillLikesModel;