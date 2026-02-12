const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema(
  {
    completed: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    time_remaining: { type: Number, default: 0 }
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    submitted: { type: Boolean, default: false },
    file_name: { type: String, default: '' },
    score: { type: Number, default: 0 }
  },
  { _id: false }
);

const TeamSchema = new mongoose.Schema(
  {
    team_name: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    members: [{ type: String, required: true }],
    quizResults: [
      {
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
        completed: { type: Boolean, default: false },
        score: { type: Number, default: 0 },
        time_remaining: { type: Number, default: 0 },
        violations: { type: Number, default: 0 },
        questionsAnswered: { type: Number, default: 0 },
        questionsSkipped: { type: Number, default: 0 }
      }
    ],
    project: { type: ProjectSchema, default: () => ({}) },
    violations: { type: Number, default: 0 }, // Total violations
    lastLoginAt: { type: Date },
    lastIp: { type: String },
    final_score: { type: Number, default: 0 }
  },
  { timestamps: true }
);

TeamSchema.methods.recalculateFinalScore = function () {
  const quizTotal = this.quizResults.reduce((sum, q) => sum + (q.score || 0), 0);
  this.final_score = quizTotal + (this.project?.score || 0);
};

module.exports = mongoose.model('Team', TeamSchema);

