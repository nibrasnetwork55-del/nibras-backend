const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("MONGODB_URI is not set; skipping MongoDB connection.");
    return false;
  }
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected.");
    return true;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    return false;
  }
}

module.exports = { connectDatabase };
