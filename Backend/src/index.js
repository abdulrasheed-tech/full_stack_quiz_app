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
app.use(express.static(path.join(__dirname, "../public")))
const port = process.env.PORT || process.env.port || 5000;


// chapter api
app.get("/chapters", async (req, res) => {

  const allChapters = await Chapters.find()

  res.json(allChapters)

})
app.get("/quiz/:chapterId", async (req, res) => {

  const chapter = await Chapters.findById(req.params.chapterId)

  res.json(chapter.mcqs)

})
// signup route
app.post("/signup", async (req, res) => {

  const { name, email, password } = req.body

  const user = await User.create({
    name,
    email,
    password
  })

  res.json(user)

})

//login testing
app.post("/login", async (req, res) => {

  const { email, password } = req.body

  const user = await User.findOne({ email, password })

  if(!user){
    return res.send("Invalid credentials")
  }

  res.json({
  message: "Login success",
  _id: user._id,
  name: user.name
})

})
// submit result
app.post("/submit-test", async (req, res) => {

  const { user, chapter, totalQuestions, attempted, correct, wrong, score } = req.body

  const result = await TestResult.create({
    user,
    chapter,
    totalQuestions,
    attempted,
    correct,
    wrong,
    score
  })

  res.json(result)

})
app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on port ${port}`);
  connectDB();
});
