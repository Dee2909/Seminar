const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        quiz_type: { type: String, required: true }, // e.g., 'C', 'Python', 'Custom'
        totalQuestions: { type: Number, required: true },
        questionBankSize: { type: Number, required: true },
        timeLimit: { type: Number, required: true }, // in minutes
        isActive: { type: Boolean, default: false },
        created_at: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Quiz', QuizSchema);
