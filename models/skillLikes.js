const connectDb = require("../db");

class SkillLikesModel {
  static async getDb() {
    const db = await connectDb();
    return db;
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      const query = `
        CREATE TABLE IF NOT EXISTS Skill_Likes (
          skill_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          PRIMARY KEY (skill_id, user_id),

          FOREIGN KEY (skill_id) REFERENCES Skill(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_skill_likes_user_id ON Skill_Likes(user_id);
      `;
      await db.exec(query);
    } catch (error) {
      console.error("Error creating skill_likes table:", error);
      throw error;
    }
  }

  // Add a like (since it's a composite primary key, no uuid needed)
  static async addLike(skillId, userId) {
    try {
      const db = await this.getDb();
      const query = `
        INSERT INTO Skill_Likes (skill_id, user_id)
        VALUES (?, ?)
      `;
      await db.run(query, [skillId, userId]);
      
      // Return the like with additional info
      const selectQuery = `
        SELECT SL.*, User.name as user_name, User.avatar as user_avatar
        FROM Skill_Likes SL
        JOIN User ON SL.user_id = User.id
        WHERE SL.skill_id = ? AND SL.user_id = ?
      `;
      
      return await db.get(selectQuery, [skillId, userId]);
    } catch (error) {
      // Handle unique constraint violation (already liked)
      if (error.message.includes('UNIQUE constraint failed')) {
        return null; // Already liked
      }
      console.error("Error adding skill like:", error);
      throw error;
    }
  }

  // Remove a like
  static async removeLike(skillId, userId) {
    try {
      const db = await this.getDb();
      const query = `
        DELETE FROM Skill_Likes 
        WHERE skill_id = ? AND user_id = ?
      `;
      const result = await db.run(query, [skillId, userId]);
      return result.changes > 0; // Returns true if a like was removed
    } catch (error) {
      console.error("Error removing skill like:", error);
      throw error;
    }
  }

  // Check if a user liked a specific skill
  static async hasUserLiked(skillId, userId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT 1 FROM Skill_Likes 
        WHERE skill_id = ? AND user_id = ?
      `;
      const result = await db.get(query, [skillId, userId]);
      return !!result;
    } catch (error) {
      console.error("Error checking if user liked skill:", error);
      throw error;
    }
  }

  // Get all likes for a specific skill with user details
  static async findBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT SL.*, User.name as user_name, User.avatar as user_avatar
        FROM Skill_Likes SL
        JOIN User ON SL.user_id = User.id
        WHERE SL.skill_id = ?
        ORDER BY SL.created_at DESC
      `;
      return await db.all(query, [skillId]);
    } catch (error) {
      console.error("Error finding likes by skill id:", error);
      throw error;
    }
  }

  // Get count of likes for a skill
  static async countBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT COUNT(*) as count 
        FROM Skill_Likes 
        WHERE skill_id = ?
      `;
      const result = await db.get(query, [skillId]);
      return result.count;
    } catch (error) {
      console.error("Error counting likes by skill id:", error);
      throw error;
    }
  }

  // Get all skills liked by a specific user
  static async findByUserId(userId) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT SL.*, 
               Skill.title as skill_title,
               Skill.description as skill_description,
               Skill.category as skill_category
        FROM Skill_Likes SL
        JOIN Skill ON SL.skill_id = Skill.id
        WHERE SL.user_id = ?
        ORDER BY SL.created_at DESC
      `;
      return await db.all(query, [userId]);
    } catch (error) {
      console.error("Error finding skill likes by user id:", error);
      throw error;
    }
  }

  // Get likes for multiple skills (useful for batch operations)
  static async findBySkillIds(skillIds) {
    try {
      if (!skillIds.length) return [];
      
      const db = await this.getDb();
      const placeholders = skillIds.map(() => '?').join(',');
      const query = `
        SELECT SL.*, User.name as user_name, User.avatar as user_avatar
        FROM Skill_Likes SL
        JOIN User ON SL.user_id = User.id
        WHERE SL.skill_id IN (${placeholders})
        ORDER BY SL.created_at DESC
      `;
      return await db.all(query, skillIds);
    } catch (error) {
      console.error("Error finding likes by skill ids:", error);
      throw error;
    }
  }

  // Delete all likes for a skill (useful when deleting a skill)
  static async deleteBySkillId(skillId) {
    try {
      const db = await this.getDb();
      const query = `DELETE FROM Skill_Likes WHERE skill_id = ?`;
      await db.run(query, [skillId]);
      return true;
    } catch (error) {
      console.error("Error deleting likes by skill id:", error);
      throw error;
    }
  }

  // Delete all likes by a user (useful when deleting a user)
  static async deleteByUserId(userId) {
    try {
      const db = await this.getDb();
      const query = `DELETE FROM Skill_Likes WHERE user_id = ?`;
      await db.run(query, [userId]);
      return true;
    } catch (error) {
      console.error("Error deleting skill likes by user id:", error);
      throw error;
    }
  }

  // Toggle like (add if not exists, remove if exists)
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

  // Get like statistics for multiple skills
  static async getLikeCountsForSkills(skillIds) {
    try {
      if (!skillIds.length) return {};
      
      const db = await this.getDb();
      const placeholders = skillIds.map(() => '?').join(',');
      const query = `
        SELECT skill_id, COUNT(*) as count
        FROM Skill_Likes
        WHERE skill_id IN (${placeholders})
        GROUP BY skill_id
      `;
      
      const results = await db.all(query, skillIds);
      
      // Convert to object with skill_id as key
      const counts = {};
      results.forEach(row => {
        counts[row.skill_id] = row.count;
      });
      
      return counts;
    } catch (error) {
      console.error("Error getting like counts for skills:", error);
      throw error;
    }
  }

  // Check if multiple skills are liked by a user
  static async getUserLikesForSkills(userId, skillIds) {
    try {
      if (!skillIds.length) return {};
      
      const db = await this.getDb();
      const placeholders = skillIds.map(() => '?').join(',');
      const query = `
        SELECT skill_id
        FROM Skill_Likes
        WHERE user_id = ? AND skill_id IN (${placeholders})
      `;
      
      const results = await db.all(query, [userId, ...skillIds]);
      
      // Convert to object with skill_id as key and boolean as value
      const likedStatus = {};
      results.forEach(row => {
        likedStatus[row.skill_id] = true;
      });
      
      return likedStatus;
    } catch (error) {
      console.error("Error getting user likes for skills:", error);
      throw error;
    }
  }
}

module.exports = SkillLikesModel;