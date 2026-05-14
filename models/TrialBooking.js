const mongoose = require("mongoose");

const trialBookingSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    whatsapp: String,
    countryCode: String,
    timezone: String,
    courses: [String],
    selectedPkg: String,
    selectedDay: String,
    selectedTime: String,
    studentAge: String,
    studentGender: String,
    teacherGender: String,
    message: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrialBooking", trialBookingSchema);
