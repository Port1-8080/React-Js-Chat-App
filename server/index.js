// === Core dependencies ===
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

// === Firebase setup ===
const { ref, push } = require("firebase/database");
const db = require("./firebase");

// === Cloudinary & file upload ===
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// === Configure Cloudinary ===
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// === Initialize Express + HTTP server
const app = express();
const server = http.createServer(app);

// === CORS Setup ===
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-frontend-name.netlify.app", // Replace with actual Netlify URL
    ],
    credentials: true,
  })
);
app.use(express.json());

// === Multer setup ===
const upload = multer({ storage: multer.memoryStorage() });

// === File Upload Route ===
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const streamUpload = () =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "chat_images", resource_type: "raw" },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

  streamUpload()
    .then((result) =>
      res.json({
        imageUrl: result.secure_url,
        fileName: result.original_filename,
      })
    )
    .catch((err) => {
      console.error("Upload error:", err);
      res.status(500).json({ error: "File upload failed" });
    });
});

// === Socket.IO Setup ===
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://your-frontend-name.netlify.app", // Replace this
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("set_username", ({ username, avatar }) => {
    onlineUsers[username] = { socketId: socket.id, avatar };
    io.emit(
      "online_users",
      Object.entries(onlineUsers).map(([name, data]) => ({
        username: name,
        avatar: data.avatar,
      }))
    );
  });

  socket.on("private_message", ({ to, from, message, timestamp, imageUrl }) => {
    const newMessage = {
      from,
      to,
      timestamp,
    };

    if (imageUrl) {
      newMessage.imageUrl = imageUrl;
    } else {
      newMessage.message = message;
    }

    push(ref(db, "messages/"), newMessage);

    const toUser = onlineUsers[to];
    if (toUser) {
      io.to(toUser.socketId).emit("receive_message", newMessage);
    }

    const fromUser = onlineUsers[from];
    if (fromUser) {
      io.to(fromUser.socketId).emit("message_delivered", { to, timestamp });
    }
  });

  socket.on("typing", ({ to, from, isTyping }) => {
    const toUser = onlineUsers[to];
    if (toUser) {
      io.to(toUser.socketId).emit("typing", { from, isTyping });
    }
  });

  socket.on("message_read", ({ from, to }) => {
    const toUser = onlineUsers[to];
    if (toUser) {
      io.to(toUser.socketId).emit("message_read", { from });
    }
  });

  socket.on("disconnect", () => {
    const username = Object.keys(onlineUsers).find(
      (key) => onlineUsers[key].socketId === socket.id
    );
    if (username) {
      delete onlineUsers[username];
      io.emit(
        "online_users",
        Object.entries(onlineUsers).map(([name, data]) => ({
          username: name,
          avatar: data.avatar,
        }))
      );
    }
    console.log("🔴 User disconnected:", socket.id);
  });
});

// === Health check route
app.get("/", (req, res) => {
  res.send("✅ Server is running.");
});

// === Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
