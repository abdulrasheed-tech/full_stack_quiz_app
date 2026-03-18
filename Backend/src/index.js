import express from "express";
import "dotenv/config";
import connectDB from "./db/db.js";
import cors from "cors"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Chapters from "./models/chapter.model.js"
import User from "./models/user.model.js"
import TestResult from "./models/testResult.model.js"

const app = express();       
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const publicPath = path.join(__dirname, "../public")
console.log("Static files path:", publicPath)
app.use(express.static(publicPath))

const port = process.env.PORT || process.env.port || 5000;
console.log("Starting server on port:", port)

// health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", port })
})

// chapter api
app.get("/chapters", async (req, res) => {
  try {
    const allChapters = await Chapters.find()
    res.json(allChapters)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/quiz/:chapterId", async (req, res) => {
  try {
    const chapter = await Chapters.findById(req.params.chapterId)
    res.json(chapter.mcqs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// signup route
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = await User.create({ name, email, password })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email, password })

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    res.json({
      message: "Login success",
      _id: user._id,
      name: user.name
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// submit result
app.post("/submit-test", async (req, res) => {
  try {
    const { user, chapter, totalQuestions, attempted, correct, wrong, score } = req.body
    const result = await TestResult.create({
      user, chapter, totalQuestions, attempted, correct, wrong, score
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is live on port ${port}`);
  connectDB();
});
