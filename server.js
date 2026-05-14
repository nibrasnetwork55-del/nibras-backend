const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ── Routes ──
const contactRoute = require("./routes/contact");
const bookTrialRoute = require("./routes/bookTrialRoute");

app.use("/api", contactRoute);
app.use("/api/book-trial", bookTrialRoute);

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});