const connectDb = require("../db");
const { v4: uuidv4 } = require("uuid");

class SkillMediaModel {
  static async getDb() {
    return await connectDb();
  }

  static async createTable() {
    try {
      const db = await this.getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS SkillMedia (
          id TEXT PRIMARY KEY,
          skill_id TEXT NOT NULL,
          media_type TEXT CHECK(media_type IN ('image', 'video')) DEFAULT 'image',
          media_url TEXT NOT NULL,
          public_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (skill_id) REFERENCES Skill(id) ON DELETE CASCADE
        );
      `);
    } catch (error) {
      console.log("Error creating skill media table:", error);
      throw error;
    }
  }

  static async create(mediaData) {
    try {
      const db = await this.getDb();
      const mediaId = uuidv4();
      const { skill_id, media_type = "image", media_url, public_id } = mediaData;
      await db.execute({
        sql: `INSERT INTO SkillMedia (id, skill_id, media_type, media_url, public_id) VALUES (?, ?, ?, ?, ?)`,
        args: [mediaId, skill_id, media_type, media_url, public_id],
      });
      return { id: mediaId, ...mediaData };
    } catch (error) {
      throw error;
    }
  }

  static async getMediaBySkillId(skill_id) {
    try {
      const db = await this.getDb();
      const result = await db.execute({
        sql: `SELECT * FROM SkillMedia WHERE skill_id = ?`,
        args: [skill_id],
      });
      return result.rows; // returns array — was db.get() (single row) before, but a skill can have multiple media
    } catch (error) {
      throw error;
    }
  }

  static async updateMediaBySkillId(skill_id, mediaData) {
    try {
      const db = await this.getDb();
      const { media_type, media_url, public_id } = mediaData;
      await db.execute({
        sql: `UPDATE SkillMedia SET media_type = ?, media_url = ?, public_id = ? WHERE skill_id = ?`,
        args: [media_type, media_url, public_id, skill_id],
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SkillMediaModel;