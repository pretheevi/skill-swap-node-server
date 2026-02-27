// seed.js - USING YOUR ASYNC DB CONNECTION
const bcrypt = require('bcrypt');
const connectDb = require('./sql/db'); // Your async db connection
const initializeDb = require('./models/initializeDb');

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function seedData() {
  let db;
  
  try {
    console.log('🏗️ Initializing database...');
    
    // Initialize database schema first
    await initializeDb();
    
    console.log('🔗 Connecting to database...');
    // Use your async connectDb function
    db = await connectDb();
    
    // Verify tables exist
    const tableCheck = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
    );
    
    if (!tableCheck) {
      throw new Error('User table not found after initialization');
    }
    
    console.log('✅ Tables ready!');

    // 1. USERS with REAL bcrypt hashes
    const users = [
      { name: 'IceBearDev', email: 'icebear@skillswap.com', password: 'icebear123', avatar: '', bio: 'Full-stack | DSA learner | Chennai' },
      { name: 'PriyaTamil', email: 'priya@skillswap.com', password: 'priya456', avatar: '', bio: 'தமிழ் React teacher | Hooks expert' },
      { name: 'DSAGuru2000', email: 'dsa@skillswap.com', password: 'dsa789', avatar: '', bio: 'LeetCode 2000+ | Graph algorithms' },
      { name: 'ReactNinja', email: 'react@skillswap.com', password: 'ninja101', avatar: '', bio: 'Custom hooks | Performance optimization' },
      { name: 'BackendBoss', email: 'node@skillswap.com', password: 'boss202', avatar: '', bio: 'Express | Streams | Security' },
      { name: 'UIUXStar', email: 'design@skillswap.com', password: 'design303', avatar: '', bio: 'Tailwind pro | Responsive design' },
      { name: 'PythonPro', email: 'python@skillswap.com', password: 'python404', avatar: '', bio: 'FastAPI | ML | Django expert' },
      { name: 'TamilDev', email: 'tamil@skillswap.com', password: 'tamil505', avatar: '', bio: 'MERN Tamil tutorials | Chennai dev' }
    ];

    console.log('🔐 Hashing passwords...');
    for (let user of users) {
      user.password = await hashPassword(user.password);
    }

    // Insert users using async/await
    console.log('👥 Inserting users...');
    for (let user of users) {
      await db.run(
        `INSERT INTO User (name, email, password, avatar, bio) VALUES (?, ?, ?, ?, ?)`,
        [user.name, user.email, user.password, user.avatar, user.bio]
      );
    }
    console.log(`✅ Inserted ${users.length} users`);

    // 2. SKILLS (12 skills)
    const skills = [
      [1, 'React Hooks: useState, useEffect, useContext with projects', 4.8],
      [2, 'தமிழ் DSA: Array, LinkedList, Stack full explanation', 4.9],
      [3, 'LeetCode Top 100: Two Sum, LRU Cache, Graphs solved', 4.7],
      [4, 'Build custom React hooks for real apps', 4.6],
      [5, 'Express rate limiting + security best practices', 4.9],
      [1, 'MERN Stack: Complete SkillSwap clone walkthrough', 4.8],
      [6, 'Tailwind CSS: Responsive design utility classes', 4.5],
      [7, 'FastAPI: Modern Python backend framework', 4.7],
      [2, 'React Context API: State without Redux', 4.6],
      [3, 'Binary Search Trees: Insert, delete, search', 4.8],
      [8, 'Node.js Streams: Multer + Cloudinary uploads', 4.9],
      [4, 'useCallback vs useMemo: React performance', 4.7]
    ];

    console.log('📚 Inserting skills...');
    for (let skill of skills) {
      await db.run(
        'INSERT INTO Skill (user_id, description, rating) VALUES (?, ?, ?)',
        skill
      );
    }
    console.log(`✅ Inserted ${skills.length} skills`);

    // 3. SKILL MEDIA (12 items)
    const media = [
      [1, 'https://res.cloudinary.com/demo/image1.jpg', 'skillswap/posts/react1', 'image'],
      [2, 'https://res.cloudinary.com/demo/image2.jpg', 'skillswap/posts/dsa1', 'image'],
      [3, 'https://res.cloudinary.com/demo/image3.jpg', 'skillswap/posts/leetcode1', 'image'],
      [5, 'https://res.cloudinary.com/demo/image5.gif', 'skillswap/posts/rate-limit', 'image'],
      [6, 'https://res.cloudinary.com/demo/image6.jpg', 'skillswap/posts/mern1', 'image'],
      [7, 'https://res.cloudinary.com/demo/image7.jpg', 'skillswap/posts/tailwind1', 'image'],
      [9, 'https://res.cloudinary.com/demo/image9.jpg', 'skillswap/posts/context1', 'image'],
      [10, 'https://res.cloudinary.com/demo/image10.gif', 'skillswap/posts/bst1', 'image'],
      [11, 'https://res.cloudinary.com/demo/image11.jpg', 'skillswap/posts/streams1', 'image'],
      [1, 'https://res.cloudinary.com/demo/video1.mp4', 'skillswap/posts/react-video', 'video'],
      [6, 'https://res.cloudinary.com/demo/image12.jpg', 'skillswap/posts/mern2', 'image'],
      [11, 'https://res.cloudinary.com/demo/image13.gif', 'skillswap/posts/streams2', 'image']
    ];

    console.log('🖼️ Inserting media...');
    for (let m of media) {
      await db.run(
        'INSERT INTO SkillMedia (skill_id, media_url, public_id, media_type) VALUES (?, ?, ?, ?)',
        m
      );
    }
    console.log(`✅ Inserted ${media.length} media items`);

    // 4. COMMENTS (15 items)
    const comments = [
      [1, 2, 'IceBear அண்ணா super clear! Context part perfect 👍'],
      [1, 3, 'useCallback example fixed my infinite re-renders'],
      [2, 1, 'தமிழ் DSA explanation rocks for beginners!'],
      [3, 4, 'LeetCode roadmap is gold for interviews'],
      [5, 1, 'Rate limiting implementation ready for prod'],
      [6, 7, 'MERN project source code GitHub link?'],
      [7, 6, 'Tailwind responsive design made easy'],
      [9, 1, 'Priya Context tutorial clarity 10/10'],
      [10, 2, 'BST animation visualization helped tremendously'],
      [11, 4, 'Streams + Cloudinary flow diagram perfect!'],
      [1, 8, 'useRef DOM access example spot on'],
      [5, 3, 'Security middleware config copied!'],
      [6, 2, 'Fullstack MERN project > 100 theory videos'],
      [12, 5, 'Performance hooks comparison cleared confusion'],
      [3, 6, 'Graph algorithms roadmap appreciated']
    ];

    console.log('💬 Inserting comments...');
    for (let c of comments) {
      await db.run(
        'INSERT INTO Comment (skill_id, user_id, text) VALUES (?, ?, ?)',
        c
      );
    }
    console.log(`✅ Inserted ${comments.length} comments`);

    // 5. FOLLOWS
    const follows = [
      [2, 1], [4, 1], [1, 3], [5, 1], 
      [6, 7], [8, 5], [1, 2], [3, 4]
    ];

    console.log('👥 Inserting follows...');
    for (let f of follows) {
      await db.run(
        'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)',
        f
      );
    }
    console.log(`✅ Inserted ${follows.length} follows`);

    console.log('\n🎉 SEED COMPLETE!');
    console.log('========================');
    console.log('👥 8 Users');
    console.log('📚 12 Skills');
    console.log('🖼️ 12 Media');
    console.log('💬 15 Comments');
    console.log('👥 8 Follows');
    console.log('========================\n');
    
  } catch (err) {
    console.error('❌ SEED FAILED:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
      console.log('🔒 Database connection closed');
    }
  }
}

// Check if this is the main module being run
if (require.main === module) {
  seedData();
}

module.exports = seedData;