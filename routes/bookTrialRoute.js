const express = require("express");
const router = express.Router();
const { bookTrial } = require("../controllers/bookTrial");

router.post("/", bookTrial);

module.exports = router;