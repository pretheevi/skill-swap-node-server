const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const connectDb = require('./db');

const SALT_ROUNDS = 10;
const PASSWORD_PLAIN = '123456';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItems = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const cleanName = (theme) => {
  return theme
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
};

const generateBio = (theme) => `Passionate about ${theme}. Sharing my journey and creations.`;

async function clearTables(db) {
  console.log('🧹 Clearing existing data...');
  await db.run('DELETE FROM Comment_Likes');
  await db.run('DELETE FROM Comment');
  await db.run('DELETE FROM Skill_Likes');
  await db.run('DELETE FROM SkillMedia');
  await db.run('DELETE FROM Skill');
  await db.run('DELETE FROM user_follows');
  await db.run('DELETE FROM User');
  console.log('✅ Tables cleared.');
}

async function seedDatabase() {
  let db;
  try {
    db = await connectDb();
    console.log('✅ Connected to database');

    const seedsPath = path.join(__dirname, 'seedimages.json');
    const seedsData = await fs.readFile(seedsPath, 'utf8');
    const usersData = JSON.parse(seedsData);
    console.log(`✅ Loaded ${usersData.length} user themes from seedimages.json`);

    const hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, SALT_ROUNDS);
    console.log('✅ Password hashed');

    await clearTables(db);

    const users = [];
    const userIds = [];

    for (const item of usersData) {
      // Extract the user key (e.g., "user1") and the theme
      const [userKey, theme] = Object.entries(item).find(([key]) => key.startsWith('user'));
      // Extract the image data (all other keys)
      const imageData = Object.fromEntries(
        Object.entries(item).filter(([key]) => key !== userKey)
      );

      const baseName = cleanName(theme);
      const uniqueName = `${baseName}_${userKey}`;
      const email = `${uniqueName}@example.com`;

      const user = {
        id: uuidv4(),
        name: uniqueName,
        email,
        password: hashedPassword,
        avatar: '',
        avatar_public_id: null,
        bio: generateBio(theme),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store theme along with user data for later use
      users.push({ ...user, imageData, theme });
      userIds.push(user.id);
    }

    // Insert users
    console.log(`👤 Inserting ${users.length} users...`);
    for (const user of users) {
      await db.run(
        `INSERT INTO User (id, name, email, password, avatar, avatar_public_id, bio, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.email,
          user.password,
          user.avatar,
          user.avatar_public_id,
          user.bio,
          user.created_at,
          user.updated_at,
        ]
      );
    }

    // Create skills and media
    const skillIds = [];
    console.log('🖼️  Creating skills and media...');

    for (const user of users) {
      // Collect all images with their ratios
      const allImages = [];
      for (const [ratio, urls] of Object.entries(user.imageData)) {
        if (!Array.isArray(urls)) continue;
        for (const url of urls) {
          if (url) allImages.push({ url, ratio });
        }
      }

      // Shuffle the images for this user
      const shuffled = allImages.sort(() => Math.random() - 0.5);

      // Create a skill for each image
      for (const { url, ratio } of shuffled) {
        const skillId = uuidv4();
        const skillDescription = `Check out my latest ${user.theme} creation! #${user.theme.replace(/\s+/g, '')}`;
        const now = new Date().toISOString();

        await db.run(
          `INSERT INTO Skill (id, user_id, description, media_ratio, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [skillId, user.id, skillDescription, ratio, now, now]
        );
        skillIds.push(skillId);

        const mediaId = uuidv4();
        await db.run(
          `INSERT INTO SkillMedia (id, skill_id, media_type, media_url, public_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [mediaId, skillId, 'image', url, null, now]
        );
      }
    }

    console.log(`✅ Created ${skillIds.length} skills with media.`);

    // Generate random follows (each user follows 3–10 others)
    console.log('🔗 Creating user follows...');
    const followPairs = new Set();

    for (const followerId of userIds) {
      const followCount = randomInt(3, 10);
      const potentialFollowings = userIds.filter(id => id !== followerId);
      const selected = randomItems(potentialFollowings, Math.min(followCount, potentialFollowings.length));

      for (const followingId of selected) {
        const pair = `${followerId}-${followingId}`;
        if (!followPairs.has(pair)) {
          followPairs.add(pair);
          await db.run(
            `INSERT INTO user_follows (follower_id, following_id, created_at)
             VALUES (?, ?, ?)`,
            [followerId, followingId, new Date().toISOString()]
          );
        }
      }
    }
    console.log(`✅ Created ${followPairs.size} follow relationships.`);

    // Generate random likes on skills
    console.log('❤️  Adding likes to skills...');
    let likeCount = 0;

    for (const skillId of skillIds) {
      const skillOwner = await db.get(`SELECT user_id FROM Skill WHERE id = ?`, [skillId]);
      if (!skillOwner) continue;

      const possibleLikers = userIds.filter(id => id !== skillOwner.user_id);
      const numberOfLikes = randomInt(0, 15);
      const likers = randomItems(possibleLikers, Math.min(numberOfLikes, possibleLikers.length));

      for (const likerId of likers) {
        try {
          await db.run(
            `INSERT INTO Skill_Likes (skill_id, user_id, created_at)
             VALUES (?, ?, ?)`,
            [skillId, likerId, new Date().toISOString()]
          );
          likeCount++;
        } catch (err) {
          // ignore duplicates
        }
      }
    }
    console.log(`✅ Added ${likeCount} skill likes.`);

    // Generate random comments
    console.log('💬 Adding comments...');
    const commentIds = [];

    for (const skillId of skillIds) {
      const numberOfComments = randomInt(0, 5);
      for (let i = 0; i < numberOfComments; i++) {
        const commenterId = userIds[Math.floor(Math.random() * userIds.length)];
        const commentId = uuidv4();
        const commentText = [
          'Awesome! 👏',
          'Love this!',
          'Great work!',
          'Inspirational 🔥',
          'Keep it up!',
          'So creative!',
          'This is amazing 😍',
          'Nice one!',
          '👍👍',
          'Wow!'
        ][Math.floor(Math.random() * 10)];

        await db.run(
          `INSERT INTO Comment (id, skill_id, user_id, text, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [commentId, skillId, commenterId, commentText, new Date().toISOString(), new Date().toISOString()]
        );
        commentIds.push(commentId);
      }
    }
    console.log(`✅ Added ${commentIds.length} comments.`);

    // Generate random likes on comments
    console.log('❤️  Adding comment likes...');
    let commentLikeCount = 0;

    for (const commentId of commentIds) {
      const commentOwner = await db.get(`SELECT user_id FROM Comment WHERE id = ?`, [commentId]);
      if (!commentOwner) continue;

      const possibleLikers = userIds.filter(id => id !== commentOwner.user_id);
      const numberOfLikes = randomInt(0, 8);
      const likers = randomItems(possibleLikers, Math.min(numberOfLikes, possibleLikers.length));

      for (const likerId of likers) {
        try {
          await db.run(
            `INSERT INTO Comment_Likes (comment_id, user_id, created_at)
             VALUES (?, ?, ?)`,
            [commentId, likerId, new Date().toISOString()]
          );
          commentLikeCount++;
        } catch (err) {
          // ignore duplicates
        }
      }
    }
    console.log(`✅ Added ${commentLikeCount} comment likes.`);

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    if (db) await db.close();
  }
}

seedDatabase();