# SkillSwap Server (Backend API)

> Fully-featured backend for the SkillSwap social learning platform. Built using **Node.js**, **Express**, **SQLite (Turso friendly)** with **real-time chat**, **media uploads**, **rate limiting**, and **JWT access control**.

---

## 📌 What This Server Provides

- **REST API** for user authentication, profile management, skill posts, likes, comments, and followers.
- **Real-time chat** using **WebSockets** (presence, typing indicator, message sync).
- **Secure media uploads** via Cloudinary (streaming uploads with Multer -> streamifier).
- **Rate limiting & spam protection** for sensitive endpoints.
- **JWT-based authentication** with token verification endpoint.
- **Global error handling** for clean client responses and detailed server logging.

---

## 🧱 Tech Stack & Tools

| Layer         | Technology                           | Purpose                           |
| ------------- | ------------------------------------ | --------------------------------- |
| Runtime       | Node.js                              | Server runtime                    |
| Web framework | Express                              | REST routing, middleware pipeline |
| Database      | SQLite (local) / Turso (prod)        | Persistent storage                |
| Auth          | JSON Web Token                       | User sessions                     |
| Realtime      | ws (WebSocket)                       | Chat + presence updates           |
| File uploads  | multer + streamifier + Cloudinary v2 | Secure, in-memory media uploads   |
| Rate limiting | express-rate-limit                   | Anti-bot & spam protection        |
| Logging       | Custom middleware                    | Request logging + error tracing   |

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js** ≥ 18
- **npm**
- **SQLite3** (for local DB)

### Install & Run

```bash
cd server
npm install
cp .env.example .env
# update .env with Cloudinary credentials + JWT secret
npm run dev
```

Server will start at:

- **HTTP API**: `http://localhost:8080/api`
- **WebSocket**: `ws://localhost:8080?token=<JWT>`

---

## 🔧 Environment Variables

Create a `.env` file (or set in your deployment environment). Required variables:

```env
PORT=8080
JWT_SECRET=your_secret

# Cloudinary (media storage)
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Optional: Turso (production DB)
TURSO_URL=https://<your-turso-instance>.turso.tech
TURSO_TOKEN=<your-token>
```

---

## 🗂️ Project Structure Overview

```
server/
├── index.js                     # Entrypoint + Express setup + WebSocket server
├── initializeDb.js              # Create DB schema (runs at startup)
├── db.js                        # SQLite/Turso connection wrapper
├── errorHandler.js              # helper for generating structured errors
|
├── authentication/              # Auth endpoints & validation
│   ├── auth.js
│   └── validation.js
|
├── middleware/                  # Express middleware (rate limit, upload, JWT, logging)
│   ├── apiLogger.js
│   ├── jwt.js
│   ├── rateLimit.js
│   ├── upload.js
│   └── validateSkills.js
|
├── config/                      # Cloudinary configuration
│   └── cloudinary.js
|
├── dashboard/                   # Route handlers grouped by domain
│   ├── profile/
│   │   ├── users.js
│   │   └── userFollower.js
│   ├── home/
│   │   ├── skills.js
│   │   ├── commet.js
│   │   ├── explore.js
│   │   └── skillLike.js
│   └── chat/
│       ├── chat.js
│       └── websocket.js
|
├── models/                      # DB abstraction layer (SQLite/Turso)
│   ├── user.js
│   ├── skills.js
│   ├── skillMedia.js
│   ├── skillLikes.js
│   ├── comment.js
│   ├── commentLikes.js
│   ├── userFollows.js
│   ├── chatRoom.js
│   ├── chatMessage.js
│   └── abstract.js
|
└── uploads/                     # Local upload storage (not used in production)
    ├── profiles/
    └── posts/
```

---

## 🔐 Middleware & Security

### JWT Authentication (`middleware/jwt.js`)

- Verifies `Authorization: Bearer <token>` header
- Attaches `req.user` payload to requests
- Provides `tokenVerify` endpoint for frontend validation

### Rate Limiting (`middleware/rateLimit.js`)

Protects key endpoints to prevent brute force and spam:

- `loginLimiter`: 5 attempts / 15 min
- `registerLimiter`: 5 attempts / 1 hour
- `followUnfollowLimiter`: 30 actions / 5 min
- `commentLikeLimiter`: 20 actions / 1 min
- `skillLikeLimiter`: 20 actions / 1 min
- `skillPostLimiter`: 5 posts / min

### CORS Protection (index.js)

Only allows traffic from configured frontends.

### Global Error Handler (index.js)

- Centralized JSON error responses
- Logs full error for debugging
- Uses `errHandler(status, message)` helper for structured errors

### File Upload Security

- In-memory upload (Multer memory storage)
- Allowed MIME types enforced (`jpeg/png/webp/mp4/mov`)
- Max size 20MB per file
- Cloudinary upload via streamifier (no disk writes)
- Image/video transformation + auto format/quality

---

## 🧩 API Reference (All Endpoints)

### Authentication

| Method | Path               | Description                       | Auth |
| ------ | ------------------ | --------------------------------- | ---- |
| POST   | `/api/login`       | Login user (returns JWT + user)   | No   |
| POST   | `/api/register`    | Register new user                 | No   |
| GET    | `/api/tokenVerify` | Validate JWT and get current user | Yes  |

### User Profiles

| Method | Path                        | Description                | Auth |
| ------ | --------------------------- | -------------------------- | ---- |
| GET    | `/api/profile`              | Get logged-in profile      | Yes  |
| GET    | `/api/profileById/:id`      | Get any user profile       | Yes  |
| GET    | `/api/searchUser?username=` | Search users by name/email | Yes  |

### Following / Followers

| Method | Path                              | Description               | Auth |
| ------ | --------------------------------- | ------------------------- | ---- |
| POST   | `/api/follow/:userId`             | Follow user               | Yes  |
| DELETE | `/api/follow/:userId`             | Unfollow user             | Yes  |
| GET    | `/api/profile/followers/byId/:id` | List followers for a user | Yes  |
| GET    | `/api/profile/following/byId/:id` | List following for a user | Yes  |

### Skills (Posts)

| Method | Path                     | Description                                  | Auth |
| ------ | ------------------------ | -------------------------------------------- | ---- |
| GET    | `/api/skills`            | Paginated skill feed (recommendation-driven) | Yes  |
| GET    | `/api/skills/:id`        | Skill details (+media + comments)            | Yes  |
| POST   | `/api/skills`            | Create new skill (multi-media upload)        | Yes  |
| PUT    | `/api/skills/:id`        | Update a skill + media replacement           | Yes  |
| PATCH  | `/api/skills/:skill_id`  | Update skill description only                | Yes  |
| DELETE | `/api/skills/:id`        | Delete skill & cloud media                   | Yes  |
| GET    | `/api/my-skills`         | Get logged-in user’s skills                  | Yes  |
| GET    | `/api/my-skillsById/:id` | Get skills by user id                        | Yes  |

### Skill Likes

| Method | Path                              | Description                          | Auth |
| ------ | --------------------------------- | ------------------------------------ | ---- |
| POST   | `/api/:skillId/like`              | Like a skill                         | Yes  |
| DELETE | `/api/:skillId/like`              | Unlike a skill                       | Yes  |
| POST   | `/api/:skillId/like/toggle`       | Toggle like/unlike                   | Yes  |
| GET    | `/api/:skillId/likes`             | List likers (with pagination)        | No   |
| GET    | `/api/:skillId/like/status`       | Check current user like status       | Yes  |
| GET    | `/api/users/me/liked-skills`      | Logged-in user liked skills          | Yes  |
| GET    | `/api/users/:userId/liked-skills` | Another user’s liked skills          | No   |
| POST   | `/api/likes/batch`                | Batch like counts                    | No   |
| POST   | `/api/likes/status/batch`         | Batch like status for a user         | Yes  |
| DELETE | `/api/admin/:skillId/likes`       | Delete all likes for a skill (admin) | Yes  |

### Comments

| Method | Path                             | Description                         | Auth |
| ------ | -------------------------------- | ----------------------------------- | ---- |
| GET    | `/api/comments/:skill_id`        | Get comments + like info            | Yes  |
| POST   | `/api/comment`                   | Add comment                         | Yes  |
| POST   | `/api/commentlike`               | Like a comment                      | Yes  |
| DELETE | `/api/commentlike`               | Unlike a comment                    | Yes  |
| POST   | `/api/commentlike/toggle`        | Toggle like/unlike comment          | Yes  |
| GET    | `/api/comment/:comment_id/likes` | Get list of users who liked comment | Yes  |
| GET    | `/api/comment/:comment_id/liked` | Check if current user liked         | Yes  |
| DELETE | `/api/comment/:comment_id`       | Delete own comment                  | Yes  |

### Search / Explore

| Method | Path                        | Description                  | Auth |
| ------ | --------------------------- | ---------------------------- | ---- |
| GET    | `/api/searchUser?username=` | Search users (partial match) | Yes  |

### Chat (REST)

| Method | Path                                  | Description                     | Auth |
| ------ | ------------------------------------- | ------------------------------- | ---- |
| POST   | `/api/chat/send`                      | Send chat message (legacy REST) | Yes  |
| GET    | `/api/chat/rooms`                     | List chat rooms                 | Yes  |
| GET    | `/api/chat/room/conversation/:roomId` | Get paged conversation          | Yes  |
| PATCH  | `/api/chat/room/:room_id/read`        | Mark room as read               | Yes  |
| DELETE | `/api/chat/message/:messageId`        | Delete message                  | Yes  |

### WebSocket (Realtime Chat)

- **Endpoint:** `wss://<host>/?token=<JWT>`
- **Messages** are JSON objects with `type` and payload.

Common payloads:

```json
{ "type": "message", "room_id": "...", "receiver_id": "...", "text": "..." }
{ "type": "typing", "room_id": "...", "receiver_id": "..." }
{ "type": "ping" }
{ "type": "delete_message", "message_id": "...", "receiver_id": "..." }
```

Server emits:

- `presence` (online/offline updates)
- `message` (incoming messages)
- `typing` (typing indicator)
- `delete_message` (message deleted)

---

## 🗄️ Database & Models

### DB Strategy

- **Development:** SQLite file (`database.sqlite`)
- **Production:** Turso (edge SQLite) when `TURSO_URL` + `TURSO_TOKEN` are set.

### Schema Initialization

- `initializeDb.js` creates all tables on startup.
- Tables are defined in `models/*.js`.

### Key Data Models

- `User` — auth, profile, avatar, bio
- `Skills` — text posts with media
- `SkillMedia` — Cloudinary links & metadata
- `SkillLikes` — like/unlike tracker
- `Comment` — threaded comments
- `CommentLikes` — comment liking
- `UserFollows` — follower/following graph
- `ChatRoom` & `ChatMessage` — real-time messaging

---

## 🛡️ Security & Best Practices

### Authentication

- JWT tokens signed with `JWT_SECRET`
- Tokens verified on every protected route

### Authorization

- Skill ownership enforced for updates/deletes
- Comment delete requires owner check

### Rate Limiting

- Applies to auth, follow, like, and post endpoints
- Prevents brute force and spam behavior

### Input Validation

- Basic validation in `authentication/validation.js`
- Middleware ensures required fields exist and are valid

### Error Handling

- Use `errHandler(status, message)` helper to create structured errors.
- Global error handler returns `{ success: false, message }`.

---

## 📈 Performance & Optimization Notes

- **Pagination:** feed, chat history, like lists, etc.
- **WebSocket list tracking:** only sends presence updates to contacts
- **Cloudinary transformations:** auto format + quality + size limits
- **In-memory uploads:** avoids disk I/O and reduces latency
- **Rate limits:** reduces load and user abuse

---

## 🧪 Testing & Local Debugging

- Use Postman / curl for API endpoints.
- WebSocket testing can be done via `wscat` or browser client.
- Use `npm run dev` for nodemon auto reload.

---

## ✅ Deployment Suggestions

- Use environment variables for secrets.
- In production, prefer Turso as the database backend.
- Use PM2 / Docker for process management.

---

## 📬 Contact

For issues, improvements, or collaboration, open an issue or PR in the repository.

---

_This README is designed for developers integrating or extending the SkillSwap backend._

```

```
