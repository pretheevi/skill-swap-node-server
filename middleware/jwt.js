require('dotenv').config()
const jwt = require("jsonwebtoken");

class JWT {
  static sign(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET);
  }

  static verify(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  static authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1]; // expecting "Bearer <token>"

    if (!token) {
      return res.status(401).json({ error: "Token missing" });
    }

    const data = JWT.verify(token);

    if (!data) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = data; // attach user payload to request
    next();
  }
}

module.exports = JWT;
