const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");
const SkillLikesModel = require('./skillLikes');

class SkillsModel {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    const db = await this.getDb();
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS Skill (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          description TEXT,
          media_ratio TEXT NOT NULL CHECK(media_ratio IN ('1:1', '2:3')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `);
    } catch (error) {
      console.error("Error creating skills table:", error);
      throw error;
    }
  }

  static async create(skillData) {
    try {
      const db = await this.getDb();
      const skillId = uuidv4();
      const { user_id, description, imageRatio } = skillData;
      await db.execute({
        sql: `INSERT INTO Skill (id, user_id, description, media_ratio) VALUES (?, ?, ?, ?)`,
        args: [skillId, user_id, description, imageRatio],
      });
      return { id: skillId, ...skillData };
    } catch (error) {
      console.error("Error creating skill:", error);
      throw error;
    }
  }

  static async getPostCountByUserId(userId) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT COUNT(*) as postCount FROM Skill WHERE user_id = ?`,
        args: [userId],
      });
      return result.rows[0].postCount;
    } catch (error) {
      console.error("Error getting post count by user id:", error);
      throw error;
    }
  }

  static async getMediaBySkillId(skill_id) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT
            m.id AS media_id,
            m.skill_id AS media_skill_id,
            m.media_url,
            m.media_type,
            m.created_at
          FROM SkillMedia AS m
          WHERE m.skill_id = ?
        `,
        args: [skill_id],
      });
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getCommentBySkillId(skill_id) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS comment_count FROM Comment AS c WHERE c.skill_id = ?`,
        args: [skill_id],
      });
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getAllSkills() {
    try {
      const db = await this.getDb();
      const result = await db.execute(`
        SELECT
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email,
          u.avatar AS user_avatar,
          s.id AS skill_id,
          s.description AS skill_description,
          s.media_ratio,
          s.updated_at AS skill_updated_at
        FROM User AS u
        JOIN Skill AS s ON u.id = s.user_id
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getSkillsByIds(skillIds) {
    try {
      const db = await this.getDb();
      const result = await Promise.all(
        skillIds.map(async (id) => {
          const r = await db.execute({
            sql: `
              SELECT
                u.id AS user_id,
                u.name AS user_name,
                u.email AS user_email,
                u.avatar AS user_avatar,
                s.id AS skill_id,
                s.description AS skill_description,
                s.media_ratio,
                s.updated_at AS skill_updated_at
              FROM User AS u
              JOIN Skill AS s ON u.id = s.user_id
              WHERE s.id = ?
            `,
            args: [id],
          });
          return r.rows[0];
        })
      );
      return result.filter(Boolean); // remove nulls if skill not found
    } catch (error) {
      throw error;
    }
  }

  static async getRecommendedSkills(recommends) {
    try {
      const skillIds = recommends.map(r => r.skill_id);
      return await this.getSkillsByIds(skillIds);
    } catch (error) {
      throw error;
    }
  }

  static async getAllSkillsWithCommentAndMedia(userId, recommends) {
    try {
      const skills = await this.getRecommendedSkills(recommends);
      const skillsWithMediaAndComments = await Promise.all(
        skills.map(async (skill) => {
          const media = await this.getMediaBySkillId(skill.skill_id);
          const { comment_count } = await this.getCommentBySkillId(skill.skill_id);
          const like_count = await SkillLikesModel.countBySkillId(skill.skill_id);
          const user_liked = await SkillLikesModel.hasUserLiked(skill.skill_id, userId);
          return { ...skill, media, comment_count, like_count, user_liked };
        })
      );
      return skillsWithMediaAndComments;
    } catch (error) {
      throw error;
    }
  }

  static async getSkillsByUserId(id) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `
          SELECT
            u.id AS user_id,
            u.name AS user_name,
            u.email AS user_email,
            u.avatar AS user_avatar,
            s.id AS skill_id,
            s.description AS skill_description,
            s.media_ratio,
            s.updated_at AS skill_updated_at
          FROM User AS u
          JOIN Skill AS s ON u.id = s.user_id
          WHERE s.user_id = ?
        `,
        args: [id],
      });
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getAllSkillsWithCommentAndMediaForSpecificUser(userId) {
    try {
      const skills = await this.getSkillsByUserId(userId);
      if (!skills) return null;
      const skillsWithMediaAndComments = await Promise.all(
        skills.map(async (skill) => {
          const media = await this.getMediaBySkillId(skill.skill_id);
          const { comment_count } = await this.getCommentBySkillId(skill.skill_id);
          const like_count = await SkillLikesModel.countBySkillId(skill.skill_id);
          const user_liked = await SkillLikesModel.hasUserLiked(skill.skill_id, userId);
          return { ...skill, media, comment_count, like_count, user_liked };
        })
      );
      return skillsWithMediaAndComments;
    } catch (error) {
      throw error;
    }
  }

  static async getSkillWithCommentsAndMediaBySkillId(skillId, userId) {
    try {
      const skill = await this.findSkillById(skillId);
      if (!skill) return null;
      const media = await this.getMediaBySkillId(skillId);
      const comments = await this.getCommentBySkillId(skillId);
      const like_count = await SkillLikesModel.countBySkillId(skillId);
      const user_liked = await SkillLikesModel.hasUserLiked(skillId, userId);
      return { ...skill, media: media || [], comment_count: comments.comment_count, like_count, user_liked };
    } catch (error) {
      throw error;
    }
  }

  static async findSkillById(skill_id) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT * FROM Skill WHERE id = ?`,
        args: [skill_id],
      });
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async updateSkillDescription(id, description) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `UPDATE Skill SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [description, id],
      });
      return true;
    } catch (error) {
      throw new Error(`updateSkillDescription failed: ${error.message}`);
    }
  }

  static async deleteSkillById(id) {
    try {
      const db = await this.getDb();
      await db.execute({
        sql: `DELETE FROM Skill WHERE id = ?`,
        args: [id],
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SkillsModel;