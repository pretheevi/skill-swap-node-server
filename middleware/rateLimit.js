const rateLimit = require("express-rate-limit");
const { errHandler } = require("../errorHandler");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many login attemps, wait 15 minutes",
    });
  },
  standardHeaders: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many registration! Wait 1 hour",
    });
  },
});

const followUnfollowLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 30,
  message: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Do not spam the buttom 🙏😭. wait 5 minutes",
    });
  }
});

const commentLikeLimiter = rateLimit({
  windowMs: 60 * 1000, // 5 min
  max: 20,
  message: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many attempts, wait 1 minutes",
    });
  }
});

const skillLikeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many attempts, wait 1 minutes",
    })
  }
})

const skillPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,                   // 5 posts per minute is reasonable
  message: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many attempts, wait 15 minutes",
    })
  }
});

module.exports = { 
  loginLimiter, 
  registerLimiter,
  followUnfollowLimiter, 
  commentLikeLimiter,
  skillLikeLimiter,
  skillPostLimiter,
};
