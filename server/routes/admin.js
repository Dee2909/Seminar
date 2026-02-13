const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const Team = require('../models/Team');
const Question = require('../models/Question');
const Project = require('../models/Project');
const TestCase = require('../models/TestCase');
const { setAuthCookie, authAdmin } = require('../utils/auth');

const router = express.Router();

// --- Multer Setup for Project PDFs ---
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to upload a file to GridFS
async function uploadToGridFS(filename, req) {
  const gfs = req.app.locals.gfs;
  if (!gfs) return console.error('GridFS not initialized');

  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return;

  const uploadStream = gfs.openUploadStream(filename);
  const readStream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    readStream.pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        console.log(`📦 File synced to MongoDB Cloud: ${filename}`);
        resolve();
      });
  });
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

// POST /admin/projects - Create new project
router.post('/admin/projects', authAdmin, uploadProject.single('file'), async (req, res) => {
  try {
    const { title, timeLimit, description, testCases } = req.body;

    // Either description or file is good, but let's at least expect a title
    const project = new Project({
      title,
      timeLimit: Number(timeLimit) || 0,
      description: description || '',
      pdf_file: req.file ? req.file.filename : ''
    });
    await project.save();

    // Sync to GridFS
    if (req.file) {
      uploadToGridFS(req.file.filename, req).catch(err => console.error('GridFS sync failed:', err));
    }

    // Create Test Cases if any
    if (testCases) {
      try {
        const parsedCases = JSON.parse(testCases);
        if (Array.isArray(parsedCases) && parsedCases.length > 0) {
          const caseDocs = parsedCases.map(tc => ({
            projectId: project._id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            points: Number(tc.points) || 10,
            isHidden: tc.isHidden || false,
            description: tc.description || ''
          }));
          await TestCase.insertMany(caseDocs);
        }
      } catch (e) {
        console.error('Error parsing test cases:', e);
      }
    }

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

// POST /api/admin/teams - Admin creates a new team
router.post('/admin/teams', authAdmin, async (req, res) => {
  try {
    const { team_name, password, members } = req.body;
    const existing = await Team.findOne({ team_name });
    if (existing) return res.status(400).json({ message: 'Team name already taken' });

    const password_hash = await bcrypt.hash(password, 10);
    const team = new Team({ team_name, password_hash, members });
    await team.save();

    res.status(201).json(team);
  } catch (err) {
    console.error(err);
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

// PUT /api/admin/quizzes/:id
router.put('/admin/quizzes/:id', authAdmin, async (req, res) => {
  try {
    const { title, totalQuestions, questionBankSize, timeLimit } = req.body;
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { title, totalQuestions, questionBankSize, timeLimit },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json({ message: 'Quiz updated', quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/questions/:id
router.put('/admin/questions/:id', authAdmin, async (req, res) => {
  try {
    const { question, options, correct_answer } = req.body;
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      { question, options, correct_answer },
      { new: true }
    );
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question updated', question: q });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/questions/:id
router.delete('/admin/questions/:id', authAdmin, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Test Case Management Routes ---

// GET /api/admin/projects/:projectId/testcases
router.get('/admin/projects/:projectId/testcases', authAdmin, async (req, res) => {
  try {
    const testCases = await TestCase.find({ projectId: req.params.projectId }).sort({ createdAt: 1 });
    res.json(testCases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/projects/:projectId/testcases
router.post('/admin/projects/:projectId/testcases', authAdmin, async (req, res) => {
  try {
    const { input, expectedOutput, points, isHidden, description } = req.body;
    const testCase = new TestCase({
      projectId: req.params.projectId,
      input,
      expectedOutput,
      points: points || 10,
      isHidden: isHidden || false,
      description
    });
    await testCase.save();
    res.status(201).json(testCase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/testcases/:id
router.delete('/admin/testcases/:id', authAdmin, async (req, res) => {
  try {
    await TestCase.findByIdAndDelete(req.params.id);
    res.json({ message: 'Test case deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Project Reports Routes ---

// Helper for admin code execution
const runCode = (code, language, input) => {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const filenames = {
      c: { source: path.join(tempDir, `admin_run_${id}.c`), exec: path.join(tempDir, `admin_run_${id}.out`) },
      python: { source: path.join(tempDir, `admin_run_${id}.py`) }
    };

    const current = filenames[language];
    if (!current) return reject(new Error('Unsupported language'));

    try {
      fs.writeFileSync(current.source, code);
      let command = '';
      const safeInput = input ? input.replace(/"/g, '\\"') : '';

      // Always pipe input to prevent hangs
      if (language === 'c') {
        command = `gcc ${current.source} -o ${current.exec} && echo "${safeInput}" | ${current.exec}`;
      } else {
        command = `echo "${safeInput}" | python3 ${current.source}`;
      }

      exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        // Cleanup
        try {
          if (fs.existsSync(current.source)) fs.unlinkSync(current.source);
          if (current.exec && fs.existsSync(current.exec)) fs.unlinkSync(current.exec);
        } catch (e) { console.error('Cleanup error', e); }

        if (error) {
          return resolve({
            output: stderr || stdout || 'Execution Error',
            isError: true
          });
        }
        resolve({ output: stdout || '' });
      });
    } catch (err) {
      reject(err);
    }
  });
};

// POST /api/admin/run-code - specific for admin dashboard testing
router.post('/admin/run-code', authAdmin, async (req, res) => {
  const { code, language, input } = req.body;
  if (!code) return res.status(400).json({ output: 'No code provided' });

  try {
    const result = await runCode(code, language, input);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ output: 'Error executing code: ' + err.message });
  }
});

// GET /api/admin/project-reports - Get all team project submissions with details
router.get('/admin/project-reports', authAdmin, async (req, res) => {
  try {
    const teams = await Team.find({ 'project.submitted': true })
      .select('team_name members project violations final_score')
      .sort({ 'project.autoScore': -1 });

    const reports = teams.map(team => ({
      teamId: team._id,
      teamName: team.team_name,
      members: team.members,
      submitted: team.project.submitted,
      language: team.project.language,
      code: team.project.code || '',
      autoScore: team.project.autoScore || 0,
      manualScore: team.project.manualScore || 0,
      totalScore: team.project.score || 0,
      passedTests: team.project.passedTests || 0,
      totalTests: team.project.totalTests || 0,
      violations: team.violations || 0,
      finalScore: team.final_score
    }));

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/project-reports/:teamId - Get detailed project report for a specific team
router.get('/admin/project-reports/:teamId', authAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    res.json({
      teamId: team._id,
      teamName: team.team_name,
      members: team.members,
      project: team.project,
      violations: team.violations,
      finalScore: team.final_score
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/project-reports/:teamId/manual-score - Update manual score
router.post('/admin/project-reports/:teamId/manual-score', authAdmin, async (req, res) => {
  try {
    const { manualScore } = req.body;
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    team.project.manualScore = Number(manualScore) || 0;
    team.project.score = team.project.autoScore + team.project.manualScore;
    team.recalculateFinalScore();
    await team.save();

    res.json({ message: 'Manual score updated', project: team.project, finalScore: team.final_score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/project-reports/:teamId/retest - Reset project submission for a team (Allow them to resubmit)
router.post('/admin/project-reports/:teamId/retest', authAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Reset project submission details but keep the projectId assignment
    const currentProjectId = team.project ? team.project.projectId : null;

    team.project = {
      submitted: false,
      file_name: '',
      code: '',
      language: 'c',
      score: 0,
      autoScore: 0,
      manualScore: 0,
      testResults: [],
      totalTests: 0,
      passedTests: 0,
      projectId: currentProjectId // Preserve projectId if it exists
    };

    team.recalculateFinalScore();
    await team.save();

    res.json({ message: 'Project submission reset. Team can now resubmit.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});
module.exports = router;
