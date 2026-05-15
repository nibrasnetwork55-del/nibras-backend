const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const TrialBooking = require("../models/TrialBooking");
const { whatsappLink } = require("../utils/whatsappLink");
const {
  trialAcknowledgmentHtml,
  trialAcknowledgmentSubject,
} = require("../utils/trialAcknowledgmentEmail");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ─── Course href → readable label ──────────────────────────────── */
const COURSE_LABELS = {
  // Quran
  "/quran/noorani-qaida":       "Noorani Qaida (Foundation)",
  "/quran/recitation":          "Quran Recitation (Tilawah)",
  "/quran/memorization":        "Quran Memorization (Hifz)",
  "/quran/tajweed":             "Tajweed (Perfect Recitation)",
  "/quran/qiraat":              "Qira'at (Variant Recitations)",
  "/quran/tafsir":              "Tafsir (Quran Explanation)",
  "/quran/translation":         "Quran with Translation",
  // Arabic
  "/arabic/noor-al-bayan":      "Noor Al-Bayan (Arabic Foundation)",
  "/arabic/beginner":           "Arabic for Beginners",
  "/arabic/quranic":            "Quranic Arabic",
  "/arabic/conversational":     "Conversational Arabic",
  "/arabic/classical":          "Classical Arabic",
  "/arabic/msa":                "Modern Standard Arabic (MSA)",
  // Islamic Studies
  "/islamic/general":           "Islamic General (Comprehensive)",
  "/islamic/aqeedah":           "Aqeedah (Islamic Creed)",
  "/islamic/fiqh":              "Fiqh (Islamic Jurisprudence)",
  "/islamic/hadith":            "Hadith Studies",
  "/islamic/seerah":            "Seerah (Prophet's Biography)",
  "/islamic/tafsir":            "Tafsir (Quran Interpretation)",
};

function resolveCourses(courses) {
  const list = Array.isArray(courses) ? courses : [courses];
  return list.map(href => COURSE_LABELS[href] || href).join(" · ");
}

/* ─── Package data ───────────────────────────────────────────────── */
const PRIVATE_PKGS = [
  { name: "Starter",      hours: 4,  launch: "$22.40", regular: "$32.00" },
  { name: "Beginner",     hours: 6,  launch: "$33.60", regular: "$48.00" },
  { name: "Growth",       hours: 8,  launch: "$44.80", regular: "$64.00" },
  { name: "Accelerated",  hours: 10, launch: "$52.50", regular: "$75.00" },
  { name: "Intensive",    hours: 12, launch: "$63.00", regular: "$90.00" },
];

const GROUP_PKGS = [
  { name: "Group Starter",   hours: 4,  launch: "$14.00", regular: "$20.00" },
  { name: "Group Growth",    hours: 8,  launch: "$28.00", regular: "$40.00" },
  { name: "Group Intensive", hours: 12, launch: "$42.00", regular: "$60.00" },
  { name: "Group Beginner",  hours: 6,  launch: "$21.00", regular: "$30.00" },
  { name: "Accelerated",     hours: 10, launch: "$35.00", regular: "$50.00" },
];

const FAM_ROWS = [
  { hours: 8,  m2: { regular: "$60.00",  discounted: "$48.00"  }, m3: { regular: "$56.00",  discounted: "$44.80"  }, m4: { regular: "$52.00",  discounted: "$41.60"  } },
  { hours: 10, m2: { regular: "$75.00",  discounted: "$60.00"  }, m3: { regular: "$70.00",  discounted: "$56.00"  }, m4: { regular: "$65.00",  discounted: "$52.00"  } },
  { hours: 12, m2: { regular: "$90.00",  discounted: "$72.00"  }, m3: { regular: "$84.00",  discounted: "$67.20"  }, m4: { regular: "$78.00",  discounted: "$62.40"  } },
  { hours: 14, m2: { regular: "$105.00", discounted: "$84.00"  }, m3: { regular: "$98.00",  discounted: "$78.40"  }, m4: { regular: "$91.00",  discounted: "$72.80"  } },
  { hours: 16, m2: { regular: "$120.00", discounted: "$96.00"  }, m3: { regular: "$112.00", discounted: "$89.60"  }, m4: { regular: "$104.00", discounted: "$83.20"  } },
  { hours: 18, m2: { regular: "$135.00", discounted: "$108.00" }, m3: { regular: "$126.00", discounted: "$100.80" }, m4: { regular: "$117.00", discounted: "$93.60"  } },
  { hours: 20, m2: { regular: "$150.00", discounted: "$120.00" }, m3: { regular: "$140.00", discounted: "$112.00" }, m4: { regular: "$130.00", discounted: "$104.00" } },
];

const FAM_TIER_LABEL = { m2: "2 Members", m3: "3 Members", m4: "4+ Members" };

function resolvePackage(id) {
  if (!id) return null;
  const parts = id.split(":");
  const kind  = parts[0];

  if (kind === "p") {
    const pkg = PRIVATE_PKGS[Number(parts[1])];
    if (!pkg) return id;
    return { type: "Private (1-on-1)", name: pkg.name, hours: `${pkg.hours} h/mo`, price: pkg.launch, regular: pkg.regular };
  }
  if (kind === "g") {
    const pkg = GROUP_PKGS[Number(parts[1])];
    if (!pkg) return id;
    return { type: "Group Classes", name: pkg.name, hours: `${pkg.hours} h/mo`, price: pkg.launch, regular: pkg.regular };
  }
  if (kind === "f") {
    const row  = FAM_ROWS[Number(parts[1])];
    const tier = parts[2];
    if (!row || !row[tier]) return id;
    return { type: "Family Plan", name: FAM_TIER_LABEL[tier] ?? tier, hours: `${row.hours} h/mo`, price: row[tier].discounted, regular: row[tier].regular };
  }
  return id;
}

function packageHtml(id) {
  const pkg = resolvePackage(id);
  if (!pkg) return `<span style="color:#aaa;">Not selected</span>`;
  if (typeof pkg === "string") return pkg;

  return `
    <div style="display:inline-block;background:#fff8e6;border:1px solid #f0d890;border-radius:10px;padding:8px 14px;min-width:220px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#8B6508;margin-bottom:4px;">${pkg.type}</div>
      <div style="font-size:16px;font-weight:800;color:#1C3A2E;margin-bottom:2px;">${pkg.name}</div>
      <div style="font-size:12px;color:#5a7060;">${pkg.hours}</div>
      <div style="margin-top:6px;display:flex;align-items:baseline;gap:6px;">
        <span style="font-size:18px;font-weight:800;color:#8B6508;">${pkg.price}<span style="font-size:11px;font-weight:600;">/mo</span></span>
        <span style="font-size:12px;color:#b0b8b0;text-decoration:line-through;">${pkg.regular}</span>
        <span style="font-size:10px;background:#e8f5ec;color:#1C7A45;border-radius:4px;padding:1px 6px;font-weight:700;">🔥 30% OFF</span>
      </div>
    </div>`;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const DAY_LABEL = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday",
  thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

function row(icon, label, value) {
  return `
    <tr>
      <td style="padding:10px 16px;background:#f4f9f5;font-size:13px;font-weight:700;color:#2a5c40;white-space:nowrap;width:170px;border-bottom:1px solid #e3ede6;">
        ${icon}&nbsp; ${label}
      </td>
      <td style="padding:10px 16px;font-size:14px;color:#1a2f45;border-bottom:1px solid #e3ede6;">
        ${value}
      </td>
    </tr>`;
}

function sectionHeader(label) {
  return `
    <tr>
      <td colspan="2" style="background:#1C3A2E;padding:7px 16px;">
        <span style="color:#a8d5b5;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${label}</span>
      </td>
    </tr>`;
}

/* ─── Family members HTML block ──────────────────────────────────── */
function familyMembersHtml(members) {
  if (!members?.length) return "";

  const memberRows = members.map((m, i) => {
    // Course pills
    const courseLabels = Array.isArray(m.courseLabels) && m.courseLabels.length
      ? m.courseLabels
      : resolveCourses(m.courses || []).split(" · ").filter(Boolean);

    const coursePills = courseLabels.length
      ? courseLabels.map(c =>
          `<span style="display:inline-block;background:#e8f5ec;color:#1C3A2E;border:1px solid #b8ddc4;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;margin:2px 2px 0 0;">${c}</span>`
        ).join("")
      : `<span style="color:#aaa;font-size:12px;">—</span>`;

    const tzDisplay  = m.timezoneDisplay || m.timezone || "—";
    // preferredDay comes as a key like "mon", "tue" etc.
    const dayDisplay = DAY_LABEL[m.preferredDay] || m.preferredDay || "—";
    // selectedTime is already a formatted string from the frontend
    const timeDisplay = m.selectedTime || "—";

    return `
      <tr>
        <td colspan="2" style="padding:14px 16px;border-bottom:1px solid #e3ede6;background:${i % 2 === 0 ? "#f9fbf9" : "#ffffff"};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <!-- Member heading -->
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                  <div style="width:28px;height:28px;border-radius:50%;background:#1C3A2E;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;text-align:center;line-height:28px;">
                    ${i + 1}
                  </div>
                  <span style="font-size:15px;font-weight:700;color:#0e2a1e;">${m.name || "—"}</span>
                </div>

                <!-- Member details grid -->
                <table cellpadding="0" cellspacing="0" style="width:100%;font-size:12px;">
                  <tr>
                    <td style="padding:3px 0;width:110px;color:#7a9485;font-weight:600;">📧 Email</td>
                    <td style="padding:3px 0;">
                      <a href="mailto:${m.email}" style="color:#1C7A45;text-decoration:none;font-weight:600;">${m.email || "—"}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;color:#7a9485;font-weight:600;">🕐 Timezone</td>
                    <td style="padding:3px 0;color:#1a2f45;">${tzDisplay}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;color:#7a9485;font-weight:600;">📅 Day</td>
                    <td style="padding:3px 0;color:#1a2f45;font-weight:600;">${dayDisplay}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;color:#7a9485;font-weight:600;">⏰ Time</td>
                    <td style="padding:3px 0;color:#1a2f45;">${timeDisplay}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;color:#7a9485;font-weight:600;">🎂 Age</td>
                    <td style="padding:3px 0;color:#1a2f45;">${m.studentAge || "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;color:#7a9485;font-weight:600;">🧑 Student</td>
                    <td style="padding:3px 0;color:#1a2f45;">${m.studentGender || "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;color:#7a9485;font-weight:600;">👨‍🏫 Teacher</td>
                    <td style="padding:3px 0;color:#1a2f45;">${m.teacherGender || "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0 3px;color:#7a9485;font-weight:600;vertical-align:top;">📖 Courses</td>
                    <td style="padding:5px 0 3px;">
                      <div style="display:flex;flex-wrap:wrap;">${coursePills}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");

  return `
    ${sectionHeader(`Family Members (${members.length})`)}
    ${memberRows}`;
}

/* ─── Controller ─────────────────────────────────────────────────── */
async function bookTrial(req, res) {
  const {
    firstName, lastName, email, whatsapp,
    countryCode, timezone,
    courses, selectedPkg,
    selectedDay, selectedTime,
    studentAge, studentGender, teacherGender,
    message,
    familyMembers,
  } = req.body;

  const isFamilyPkg = typeof selectedPkg === "string" && selectedPkg.startsWith("f:");

  // ── Validation ────────────────────────────────────────────────────
  // Fields always required
  const baseMissing =
    !firstName || !lastName || !email || !whatsapp || !countryCode || !message;

  // Fields required only for standard (non-family) packages
  const standardMissing = !isFamilyPkg && (
    !timezone ||
    !courses?.length ||
    !selectedDay ||
    !selectedTime ||
    !studentAge || !studentGender || !teacherGender
  );

  // Family packages need at least one complete member
  const familyMissing = isFamilyPkg && (
    !Array.isArray(familyMembers) || familyMembers.length === 0
  );

  if (baseMissing || standardMissing || familyMissing) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const coursesList = isFamilyPkg ? "" : resolveCourses(courses);
  const day         = DAY_LABEL[selectedDay] ?? selectedDay ?? "—";
  const time        = selectedTime ?? "—";
  const waLink      = whatsappLink(whatsapp) || "#";
  const now         = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Cairo", dateStyle: "full", timeStyle: "short",
  });

  // ── Email HTML ────────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#eef4ee;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ee;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(28,58,46,0.12);">

        <!-- Header -->
        <tr>
          <td colspan="2" style="background:linear-gradient(135deg,#1C3A2E 0%,#245038 100%);padding:32px 28px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">${isFamilyPkg ? "👨‍👩‍👧‍👦" : "📚"}</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
              ${isFamilyPkg ? "New Family Plan Booking" : "New Trial Booking"}
            </h1>
            <p style="margin:6px 0 0;color:#a8d5b5;font-size:13px;">${now} · Cairo Time</p>
          </td>
        </tr>

        <!-- Student badge -->
        <tr>
          <td colspan="2" style="background:#ffffff;padding:20px 28px 8px;">
            <div style="display:inline-block;background:#e8f5ec;border:1px solid #b8ddc4;border-radius:50px;padding:8px 20px;">
              <span style="font-size:20px;">${isFamilyPkg ? "👪" : "👤"}</span>
              <span style="font-size:15px;font-weight:700;color:#1C3A2E;margin-left:8px;">${firstName} ${lastName}</span>
            </div>
          </td>
        </tr>

        <!-- Data -->
        <tr>
          <td colspan="2" style="background:#ffffff;padding:8px 12px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e3ede6;">

              ${sectionHeader("Contact")}
              ${row("📧", "Email",    `<a href="mailto:${email}" style="color:#1C7A45;text-decoration:none;font-weight:600;">${email}</a>`)}
              ${row("💬", "WhatsApp", `<a href="${waLink}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:6px 16px;border-radius:50px;">💬 ${whatsapp} → Open Chat</a>`)}
              ${row("🌍", "Country",  countryCode)}
              ${isFamilyPkg
                ? row("🕐", "Timezone", "<em style='color:#7a9485;'>Per member below</em>")
                : row("🕐", "Timezone", timezone)
              }

              ${isFamilyPkg
                ? familyMembersHtml(familyMembers)
                : `
                  ${sectionHeader("Courses & Package")}
                  ${row("📖", "Courses",
                    `<div style="display:flex;flex-wrap:wrap;gap:6px;">
                      ${coursesList.split(" · ").map(c =>
                        `<span style="background:#e8f5ec;color:#1C3A2E;border:1px solid #b8ddc4;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${c}</span>`
                      ).join("")}
                    </div>`
                  )}
                `
              }

              ${sectionHeader("Package")}
              ${row("📦", "Package", packageHtml(selectedPkg))}

              ${!isFamilyPkg ? `
              ${sectionHeader("Schedule")}
              ${row("📅", "Preferred Day",  `<strong style="font-size:15px;">${day}</strong>`)}
              ${row("⏰", "Preferred Time", `<strong style="font-size:15px;">${time}</strong>`)}

              ${sectionHeader("Student Details")}
              ${row("🎂", "Age",             studentAge)}
              ${row("🧑", "Student Gender",  studentGender)}
              ${row("👨‍🏫", "Teacher Gender", teacherGender)}
              ` : ""}

              ${sectionHeader("Goals & Notes")}
              <tr>
                <td colspan="2" style="padding:14px 16px;background:#f9fbf9;font-size:14px;color:#1a2f45;line-height:1.6;font-style:italic;">
                  "${message}"
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td colspan="2" style="background:#f4f9f5;padding:18px 28px;text-align:center;border-top:1px solid #dce8df;">
            <p style="margin:0;font-size:12px;color:#7a9485;">
              Auto-generated by <strong style="color:#1C3A2E;">Nibras Network</strong> booking system.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const ackHtml    = trialAcknowledgmentHtml(`${firstName} ${lastName}`.trim());
  const ackSubject = trialAcknowledgmentSubject();

  try {
    await transporter.sendMail({
      from:    `"Nibras Network" <${process.env.EMAIL_USER}>`,
      to:      process.env.RECEIVER_EMAIL,
      subject: `📚 Trial Booking — ${firstName} ${lastName}`,
      html,
    });

    // Acknowledgment to the person who booked
    try {
      await transporter.sendMail({
        from:    `"Nibras Network" <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: ackSubject,
        html:    ackHtml,
      });
    } catch (ackErr) {
      console.error("bookTrial acknowledgment email error:", ackErr);
    }

    // MongoDB save
    try {
      if (mongoose.connection.readyState === 1) {
        await TrialBooking.create({
          firstName,
          lastName,
          email,
          whatsapp,
          countryCode,
          timezone:      isFamilyPkg ? null : timezone,
          courses:       isFamilyPkg ? [] : (Array.isArray(courses) ? courses : [courses]),
          familyMembers: isFamilyPkg ? familyMembers : [],
          selectedPkg,
          selectedDay:   isFamilyPkg ? null : selectedDay,
          selectedTime:  isFamilyPkg ? null : selectedTime,
          studentAge:    isFamilyPkg ? null : studentAge,
          studentGender: isFamilyPkg ? null : studentGender,
          teacherGender: isFamilyPkg ? null : teacherGender,
          message,
        });
      }
    } catch (dbErr) {
      console.error("bookTrial MongoDB save error:", dbErr);
    }

    res.status(200).json({ success: true, message: "Trial booking sent successfully." });
  } catch (err) {
    console.error("bookTrial mailer error:", err);
    res.status(500).json({ error: "Failed to send email. Please try again." });
  }
}

module.exports = { bookTrial };