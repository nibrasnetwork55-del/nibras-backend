const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    whatsapp: { type: String, default: "" },
    message: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
