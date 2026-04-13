const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Message = require("./models/Message");

dotenv.config();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch((err) => console.log("❌ DB Connection Error: ", err));

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", async (roomID) => {
    socket.join(roomID);
    console.log(`User ID: ${socket.id} joined room: ${roomID}`);

    try {
      // 🛠️ Atlas se purane messages fetch karna
      const previousMessages = await Message.find({ room: roomID })
        .sort({ createdAt: 1 })
        .limit(50);
      
      // Frontend ko bhej rahe hain (Isse purani chat dikhegi)
      socket.emit("load_messages", previousMessages);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  });

  socket.on("send_message", async (data) => {
    try {
      // 🛠️ Data format ko Atlas model ke hisaab se adjust kiya
      const newMessage = new Message({
        room: data.room,
        author: data.sender || data.author, 
        message: data.text || data.message, 
        time: data.time || new Date().toLocaleTimeString()
      });

      await newMessage.save();
      console.log("💾 Message saved to Atlas!");

      // Dusre users ko real-time message bhejna
      socket.to(data.room).emit("receive_message", data);
      
    } catch (err) {
      console.error("❌ Message save nahi hua:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});