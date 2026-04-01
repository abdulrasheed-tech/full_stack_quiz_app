import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chapter",
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  attempted: {
    type: Number,
    required: true,
  },
  correct: {
    type: Number,
    required: true,
  },
  wrong: {
    type: Number,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  wrongAnswerMcqIds: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
}, { timestamps: true });

const TestResult = mongoose.model("TestResult", testResultSchema);
export default TestResult;