const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Isse mobile wala connection block nahi hoga
    methods: ["GET", "POST"],
  },
});

// Sirf EK BAAR connection open karenge
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. Room join karne ka logic
  socket.on("join_room", (roomID) => {
    socket.join(roomID);
    console.log(`User ID: ${socket.id} joined room: ${roomID}`);
  });

  // 2. Room mein message bhejne ka logic
  socket.on("send_message", (data) => {
    // Agar room ID hai toh sirf us room mein bhejo, varna sabko (broadcast)
    if (data.room) {
      socket.to(data.room).emit("receive_message", data);
    } else {
      socket.broadcast.emit("receive_message", data);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING ON PORT 3001");
});