const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

router.post("/contact", async (req, res) => {
  const { fullName, email, whatsapp, message } = req.body;

  // Validation
  if (!fullName || !email || !message) {
    return res.status(400).json({ error: "Please fill in all required fields" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.RECEIVER_EMAIL,
    subject: `New Message from ${fullName} - Nibras Network`,
    html: `
      <div style="font-family: Arial; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4a7c59;">📬 New Message from Contact Form</h2>
        <hr/>
        <p><strong>Full Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>WhatsApp:</strong> ${whatsapp || "Not provided"}</p>
        <p><strong>Message:</strong></p>
        <div style="background:#f9f9f9; padding:10px; border-radius:5px;">
          ${message}
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "An error occurred while sending the message" });
  }
});

module.exports = router;