const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const ContactMessage = require("../models/ContactMessage");
const { whatsappLink } = require("../utils/whatsappLink");
const {
  trialAcknowledgmentHtml,
  trialAcknowledgmentSubject,
} = require("../utils/trialAcknowledgmentEmail");

router.post("/contact", async (req, res) => {
  const { fullName, email, whatsapp, message } = req.body;

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

  const waHref = whatsapp ? whatsappLink(whatsapp) : null;
  const whatsappBlock =
    waHref != null
      ? `<a href="${waHref}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:6px 16px;border-radius:50px;">💬 ${whatsapp} → Open Chat</a>`
      : (whatsapp || "Not provided");

  const mailOptions = {
    from: `"Nibras Network" <${process.env.EMAIL_USER}>`,
    to: process.env.RECEIVER_EMAIL,
    subject: `New Message from ${fullName} - Nibras Network`,
    html: `
      <div style="font-family: Arial; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4a7c59;">📬 New Message from Contact Form</h2>
        <hr/>
        <p><strong>Full Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>WhatsApp:</strong> ${whatsappBlock}</p>
        <p><strong>Message:</strong></p>
        <div style="background:#f9f9f9; padding:10px; border-radius:5px;">
          ${message}
        </div>
      </div>
    `,
  };

  const ackHtml = trialAcknowledgmentHtml(fullName);
  const ackSubject = trialAcknowledgmentSubject();

  try {
    await transporter.sendMail(mailOptions);

    try {
      await transporter.sendMail({
        from: `"Nibras Network" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: ackSubject,
        html: ackHtml,
      });
    } catch (ackErr) {
      console.error("contact acknowledgment email error:", ackErr);
    }

    try {
      if (mongoose.connection.readyState === 1) {
        await ContactMessage.create({
          fullName,
          email,
          whatsapp: whatsapp || "",
          message,
        });
      }
    } catch (dbErr) {
      console.error("contact MongoDB save error:", dbErr);
    }

    res.status(200).json({ success: true, message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "An error occurred while sending the message" });
  }
});

module.exports = router;
