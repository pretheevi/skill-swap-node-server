````markdown
# SkillSwap Server

Backend REST API for the SkillSwap platform (Node.js, Express, SQLite). Secure file uploads with Cloudinary v2 + rate limiting.

## Quick start

Requirements:

- Node.js, npm
- SQLite3

Install and run:

```bash
cd server
npm install
cp .env.example .env  # Add CLOUDINARY_* vars
npm run dev           # nodemon + index.js
```
````

**Environment variables:**

```
PORT=8080
JWT_SECRET=your_secret
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## Security Features

- **Rate limiting** - 5 login attempts/15min, 3 registrations/hour
- **Cloudinary v2** - Secure image uploads with streamifier (no disk writes)
- **Global error handler** - Custom client messages, full server logging
- **JWT authentication** - Protected routes

## Base URL

`http://localhost:8080/api`

## Endpoints

### Auth (Rate Limited)

- `POST /api/register` - `{ name, email, password }` → `201`
- `POST /api/login` - `{ email, password }` → `{ token, user }`

### Skills (Protected)

- `GET /api/skills`
- `POST /api/skills` - `{ title, description, level, category }` + image upload
- `GET /api/skills/:id`, `PUT`, `DELETE`
- `GET /api/my-skills`

### Comments (Protected)

- `POST /api/comment` - `{ text, skillId }`

**Headers:** `Authorization: Bearer <token>`

## File Uploads

Skills support image uploads (`media` field):

```
Multer memoryStorage → streamifier → Cloudinary v2 → req.file.cloudinary_url
```

- Max 5MB, JPEG/PNG/WEBP only
- Auto-optimized (1080x1080, quality: auto)
- Render-compatible (no disk writes)

## Error Handling

```
Custom: throw errHandler(400, 'User not found')
// Client: { success: false, message: "User not found" }
// Server: Full stack trace logged
```

## Examples (curl)

**Register (rate limited):**

```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret"}'
```

**Upload skill with image:**

```bash
curl -X POST http://localhost:8080/api/skills \
  -H "Authorization: Bearer TOKEN" \
  -F "title=React" \
  -F "description=Learn React" \
  -F "media=@photo.jpg"
```

## Code Structure

```
index.js              # Server + middleware (rateLimit, CORS, errors)
middleware/rateLimit.js # Login/register protection
middleware/multer-cloudinary.js # Streamifier uploads
authentication/auth.js # JWT login/register
dashboard/home/skills.js # Skills CRUD + uploads
```

## Production

```
npm i express-rate-limit streamifier helmet
pm2 start index.js --name skillswap
npm audit fix  # Security clean
```

```

**Key updates:** Rate limiting, Cloudinary v2+streamifier, global error handler, file upload details, security section. Production-ready docs! 🚀
```
