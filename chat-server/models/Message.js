const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  room: String,
  author: String,
  message: String,
  time: String,
}, { timestamps: true });

module.exports = mongoose.model("Message", MessageSchema);