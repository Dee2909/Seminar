const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    quiz_type: { type: String }, // Optional, can be derived from Quiz
    question: { type: String, required: true },
    question_image: { type: String, default: '' },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true }
    },
    options_images: {
      A: { type: String, default: '' },
      B: { type: String, default: '' },
      C: { type: String, default: '' },
      D: { type: String, default: '' }
    },
    correct_answer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    position: { type: Number }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', QuestionSchema);

