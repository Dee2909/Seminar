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
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    submitted: { type: Boolean, default: false },
    file_name: { type: String, default: '' },
    code: { type: String, default: '' }, // Store the actual code
    language: { type: String, default: 'c' }, // 'c' or 'python'
    score: { type: Number, default: 0 },
    autoScore: { type: Number, default: 0 }, // Score from automatic test cases
    manualScore: { type: Number, default: 0 }, // Manual score from admin
    testResults: [{
      testCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' },
      passed: { type: Boolean, default: false },
      actualOutput: { type: String, default: '' },
      points: { type: Number, default: 0 }
    }],
    totalTests: { type: Number, default: 0 },
    passedTests: { type: Number, default: 0 },
    recording_file: { type: String, default: '' }
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
        questionsSkipped: { type: Number, default: 0 },
        recording_file: { type: String, default: '' }
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
