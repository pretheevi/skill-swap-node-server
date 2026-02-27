const express = require('express');
const router = express.Router();
const JWT = require('../../middleware/jwt');
const UserModel = require('../../models/user');
const UserFollowsModel = require('../../models/userFollows');
const { followUnfollowLimiter } = require('../../middleware/rateLimit');


// GET /searchUsers?username=username
router.get('/searchUser', JWT.authMiddleware, async (req, res) => {
  try{
    const username = req.query.username;
    const users = await UserModel.searchUsers(username, req.user.id);
    res.json({
      message: 'Search results',
      users
    })
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// router.post('/follow/:id', JWT.authMiddleware, followUnfollowLimiter, async (req, res) => {
//   try{
//     const userIdToFollow = req.params.id;
//     const currentUserId = req.user.id;

//     await UserFollowsModel.follow(currentUserId, userIdToFollow);
//     res.status(200)
//   } catch (error) {
//     console.error('Error following user:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// })

// router.post('/unfollow/:id', JWT.authMiddleware, followUnfollowLimiter, async (req, res) => {
//   try{
//     const userIdToUnfollow = req.params.id;
//     const currentUserId = req.user.id;

//     await UserFollowsModel.unfollow(currentUserId, userIdToUnfollow);
//     res.status(200)
//   } catch (error) {
//     console.error('Error unfollowing user:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// })

module.exports = router;