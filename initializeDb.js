const SkillsModel = require('./models/skills');
const SkillMediaModel = require('./models/skillMedia');
const userModel = require('./models/user');
const UserFollows = require('./models/userFollows');
const commentModel = require('./models/comment');
const CommentLikesModel = require('./models/commentLikes');
const SkillLikesModel = require('./models/skillLikes');

async function initializeDb() {
  await Promise.all([
    userModel.createTable(),
    SkillsModel.createTable(),
    SkillMediaModel.createTable(),
    SkillLikesModel.createTable(),
    commentModel.createTable(),
    UserFollows.createTable(),
    CommentLikesModel.createTable(),
  ]);
}


if(require.main === module) {
  initializeDb()
    .then(() => {
      console.log("Database initialized successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error initializing database:", error);
      process.exit(1);
    });
}

module.exports = initializeDb;