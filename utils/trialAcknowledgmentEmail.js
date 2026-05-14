/**
 * Auto-reply sent to the submitter after contact or trial booking.
 * greetingName: e.g. "Ahmed Ali" or "Parent Name"
 */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trialAcknowledgmentHtml(greetingName) {
  const name = escapeHtml(greetingName || "Valued Parent");
  const urgentWa = "https://wa.me/201099493640";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:28px 12px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dce8df;">
        <tr>
          <td style="background:linear-gradient(135deg,#1C3A2E 0%,#245038 100%);padding:26px 22px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:19px;font-weight:700;">Trial Request Received – Nibras Network</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 26px;font-size:15px;color:#1a2f45;line-height:1.65;">
            <p style="margin:0 0 16px;">Dear ${name},</p>
            <p style="margin:0 0 16px;">Thank you for registering for a <strong>FREE</strong> trial session at <strong>Nibras Network</strong> – The Qur'an Light.</p>
            <p style="margin:0 0 16px;">We have received your request successfully. Our academic team will contact you within <strong>24 hours</strong> (via WhatsApp) to confirm the trial schedule, assign a suitable teacher, and share the session link.</p>
            <p style="margin:0 0 12px;color:#2a5c40;"><strong>Response time:</strong> up to 24 hours (usually faster).</p>
            <p style="margin:0 0 20px;">For urgent inquiries, WhatsApp us: <a href="${urgentWa}" style="color:#1C7A45;font-weight:700;">+201099493640</a></p>
            <p style="margin:0 0 20px;">We look forward to guiding you on your Quran learning journey.</p>
            <p style="margin:0;">Best regards,<br/><strong>Nibras Network Team</strong> 🌙</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function trialAcknowledgmentSubject() {
  return "Trial Request Received – Nibras Network";
}

module.exports = { trialAcknowledgmentHtml, trialAcknowledgmentSubject };
