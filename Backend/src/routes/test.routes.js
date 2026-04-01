import { Router } from "express";
import mongoose from "mongoose";
import Chapter from "../models/chapter.model.js";
import TestResult from "../models/testResult.model.js";

const router = Router();

// ===== SUBMIT TEST (Server-Side Scoring) =====
router.post("/submit-test", async (req, res, next) => {
  try {
    const { user, chapter, answers } = req.body;

    // Input validation
    if (!user || !chapter || !answers) {
      return res.status(400).json({ error: "user, chapter, and answers are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(user) || !mongoose.Types.ObjectId.isValid(chapter)) {
      return res.status(400).json({ error: "Invalid user or chapter ID" });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "answers must be an array" });
    }

    // Fetch the chapter to get correct answers
    const chapterDoc = await Chapter.findById(chapter);
    if (!chapterDoc) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    const totalQuestions = chapterDoc.mcqs.length;
    const attempted = answers.length;
    let correct = 0;
    const wrongAnswerMcqIds = [];

    // Server-side scoring — compare answers against DB
    answers.forEach((ans) => {
      const mcq = chapterDoc.mcqs.find(
        (q) => q._id.toString() === ans.questionId
      );
      if (mcq) {
        if (mcq.correctOption === ans.selectedOption) {
          correct++;
        } else {
          wrongAnswerMcqIds.push(mcq._id);
        }
      }
    });

    const wrong = attempted - correct;
    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

    const result = await TestResult.create({
      user,
      chapter,
      totalQuestions,
      attempted,
      correct,
      wrong,
      score,
      wrongAnswerMcqIds,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// ===== GET REVISION MCQs =====
router.get("/revision-mcqs/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Fetch all test results for this user that have wrong answers
    const results = await TestResult.find({
      user: userId,
      wrongAnswerMcqIds: { $exists: true, $ne: [] },
    }).sort({ createdAt: -1 });

    if (!results.length) {
      return res.json([]);
    }

    // Collect unique wrong MCQ IDs
    const wrongMcqIdSet = new Set();
    results.forEach((r) => {
      r.wrongAnswerMcqIds.forEach((id) => wrongMcqIdSet.add(id.toString()));
    });

    const wrongMcqIds = [...wrongMcqIdSet];

    // Fetch chapters that contain these MCQs
    const chapters = await Chapter.find({
      "mcqs._id": { $in: wrongMcqIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    // Extract the matching MCQs
    const revisionMcqs = [];
    chapters.forEach((ch) => {
      ch.mcqs.forEach((mcq) => {
        if (wrongMcqIds.includes(mcq._id.toString())) {
          revisionMcqs.push({
            _id: mcq._id,
            question: mcq.question,
            options: mcq.options,
            correctOption: mcq.correctOption,
            chapterTitle: ch.title,
          });
        }
      });
    });

  res.json(revisionMcqs);
  } catch (err) {
    next(err);
  }
});

// ===== REMOVE CORRECT REVISION MCQ =====
router.delete("/revision-mcqs/:userId/:mcqId", async (req, res, next) => {
  try {
    const { userId, mcqId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(mcqId)) {
      return res.status(400).json({ error: "Invalid user or MCQ ID" });
    }

    // Remove the MCQ ID from all test results for this user
    await TestResult.updateMany(
      { user: userId },
      { $pull: { wrongAnswerMcqIds: new mongoose.Types.ObjectId(mcqId) } }
    );

    res.json({ success: true, message: "MCQ removed from revision list" });
  } catch (err) {
    next(err);
  }
});

export default router;
