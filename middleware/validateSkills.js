class validateSkills {
  // Validate create skill
  static create(req, res, next) {
    if (!req.body) {
      return res.status(400).json({ error: "Invalid form data" });
    }

    const { description } = req.body;

    if (!title || !category)
      return res.status(400).json({ error: "Title & Category are required" });

    if (title.length < 3)
      return res
        .status(400)
        .json({ error: "Title must be at least 3 characters" });

    // Optional checks
    if (level && !["beginner", "intermediate", "expert"].includes(level)) {
      return res.status(400).json({ error: "Invalid level selected" });
    }

    next();
  }

  // Validate update skill
  static update(req, res, next) {
    const { title, category } = req.body;

    if (title && title.length < 3)
      return res
        .status(400)
        .json({ error: "Title must be at least 3 characters" });

    if (category && typeof category !== "string")
      return res.status(400).json({ error: "Category must be string" });

    next();
  }
}

module.exports = validateSkills;
