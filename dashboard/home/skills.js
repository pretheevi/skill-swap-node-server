const express = require("express");
const router = express.Router();
const SkillsModel = require("../../models/skills");
const SkillMediaModel = require("../../models/skillMedia");
const SkillLikesModel = require('../../models/skillLikes');
const jwt = require("../../middleware/jwt");
const { uploadPostMedia } = require("../../middleware/upload");
const { skillPostLimiter } = require("../../middleware/rateLimit");
const cloudinary = require("../../config/cloudinary");
const { errHandler } = require("../../errorHandler");

router.post(
  "/skills",
  jwt.authMiddleware,
  skillPostLimiter,
  uploadPostMedia,
  async (req, res, next) => {
    try {
      const skill = await SkillsModel.create({
        user_id: String(req.user.id),
        description: req.body.description,
        imageRatio: req.body.imageRatio,
      });

      if (req.files && req.files.length > 0) {
        console.log(req.files);
        // create DB entries for each uploaded file
        await Promise.all(
          req.files.map(async (file) => {
            const mediaType = file.mimetype.startsWith("image")
              ? "image"
              : "video";
            return SkillMediaModel.create({
              skill_id: skill.id,
              media_type: mediaType,
              media_url: file.cloudinary_url, // cloudinary URL
              public_id: file.public_id, // cloudinary public_id
            });
          }),
        );
      }

      res.status(201).json({ message: "Skill created successfully" });
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
);

router.get("/skills", jwt.authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    console.log(`https://imbaki-skill-swap-ml.hf.space/recommend/${userId}?n=${page * limit}`)
    const recResponse = await fetch(`http://localhost:8001/recommend/${userId}?n=${page * limit}`);
    const allRecommends = await recResponse.json();

    // slice the exact chunk for this page
    const pageRecommends = allRecommends.slice(offset, offset + limit);

    const skills = await SkillsModel.getAllSkillsWithCommentAndMedia(userId, pageRecommends);
    res.json(skills);
  } catch (err) {
    next(err);
  }
});

router.get("/my-skills", jwt.authMiddleware, async (req, res, next) => {
  try {
    const mySkills =
      await SkillsModel.getAllSkillsWithCommentAndMediaForSpecificUser(
        req.user.id,
      );
    res.json(mySkills);
  } catch (err) {
    next(err);
  }
});

router.get("/my-skillsById/:id", jwt.authMiddleware, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const mySkills =
      await SkillsModel.getAllSkillsWithCommentAndMediaForSpecificUser(userId);
    res.json(mySkills);
  } catch (err) {
    next(err);
  }
});

router.get("/skills/:id", jwt.authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const skill = await SkillsModel.getSkillWithCommentsAndMediaBySkillId(
      req.params.id,
      userId
    );

    if (!skill) throw errHandler(404, "Skill not found");

    res.json(skill);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/skills/:id",
  jwt.authMiddleware,
  uploadPostMedia,
  async (req, res) => {
    try {
      const skill = await SkillsModel.findSkillById(req.params.id);

      if (!skill) throw errHandler(404, "skill not found");

      if (skill.user_id !== req.user.id) throw errHandler(403, "Not allowed");

      // Initialize update data
      const updateData = {
        title: req.body.title,
        category: req.body.category,
        level: req.body.level,
        description: req.body.description,
      };

      // Check if there's existing media for this skill
      const existingMedia = await SkillMediaModel.getMediaBySkillId(
        req.params.id,
      );

      // Only update media if a new file is uploaded
      if (req.file) {
        const mediaType = req.file.mimetype.startsWith("image")
          ? "image"
          : "video";

        // Delete old file from Cloudinary if it exists
        if (existingMedia && existingMedia.public_id) {
          try {
            const result = await cloudinary.uploader.destroy(
              existingMedia.public_id,
              { resource_type: "image" },
            );
            console.log("Cloudinary destroy result (old file):", result);
          } catch (cloudErr) {
            console.log("Cloudinary delete failed for old file:", cloudErr);
          }
        }

        // Update skill data with new media
        updateData.media = {
          media_type: mediaType,
          media_url: req.file.path, // Cloudinary URL from uploadPostMedia middleware
          public_id: req.file.filename, // Cloudinary public_id from uploadPostMedia middleware
        };

        // Update or create media record
        if (existingMedia) {
          await SkillMediaModel.updateMediaBySkillId(req.params.id, {
            media_type: mediaType,
            media_url: req.file.path,
            public_id: req.file.filename,
          });
        } else {
          await SkillMediaModel.createMedia({
            skill_id: req.params.id,
            media_type: mediaType,
            media_url: req.file.path,
            public_id: req.file.filename,
          });
        }
      }

      // If no new file but we need to update other fields
      if (!req.file) {
        // Keep existing media data
        updateData.media = {
          media_type: existingMedia?.media_type || null,
          media_url: existingMedia?.media_url || null,
          public_id: existingMedia?.public_id || null,
        };
      }

      // Update skill information
      await SkillsModel.updateSkillById(req.params.id, updateData);

      // Get updated skill with media
      const updatedSkill =
        await SkillsModel.getSkillWithCommentsAndMediaBySkillId(req.params.id);

      res.json({
        message: "Skill updated successfully",
        skill: updatedSkill,
      });
    } catch (err) {
      // Clean up uploaded file if there was an error
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: "image",
          });
        } catch (cleanupError) {
          console.error("Error cleaning up uploaded file:", cleanupError);
        }
      }

      next(err);
    }
  },
);



router.patch("/skills/:skill_id", jwt.authMiddleware, async (req, res, next) => {
  try{
    const skill_id = req.params.skill_id;
    const { description } = req.body;
    // 2. Find skill
    const skill = await SkillsModel.findSkillById(skill_id);

    if (!skill) throw errHandler(404, "Skill not found");

        // 3. Authorization check
    if (skill.user_id !== req.user.id)
      throw errHandler(403, "Not authorized to delete this skill");

    const result = await SkillsModel.updateSkillDescription(skill_id, description);
    res.json({ success: true, message: 'Description updated' });
  } catch(error) {
    next(error)
  }
})


router.delete("/skills/:id", jwt.authMiddleware, async (req, res, next) => {
  try {
    const skill_id = req.params.id;

    // 2. Find skill
    const skill = await SkillsModel.findSkillById(skill_id);

    if (!skill) throw errHandler(404, "Skill not found");

    // 3. Authorization check
    if (skill.user_id !== req.user.id)
      throw errHandler(403, "Not authorized to delete this skill");

    // 4. Delete associated media file if it exists
    const mediaList = await SkillMediaModel.getMediaBySkillId(skill_id);

    for (const media of mediaList) {
      if (media?.public_id) {
        try {
          await cloudinary.uploader.destroy(media.public_id, {
            resource_type: media.media_type === 'video' ? 'video' : 'image',
          });
        } catch (cloudErr) {
          console.log("cloudinary delete failed", cloudErr);
        }
      }
    }
    
    // 5. Delete skill from database
    await SkillsModel.deleteSkillById(skill_id);

    res.json({
      success: true,
      message: "Skill deleted successfully",
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
