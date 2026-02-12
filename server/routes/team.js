const express = require('express');
const { exec } = require('child_process');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Team = require('../models/Team');
const SystemConfig = require('../models/SystemConfig');
const Project = require('../models/Project');
const { setAuthCookie, clearAuthCookie, authTeam } = require('../utils/auth');

const router = express.Router();

// GET /api/team/project-config
router.get('/team/project-config', authTeam, async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'project_pdf' });
    res.json(config || { value: '' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- File upload setup ---
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const upload = multer({ storage });

// --- Auth + team endpoints ---

// POST /api/team/signup
router.post('/team/signup', async (req, res) => {
  try {
    const { team_name, password, members } = req.body;
    if (!team_name || !password || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: 'team_name, password and members are required' });
    }

    const existing = await Team.findOne({ team_name });
    if (existing) return res.status(409).json({ message: 'Team name already taken' });

    const password_hash = await bcrypt.hash(password, 10);

    const team = new Team({
      team_name,
      password_hash,
      members
    });
    await team.save();

    return res.status(201).json({ message: 'Team registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

// GET /api/team/questions
router.get('/team/questions', authTeam, async (req, res) => {
  try {
    const { quizId } = req.query;
    const questions = await Question.find({ quizId }).sort({ createdAt: 1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/team/quiz/:id
router.get('/team/quiz/:id', authTeam, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/team/login
router.post('/team/login', async (req, res) => {
  try {
    const { team_name, password } = req.body;
    const team = await Team.findOne({ team_name });
    if (!team) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, team.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const loginTime = new Date();
    team.lastLoginAt = loginTime;
    team.lastIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await team.save();

    setAuthCookie(res, {
      id: team._id.toString(),
      role: 'team',
      lastLoginAt: loginTime.getTime()
    });

    res.json({
      _id: team._id,
      team_name: team.team_name,
      members: team.members,
      final_score: team.final_score,
      quizResults: team.quizResults,
      project: team.project
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/team/me
router.get('/team/me', authTeam, async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    res.json({
      _id: team._id,
      team_name: team.team_name,
      members: team.members,
      final_score: team.final_score,
      quizResults: team.quizResults,
      project: team.project
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/team/active-quizzes
router.get('/team/active-quizzes', authTeam, async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    const quizzes = await Quiz.find().sort({ createdAt: 1 });

    const results = await Promise.all(quizzes.map(async (q) => {
      const qCount = await Question.countDocuments({ quizId: q._id });
      const teamResult = team.quizResults.find(r => r.quizId && r.quizId.toString() === q._id.toString());
      const minNeeded = q.totalQuestions || 1;
      const isSufficient = qCount >= minNeeded;

      // Ensure it shows if sufficient OR completed
      // if (!isSufficient && (!teamResult || !teamResult.completed)) return null;

      const resultObj = q.toObject();
      return {
        ...resultObj,
        completed: !!(teamResult && teamResult.completed),
        score: teamResult ? teamResult.score : 0
      };
    }));

    res.json(results.filter(q => q !== null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/team/quiz
router.post('/team/quiz', authTeam, async (req, res) => {
  try {
    const { quizId, score, time_remaining, questionsAnswered, questionsSkipped, violations } = req.body;
    const team = await Team.findById(req.user.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const newResult = {
      quizId,
      completed: true,
      score: Number(score) || 0,
      time_remaining: Number(time_remaining) || 0,
      questionsAnswered: Number(questionsAnswered) || 0,
      questionsSkipped: Number(questionsSkipped) || 0,
      violations: Number(violations) || 0
    };

    const quizIdx = team.quizResults.findIndex(r => r.quizId.toString() === quizId);
    if (quizIdx > -1) {
      team.quizResults[quizIdx] = newResult;
    } else {
      team.quizResults.push(newResult);
    }

    // Accumulate total violations
    team.violations = (team.violations || 0) + (Number(violations) || 0);

    team.recalculateFinalScore();
    await team.save();

    res.json({ message: 'Quiz result saved', final_score: team.final_score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/team/upload
router.post('/team/upload', authTeam, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const team = await Team.findById(req.user.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    team.project = {
      ...team.project.toObject?.() || team.project,
      submitted: true,
      file_name: req.file.filename
    };
    team.recalculateFinalScore();
    await team.save();

    res.json({ message: 'File uploaded', file_name: req.file.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET /api/team/projects
router.get('/team/projects', authTeam, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// GET /api/public-quizzes
router.get('/public-quizzes', async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: 1 });
    const results = await Promise.all(quizzes.map(async (q) => {
      const qCount = await Question.countDocuments({ quizId: q._id });
      return {
        ...q.toObject(),
        isSufficient: qCount >= q.totalQuestions
      };
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const teams = await Team.find().sort({ final_score: -1, updatedAt: 1 });
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/logout
// POST /api/team/run-code
router.post('/team/run-code', authTeam, async (req, res) => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ output: 'No code provided' });

  const id = Date.now();
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const filenames = {
    c: { source: path.join(tempDir, `run_${id}.c`), exec: path.join(tempDir, `run_${id}.out`) },
    python: { source: path.join(tempDir, `run_${id}.py`) }
  };

  const current = filenames[language];
  if (!current) return res.status(400).json({ output: 'Unsupported language' });

  try {
    fs.writeFileSync(current.source, code);

    let command = '';
    if (language === 'c') {
      command = `gcc ${current.source} -o ${current.exec} && ${current.exec}`;
    } else {
      command = `python3 ${current.source}`;
    }

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      // Cleanup files
      if (fs.existsSync(current.source)) fs.unlinkSync(current.source);
      if (current.exec && fs.existsSync(current.exec)) fs.unlinkSync(current.exec);

      if (error) {
        return res.json({
          output: stderr || stdout || 'Execution Error',
          isError: true
        });
      }
      res.json({ output: stdout || 'Program executed successfully (no output).' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ output: 'Server error during execution' });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
});

module.exports = router;

