const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Common file filter (allow images and common video types)
const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, MP4, MOV allowed'), false);
  }
};

// Memory storage (no disk!)
const memoryStorage = multer.memoryStorage();
const rawMulter = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // up to 20MB per file
});

// Post media middleware - accept multiple files under field name 'media'
const uploadPostMedia = [
  rawMulter.array('media', 5), // accept up to 5 files
  async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();

    try {
      const uploadFile = (file) =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'skillswap/posts',
              allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov'],
              transformation: [
                { width: 1080, height: 1080, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error) return reject(error);
              resolve({ secure_url: result.secure_url, public_id: result.public_id });
            },
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

      const results = await Promise.all(req.files.map((f) => uploadFile(f)));

      req.files.forEach((f, i) => {
        f.cloudinary_url = results[i].secure_url;
        f.public_id = results[i].public_id;
      });

      // Keep compatibility for routes that expect single file on `req.file`
      if (req.files.length === 1) req.file = req.files[0];

      next();
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  },
];

// Profile pictures (same pattern)
const uploadProfilePic = [
  rawMulter.single('profilePic'),
  async (req, res, next) => {
    if (!req.file) return next();
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'skillswap/profiles',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return res.status(500).json({ error: 'Upload failed' });
        req.file.cloudinary_url = result.secure_url;
        req.file.public_id = result.public_id;
        next();
      }
    );
    
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  }
];

module.exports = {
  uploadPostMedia,
  uploadProfilePic
};
