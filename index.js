require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const wsConnectionHandler = require("./dashboard/chat/websocket");
const initializeDb = require("./initializeDb");
const apiLogger = require("./middleware/apiLogger");

// Importing route handlers
const userRoutes = require("./dashboard/profile/users");
const authentication = require("./authentication/auth");
const skillRoutes = require("./dashboard/home/skills");
const comment = require("./dashboard/home/commet");
const userFollows = require("./dashboard/profile/userFollower");
const exploreRoutes = require("./dashboard/home/explore");
const skillLikeRoutes = require("./dashboard/home/skillLike");

// Chat applications
const ChatRoutes = require("./dashboard/chat/chat");

// initialize Database, Create server and WebSocket server
const app = express();
let wss;
async function initializatDbAndServer() {
  try {
    await initializeDb();
    console.log("Database initialized");

    const Server = http.createServer(app);

    wss = new WebSocketServer({ server: Server });

    wss.on("connection", wsConnectionHandler);

    const PORT = process.env.PORT || 8080;
    Server.listen(PORT, "0.0.0.0", () =>
      console.log(`listening to PORT:${PORT}...`),
    );
  } catch (err) {
    console.error("Server init failed:", err);
    process.exit(1);
  }
}
initializatDbAndServer();

const allowedOrigins = [
  "https://insta-mirror-client.onrender.com",
  "https://skillswap-aead1adi9-prethiveerajs-projects.vercel.app",
  "https://skillswap-git-main-prethiveerajs-projects.vercel.app",
  "https://skillswap-zeta-seven.vercel.app",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allow by CORS"));
    },
    credentials: true,
  }),
);

app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: err.message });
  }
  next(err);
});

app.use(apiLogger);
app.use(express.json());
app.use("/api", authentication);
app.use("/api", userRoutes);
app.use("/api", userFollows);
app.use("/api", skillRoutes);
app.use("/api", skillLikeRoutes);
app.use("/api", comment);
app.use("/api", exploreRoutes);
app.use("/api", ChatRoutes);

// global error handler
app.use((err, req, res, next) => {
  console.error("Full error:", err);
  const errorResponse = {
    success: false,
    message: err.msg || err.message || "Internal server error",
  };
  console.error("Error response to client:", errorResponse);
  res.status(err.status || 500).json(errorResponse);
});
