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
  // ── Quran Programs ──────────────────────────────────────────────
  "noorani-qaida":            "Noorani Qaida (Foundation)",
  "quran-recitation":         "Quran Recitation (Tilawah)",
  "quran-memorization":       "Quran Memorization (Hifz)",
  "tajweed":                  "Tajweed (Perfect Recitation)",
  "qiraat":                   "Qira'at (Variant Recitations)",
  "quran-tafsir":             "Tafsir (Quran Explanation)",
  "quran-translation":        "Quran with Translation",

  // ── Arabic Language ─────────────────────────────────────────────
  "noor-al-bayan":            "Noor Al-Bayan (Arabic Foundation)",
  "arabic-beginners":         "Arabic for Beginners",
  "quranic-arabic":           "Quranic Arabic",
  "conversational-arabic":    "Conversational Arabic",
  "classical-arabic":         "Classical Arabic",
  "modern-standard-arabic":   "Modern Standard Arabic (MSA)",

  // ── Islamic Studies ─────────────────────────────────────────────
  "islamic-general":          "Islamic General (Comprehensive)",
  "aqeedah":                  "Aqeedah (Islamic Creed)",
  "fiqh":                     "Fiqh (Islamic Jurisprudence)",
  "hadith":                   "Hadith Studies",
  "seerah":                   "Seerah (Prophet's Biography)",
  "islamic-tafsir":           "Tafsir (Quran Interpretation)",

  // ── Kids Programs ────────────────────────────────────────────────
  "kids-programs#by-age":              "Kids: By Age",
  "kids-programs#quran":               "Kids: Quran Learning",
  "kids-programs#arabic":              "Kids: Arabic Language",
  "kids-programs#islamic":             "Kids: Islamic Studies",
  "kids-programs#goals":               "Kids: Learning Goals",
  "kids-programs#parent":              "Kids: Parent Zone",

  // ── Special Programs ─────────────────────────────────────────────
  "new-muslims-track":              "New Muslims Track",
  "family-packages":                "Family Packages (Save 20–30%)",
  "special-needs-support":          "Special Needs Support",
  "intensive-programs":             "Intensive Programs",
  "exam-preparation":               "Exam & Certification Preparation",
  "parent-guided-programs":         "Parent-Guided Programs",
  "ijazah-pathway":                 "Ijazah Pathway",
  "teacher-certification":          "Teacher Certification",
  "corporate-training":             "Corporate Training",
};

// دالة مساعدة لتنصيص النص
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// دالة محسنة لتحويل الكورسات مع أيقونات
function resolveCourses(courses) {
  const list = Array.isArray(courses) ? courses : [courses];
  return list.map(href => {
    const key = href.replace(/^.*\//, "");
    const label = COURSE_LABELS[key] || href;
    
    // إضافة أيقونة لكل نوع كورس
    let icon = "📖";
    if (key.includes("quran") || key.includes("tajweed") || key.includes("hifz") || key.includes("qiraat") || key.includes("tafsir")) {
      icon = "📿";
    } else if (key.includes("arabic") || key.includes("noor-al-bayan")) {
      icon = "📝";
    } else if (key.includes("kids")) {
      icon = "👧";
    } else if (key.includes("aqeedah") || key.includes("fiqh") || key.includes("hadith") || key.includes("seerah")) {
      icon = "📚";
    } else if (key.includes("new-muslims")) {
      icon = "🕌";
    } else if (key.includes("family")) {
      icon = "👨‍👩‍👧‍👦";
    } else if (key.includes("special-needs")) {
      icon = "🤝";
    } else if (key.includes("intensive")) {
      icon = "⚡";
    } else if (key.includes("exam")) {
      icon = "📝";
    } else if (key.includes("ijazah")) {
      icon = "🎓";
    } else if (key.includes("teacher")) {
      icon = "👨‍🏫";
    } else if (key.includes("corporate")) {
      icon = "🏢";
    }
    
    return { icon, label };
  });
}

// دالة لعرض الكورسات بشكل Badges منظم ومتجاوب
function renderCoursesBadges(courseItems) {
  if (!courseItems || courseItems.length === 0) {
    return `<span style="color:#aaa;font-size:12px;">—</span>`;
  }
  
  let badgesHtml = `
    <style>
      .courses-container {
        max-height: 280px;
        overflow-y: auto;
        padding: 8px;
        background: #f9fbf9;
        border-radius: 12px;
        border: 1px solid #e3ede6;
      }
      .course-badge {
        display: inline-flex;
        align-items: center;
        background: linear-gradient(135deg, #e8f5ec 0%, #d4e8da 100%);
        border: 1px solid #b8ddc4;
        border-radius: 40px;
        padding: 6px 14px;
        margin: 5px;
        font-size: 12px;
        font-weight: 600;
        color: #1C3A2E;
        transition: all 0.1s ease;
        max-width: calc(100% - 20px);
        word-break: break-word;
        white-space: normal;
        line-height: 1.4;
      }
      .badge-icon {
        font-size: 14px;
        margin-right: 6px;
      }
      .courses-header {
        font-size: 11px;
        color: #7a9485;
        margin-bottom: 10px;
        padding: 0 4px 8px 4px;
        border-bottom: 1px solid #e3ede6;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .courses-count {
        background: #1C3A2E;
        color: #fff;
        border-radius: 20px;
        padding: 2px 10px;
        font-size: 11px;
        font-weight: 600;
      }
    </style>
    <div class="courses-container">
      <div class="courses-header">
        <span>📚 البرامج المختارة</span>
        <span class="courses-count">${courseItems.length}</span>
      </div>
      <div>
  `;
  
  courseItems.forEach(course => {
    badgesHtml += `
      <div class="course-badge">
        <span class="badge-icon">${course.icon}</span>
        <span>${escapeHtml(course.label)}</span>
      </div>
    `;
  });
  
  badgesHtml += `
      </div>
    </div>
  `;
  
  return badgesHtml;
}

// دالة لعرض الكورسات بشكل Grid منظم (بديل)
function renderCoursesGrid(courseItems) {
  if (!courseItems || courseItems.length === 0) {
    return `<span style="color:#aaa;font-size:12px;">—</span>`;
  }
  
  const itemsPerRow = 2;
  let rows = [];
  for (let i = 0; i < courseItems.length; i += itemsPerRow) {
    rows.push(courseItems.slice(i, i + itemsPerRow));
  }
  
  let gridHtml = `
    <style>
      .courses-grid-container {
        background: #f9fbf9;
        border-radius: 12px;
        border: 1px solid #e3ede6;
        padding: 12px;
        max-height: 300px;
        overflow-y: auto;
      }
      .courses-grid-header {
        font-size: 11px;
        color: #7a9485;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e3ede6;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .grid-count {
        background: #1C3A2E;
        color: #fff;
        border-radius: 20px;
        padding: 2px 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .course-grid-card {
        background: #ffffff;
        border: 1px solid #d4e2d8;
        border-radius: 10px;
        padding: 8px 10px;
        margin: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .grid-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      .grid-name {
        font-size: 12px;
        font-weight: 600;
        color: #1C3A2E;
        line-height: 1.3;
        word-break: break-word;
      }
      table.courses-grid-table {
        width: 100%;
        border-collapse: collapse;
      }
      @media only screen and (max-width: 480px) {
        .course-grid-card {
          display: block;
          margin: 8px 0;
        }
        .grid-icon {
          display: inline-block;
          margin-right: 6px;
        }
      }
    </style>
    <div class="courses-grid-container">
      <div class="courses-grid-header">
        <span>📚 البرامج المختارة</span>
        <span class="grid-count">${courseItems.length}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" class="courses-grid-table">
  `;
  
  rows.forEach(row => {
    gridHtml += `<tr>`;
    row.forEach(course => {
      gridHtml += `
        <td width="50%" style="padding: 4px;">
          <div class="course-grid-card">
            <span class="grid-icon">${course.icon}</span>
            <span class="grid-name">${escapeHtml(course.label)}</span>
          </div>
        </td>
      `;
    });
    if (row.length < itemsPerRow) {
      gridHtml += `<td width="50%" style="padding: 4px;"></td>`;
    }
    gridHtml += `</tr>`;
  });
  
  gridHtml += `
      </table>
    </div>
  `;
  
  return gridHtml;
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
    const courseItems = (m.courseLabels && m.courseLabels.length)
      ? m.courseLabels.map(label => ({ icon: "📖", label }))
      : resolveCourses(m.courses || []);
    
    const coursesHtml = renderCoursesBadges(courseItems);

    const tzDisplay   = m.timezoneDisplay || m.timezone || "—";
    const dayDisplay  = DAY_LABEL[m.preferredDay] || m.preferredDay || "—";
    const timeDisplay = m.selectedTime || "—";

    return `
      <tr>
        <td colspan="2" style="padding:14px 16px;border-bottom:1px solid #e3ede6;background:${i % 2 === 0 ? "#f9fbf9" : "#ffffff"};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <div style="width:28px;height:28px;border-radius:50%;background:#1C3A2E;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;text-align:center;line-height:28px;">
                    ${i + 1}
                  </div>
                  <span style="font-size:15px;font-weight:700;color:#0e2a1e;">${m.name || "—"}</span>
                </div>
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
                      ${coursesHtml}
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

  // ── Email validation ──────────────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  // ── WhatsApp validation (digits only, 7–15 chars) ─────────────────
  if (whatsapp) {
    const cleanWa = whatsapp.replace(/[\s\-()+]/g, "");
    if (!/^\d{7,15}$/.test(cleanWa)) {
      return res.status(400).json({ error: "Invalid WhatsApp number. Please enter digits only (7–15 digits)." });
    }
  }

  // ── Required fields validation ────────────────────────────────────
  const baseMissing =
    !firstName || !lastName || !email || !whatsapp || !countryCode || !message;

  const standardMissing = !isFamilyPkg && (
    !timezone ||
    !courses?.length ||
    !selectedDay ||
    !selectedTime ||
    !studentAge || !studentGender || !teacherGender
  );

  const familyMissing = isFamilyPkg && (
    !Array.isArray(familyMembers) || familyMembers.length === 0
  );

  if (baseMissing || standardMissing || familyMissing) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // تحضير عرض الكورسات المنظم
  let coursesHtml = '<span style="color:#aaa;">—</span>';
  if (!isFamilyPkg && courses && courses.length > 0) {
    const courseItems = resolveCourses(courses);
    coursesHtml = renderCoursesBadges(courseItems); // يمكن تغييرها إلى renderCoursesGrid حسب الرغبة
  }

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

              ${!isFamilyPkg ? `
                ${sectionHeader("Programs & Courses")}
                <tr>
                  <td colspan="2" style="padding:16px;background:#ffffff;">
                    ${coursesHtml}
                  </td>
                </tr>
              ` : ""}

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

              ${isFamilyPkg ? familyMembersHtml(familyMembers) : ""}

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
    </td>
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