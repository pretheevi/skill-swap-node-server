const express = require('express');
const router = express.Router();
const Validate = require('./validation');
const jwt = require('../middleware/jwt');
const UserModel = require('../models/user');
const bcrypt = require('bcrypt');
const {loginLimiter, registerLimiter} = require('../middleware/rateLimit');
const {errHandler} = require('../errorHandler');

// LOGIN USER
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate request format
    if (!Validate.login(email, password)) throw errHandler(400, 'Invalid credentials format');

    // Find user in database
    const user = await UserModel.findByEmail(email);
    if (!user) throw errHandler(404, 'User not found');
  
    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw errHandler(401, 'Incorrect password');

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        joined: user.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
});


// REGISTER USER
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    // Basic validation
    if (!name || !Validate.register(name, email, password)) throw errHandler(400, 'Invalid input data');
    // Check if user already exists
    const emailExist = await UserModel.findByEmail(email);
    if (emailExist && emailExist.email === email) throw errHandler(400, 'Email already signed up');
    const nameExist = await UserModel.findByName(name);
    if(nameExist && nameExist.name === name) throw errHandler(400, 'Username already taken');
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Save user
    const newUser = await UserModel.create({name, email, password: hashedPassword});
    res.status(201).json({
      message: "User registered successfully",
      newUser: {
        email: newUser.email,
        name: newUser.name
      }
    });

  } catch (err) {
    next(err);
  }
});


router.get('/tokenVerify', jwt.authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) throw errHandler(404, 'User not found');
    res.status(200).json({
      message: "Token is valid",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        joined: user.updatedAt
      }
    });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
