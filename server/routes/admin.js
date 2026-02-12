const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const Team = require('../models/Team');
const Question = require('../models/Question');
const Project = require('../models/Project');
const { setAuthCookie, authAdmin } = require('../utils/auth');

const router = express.Router();

// --- Multer Setup for Project PDFs ---
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    cb(null, `project_${Date.now()}_${file.originalname}`);
  }
});

const uploadProject = multer({ storage });

// --- Project Management Routes ---

router.get('/admin/projects', authAdmin, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/projects', authAdmin, uploadProject.single('file'), async (req, res) => {
  try {
    const { title, timeLimit, description } = req.body;

    // Either description or file is good, but let's at least expect a title
    const project = new Project({
      title,
      timeLimit: Number(timeLimit) || 0,
      description: description || '',
      pdf_file: req.file ? req.file.filename : ''
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/projects/:id', authAdmin, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    setAuthCookie(res, { id: admin._id.toString(), role: 'admin' });
    res.json({ _id: admin._id, username: admin.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/me
router.get('/admin/me', authAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ _id: admin._id, username: admin.username, role: 'admin' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/teams
router.get('/admin/teams', authAdmin, async (req, res) => {
  try {
    const teams = await Team.find().sort({ createdAt: 1 });
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/teams/:id
router.get('/admin/teams/:id', authAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/teams/:id
router.delete('/admin/teams/:id', authAdmin, async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Team removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/score-project
router.post('/admin/score-project', authAdmin, async (req, res) => {
  try {
    const { teamId, score } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    team.project = {
      ...team.project.toObject?.() || team.project,
      score: Number(score) || 0
    };
    team.recalculateFinalScore();
    await team.save();

    res.json({ message: 'Project scored', final_score: team.final_score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const Quiz = require('../models/Quiz');

// POST /api/admin/create-quiz
router.post('/admin/create-quiz', authAdmin, async (req, res) => {
  try {
    const { title, quiz_type, totalQuestions, questionBankSize, timeLimit } = req.body;
    const quiz = new Quiz({
      title,
      quiz_type,
      totalQuestions,
      questionBankSize,
      timeLimit
    });
    await quiz.save();
    res.status(201).json({ message: 'Quiz created', quizId: quiz._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/quizzes
router.get('/admin/quizzes', authAdmin, async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    // For each quiz, count the questions to check if it's "activatable"
    const results = await Promise.all(quizzes.map(async (q) => {
      const count = await Question.countDocuments({ quizId: q._id });
      return {
        ...q.toObject(),
        uploadedQuestions: count,
        isSufficient: count >= q.totalQuestions
      };
    }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/add-question-v2 (Multipart for images)
const uploadQuestionMedia = multer({ storage: storage });
router.post('/admin/add-question-v2', authAdmin, uploadQuestionMedia.fields([
  { name: 'qImg', maxCount: 1 },
  { name: 'oAImg', maxCount: 1 },
  { name: 'oBImg', maxCount: 1 },
  { name: 'oCImg', maxCount: 1 },
  { name: 'oDImg', maxCount: 1 }
]), async (req, res) => {
  try {
    const { quizId, question, optionA, optionB, optionC, optionD, correct_answer } = req.body;

    const q = new Question({
      quizId,
      question,
      options: { A: optionA, B: optionB, C: optionC, D: optionD },
      correct_answer,
      question_image: req.files['qImg'] ? req.files['qImg'][0].filename : '',
      options_images: {
        A: req.files['oAImg'] ? req.files['oAImg'][0].filename : '',
        B: req.files['oBImg'] ? req.files['oBImg'][0].filename : '',
        C: req.files['oCImg'] ? req.files['oCImg'][0].filename : '',
        D: req.files['oDImg'] ? req.files['oDImg'][0].filename : '',
      }
    });

    await q.save();
    res.status(201).json({ message: 'Question with media added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/add-question
router.post('/admin/add-question', authAdmin, async (req, res) => {
  try {
    const { quizId, questions } = req.body;

    if (questions && Array.isArray(questions)) {
      // Bulk add
      const docs = questions.map(q => ({ ...q, quizId }));
      await Question.insertMany(docs);
      return res.status(201).json({ message: `${questions.length} questions added` });
    }

    const { quiz_type, question, options, correct_answer } = req.body;
    const q = new Question({
      quizId,
      quiz_type,
      question,
      options,
      correct_answer
    });
    await q.save();
    res.status(201).json({ message: 'Question added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/questions (generic or by quizId)
router.get('/admin/questions', authAdmin, async (req, res) => {
  try {
    const { quizId, type } = req.query;
    let filter = {};
    if (quizId) filter.quizId = quizId;
    else if (type) filter.quiz_type = type;

    const questions = await Question.find(filter);
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/quizzes/:id/questions
router.get('/admin/quizzes/:id/questions', authAdmin, async (req, res) => {
  try {
    const questions = await Question.find({ quizId: req.params.id });
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/quizzes/:id
router.delete('/admin/quizzes/:id', authAdmin, async (req, res) => {
  try {
    const quizId = req.params.id;
    await Quiz.findByIdAndDelete(quizId);
    await Question.deleteMany({ quizId });
    res.json({ message: 'Quiz and its questions deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

