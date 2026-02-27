const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");

class SkillsModel {
  static async getDb() {
    const db = await connectDb();
    return db;
  }

  static async createTable() {
    const db = await this.getDb();
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS Skill (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            description TEXT,
            rating REAL DEFAULT 0,
            media_ratio TEXT NOT NULL CHECK(media_ratio IN ('1:1', '2:3')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- Foreign key constraint
            FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        );
      `;
      await db.run(query);
    } catch (error) {
      console.error("Error creating skills table:", error);
      throw error;
    }
  }

  static async create(skillData) {
    try {
      const db = await this.getDb();
      const skillId = uuidv4();
      const query = `
        INSERT INTO Skill (id, user_id, description, media_ratio)
        VALUES (?, ?, ?, ?);
      `;
      const { user_id, description, imageRatio } = skillData;
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", skillData);
      const result = await db.run(query, [
        skillId,
        user_id,
        description,
        imageRatio,
      ]);
      return { id: skillId, ...skillData };
    } catch (error) {
      console.error("Error creating skill:", error);
      throw error;
    }
  }

  static async getPostCountByUserId(userId) {
    const db = await this.getDb();
    try {
      const query = `
        SELECT COUNT(*) as postCount
        FROM Skill
        WHERE user_id = ?
      `;

      const result = await db.get(query, [userId]);
      return result.postCount;
    } catch (error) {
      console.error("Error getting post count by user id:", error);
      throw error;
    }
  }

  static async getMediaBySkillId(skill_id) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT
          m.id AS media_id,
          m.skill_id AS media_skill_id,
          m.media_url,
          m.media_type,
          m.created_at
        FROM SkillMedia AS m
        WHERE m.skill_id = ?;
      `;
      const media = await db.all(query, [skill_id]);
      return media;
    } catch (error) {
      throw error;
    }
  }

  static async getCommentBySkillId(skill_id) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT
          COUNT(*) AS comment_count
        FROM Comment AS c
        WHERE c.skill_id = ?;
      `;
      const comments = await db.get(query, [skill_id]);
      return comments;
    } catch (error) {
      throw error;
    }
  }

  static async getAllSkills() {
    try {
      const db = await this.getDb();
      const query = `
        SELECT
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email,
          u.avatar AS user_avatar,
          s.id AS skill_id,
          s.rating,
          s.description AS skill_description,
          s.media_ratio,
          s.updated_at AS skill_updated_at
        FROM User AS u
        JOIN Skill AS s ON u.id = s.user_id;
      `;
      const skills = await db.all(query);
      return skills;
    } catch (error) {
      throw error;
    }
  }

  static async getSkillsByUserId(id) {
    try {
      const db = await this.getDb();
      const query = `
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
        WHERE s.user_id = ?;
      `;
      const skill = await db.all(query, [id]);
      return skill;
    } catch (error) {
      throw error;
    }
  }

  static async getAllSkillsWithCommentAndMedia() {
    try {
      const skills = await this.getAllSkills();
      const skillsWithMediaAndComments = await Promise.all(
        skills.map(async (skill) => {
          const media = await this.getMediaBySkillId(skill.skill_id);
          const { comment_count } = await this.getCommentBySkillId(
            skill.skill_id,
          );
          return {
            ...skill,
            media,
            comment_count,
          };
        }),
      );
      // console.log('skillsWithMediaAndComments', skillsWithMediaAndComments);
      return skillsWithMediaAndComments;
    } catch (error) {
      throw error;
    }
  }

  static async getAllSkillsWithCommentAndMediaForSpecificUser(id) {
    try {
      const skills = await this.getSkillsByUserId(id);
      if (!skills) return null;
      const skillsWithMediaAndComments = await Promise.all(
        skills.map(async (skill) => {
          const media = await this.getMediaBySkillId(skill.skill_id);
          const { comment_count } = await this.getCommentBySkillId(
            skill.skill_id,
          );
          return {
            ...skill,
            media,
            comment_count,
          };
        }),
      );
      // console.log('getAllSkillsWithCommentAndMediaForSpecificUser',skillsWithMediaAndComments);
      return skillsWithMediaAndComments;
    } catch (error) {
      throw error;
    }
  }
 
  // marketplace page - view post details
  static async getSkillWithCommentsAndMediaBySkillId(skillId) {
    try {
      const skill = await this.findSkillById(skillId);
      if (!skill) return null;

      const media = await this.getMediaBySkillId(skillId);
      const comments = await this.getCommentBySkillId(skillId);

      const skillWithCommentAndMedia = {
        ...skill,
        media: media || [],
        comments,
      };
      return skillWithCommentAndMedia;
    } catch (error) {
      throw error;
    }
  }

  static async findSkillById(skill_id) {
    try {
      const db = await this.getDb();
      const query = `
        SELECT *
        FROM Skill
        WHERE Skill.id = ?;
      `;
      const skill = await db.get(query, [skill_id]);
      return skill;
    } catch (error) {
      throw error;
    }
  }

  static async updateSkillById(id, updateData) {
    try {
      const db = await this.getDb();

      // Update skill details
      const query = `
      UPDATE Skill
      SET title = ?, category = ?, level = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
      const { title, category, level, description } = updateData;
      const result = await db.run(query, [
        title,
        category,
        level,
        description,
        id,
      ]);

      // Update media only if provided
      if (updateData.media) {
        const { media_type, media_url, public_id } = updateData.media;

        // Check if media already exists for this skill
        const checkMediaQuery = `SELECT id FROM SkillMedia WHERE skill_id = ?`;
        const existingMedia = await db.get(checkMediaQuery, [id]);

        if (existingMedia) {
          // Update existing media
          const mediaUpdateQuery = `
          UPDATE SkillMedia 
          SET media_type = ?, media_url = ?, public_id = ?
          WHERE skill_id = ?
        `;
          await db.run(mediaUpdateQuery, [
            media_type || null,
            media_url || null,
            public_id || null,
            id,
          ]);
        } else if (media_type && media_url) {
          // Insert new media only if we have actual media data
          const mediaInsertQuery = `
          INSERT INTO SkillMedia (skill_id, media_type, media_url, public_id)
          VALUES (?, ?, ?, ?)
        `;
          await db.run(mediaInsertQuery, [
            id,
            media_type,
            media_url,
            public_id || null,
          ]);
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteSkillById(id) {
    try {
      const db = await this.getDb();
      const query = `
        DELETE FROM Skill
        WHERE id = ?
      `;
      await db.run(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SkillsModel;
