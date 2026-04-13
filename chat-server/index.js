const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Message = require("./models/Message"); // Aage ./ hona zaroori hai // Model import kiya

// 1. Config & Middleware
dotenv.config();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// 2. MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
    family: 4 // IPv4 connectivity ensure karne ke liye
})
.then(() => console.log("✅ MongoDB Connected Successfully!"))
.catch((err) => console.log("❌ DB Connection Error: ", err));

// 3. Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Room Join logic + Purane messages load karna
  socket.on("join_room", async (roomID) => {
    socket.join(roomID);
    console.log(`User ID: ${socket.id} joined room: ${roomID}`);

    try {
      // 🛠️ Jab user join kare, us room ke purane 50 messages bhej do
      const previousMessages = await Message.find({ room: roomID }).sort({ createdAt: 1 }).limit(50);
      socket.emit("load_messages", previousMessages);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  });

  // Message bhejna aur Save karna
  socket.on("send_message", async (data) => {
    try {
      // 🛠️ Step 1: Database mein save karein
      const newMessage = new Message({
        room: data.room,
        author: data.author,
        message: data.message,
        time: data.time
      });
      await newMessage.save();

      // 🛠️ Step 2: Baki users ko real-time mein bhejein
      socket.to(data.room).emit("receive_message", data);
      
    } catch (err) {
      console.error("❌ Message save nahi hua:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// 4. Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});