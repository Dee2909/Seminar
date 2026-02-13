const express = require('express');
const { exec } = require('child_process');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Team = require('../models/Team');
const SystemConfig = require('../models/SystemConfig');
const Project = require('../models/Project');
const TestCase = require('../models/TestCase');
const Admin = require('../models/Admin');
const { setAuthCookie, clearAuthCookie, authTeam, authAny } = require('../utils/auth');

const router = express.Router();

// Helper function to run code with input
function runCodeWithInput(code, language, input) {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const filenames = {
      c: { source: path.join(tempDir, `test_${id}.c`), exec: path.join(tempDir, `test_${id}.out`) },
      python: { source: path.join(tempDir, `test_${id}.py`) }
    };

    const current = filenames[language];
    if (!current) {
      return reject(new Error('Unsupported language'));
    }

    try {
      fs.writeFileSync(current.source, code);

      let command = '';
      if (language === 'c') {
        command = `gcc ${current.source} -o ${current.exec} && echo "${input}" | ${current.exec}`;
      } else {
        command = `echo "${input}" | python3 ${current.source}`;
      }

      exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        // Cleanup files
        try {
          if (fs.existsSync(current.source)) fs.unlinkSync(current.source);
          if (current.exec && fs.existsSync(current.exec)) fs.unlinkSync(current.exec);
        } catch (cleanupErr) {
          console.error('Cleanup error:', cleanupErr);
        }

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
}


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
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating uploads directory (routes):', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}
console.log('✅ Multer configured to save in:', uploadsDir);

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

// GET /api/me (Shared check)
router.get('/me', authAny, async (req, res) => {
  try {
    if (req.user.role === 'team') {
      const team = await Team.findById(req.user.id);
      if (!team) return res.status(404).json({ message: 'Team not found' });
      return res.json({ ...team.toObject(), role: 'team' });
    } else if (req.user.role === 'admin') {
      const admin = await Admin.findById(req.user.id);
      if (!admin) return res.status(404).json({ message: 'Admin not found' });
      return res.json({ ...admin.toObject(), role: 'admin' });
    }
    res.status(401).json({ message: 'Unknown role' });
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
router.post('/team/quiz', authTeam, upload.single('recording'), async (req, res) => {
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
      violations: Number(violations) || 0,
      recording_file: req.file ? req.file.filename : ''
    };

    const quizIdx = team.quizResults.findIndex(r => r.quizId && r.quizId.toString() === quizId);
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
router.post('/team/upload', authTeam, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'recording', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files['file']) return res.status(400).json({ message: 'No file uploaded' });

    const team = await Team.findById(req.user.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Read the file content
    const sourceFile = req.files['file'][0];
    const recordingFile = req.files['recording'] ? req.files['recording'][0] : null;

    const filePath = path.join(uploadsDir, sourceFile.filename);
    const code = fs.readFileSync(filePath, 'utf8');

    // Determine language from file extension
    const ext = path.extname(sourceFile.filename).toLowerCase();
    const language = ext === '.c' ? 'c' : ext === '.py' ? 'python' : 'c';

    team.project = {
      ...(team.project?.toObject?.() || team.project || {}),
      projectId: req.body.projectId, // Store projectId if provided
      submitted: true,
      file_name: sourceFile.filename,
      code: code,
      language: language,
      recording_file: recordingFile ? recordingFile.filename : (team.project?.recording_file || '')
    };

    // Add violations from request body
    if (req.body.violations) {
      team.violations = (team.violations || 0) + Number(req.body.violations);
    }

    console.log(`⬆️ Project submitted by team ${team.team_name}:`, sourceFile.filename);
    if (recordingFile) console.log('📹 Recording file saved:', recordingFile.filename);

    team.recalculateFinalScore();
    await team.save();

    res.json({ message: 'File uploaded', file_name: sourceFile.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/team/projects/:projectId/testcases - Get visible test cases for a project
router.get('/team/projects/:projectId/testcases', authTeam, async (req, res) => {
  try {
    // Only return non-hidden test cases
    const testCases = await TestCase.find({
      projectId: req.params.projectId,
      isHidden: false
    }).select('input expectedOutput points description');

    res.json(testCases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/team/test-code - Run code against test cases
router.post('/team/test-code', authTeam, async (req, res) => {
  const { code, language, projectId } = req.body;

  if (!code || !projectId) {
    return res.status(400).json({ message: 'Code and projectId are required' });
  }

  try {
    // Get all test cases for this project
    const testCases = await TestCase.find({ projectId }).sort({ createdAt: 1 });

    if (testCases.length === 0) {
      return res.json({
        message: 'No test cases available',
        results: [],
        totalScore: 0,
        passed: 0,
        total: 0
      });
    }

    const results = [];
    let totalScore = 0;
    let passedCount = 0;

    // Run code against each test case
    for (const testCase of testCases) {
      const result = await runCodeWithInput(code, language, testCase.input);

      const actualOutput = result.output.trim();
      const expectedOutput = testCase.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;

      if (passed) {
        totalScore += testCase.points;
        passedCount++;
      }

      results.push({
        testCaseId: testCase._id,
        description: testCase.description,
        input: testCase.isHidden ? '[Hidden]' : testCase.input,
        expectedOutput: testCase.isHidden ? '[Hidden]' : expectedOutput,
        actualOutput: actualOutput,
        passed: passed,
        points: passed ? testCase.points : 0,
        isHidden: testCase.isHidden
      });
    }

    res.json({
      results,
      totalScore,
      passed: passedCount,
      total: testCases.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error running tests', error: err.message });
  }
});

// POST /api/team/submit-with-tests - Submit code and run all tests
router.post('/team/submit-with-tests', authTeam, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const team = await Team.findById(req.user.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Read the file content
    const filePath = path.join(uploadsDir, req.file.filename);
    const code = fs.readFileSync(filePath, 'utf8');

    // Determine language from file extension
    const ext = path.extname(req.file.filename).toLowerCase();
    const language = ext === '.c' ? 'c' : ext === '.py' ? 'python' : 'c';

    // Get project ID from request body
    const projectId = req.body.projectId;

    // Run all test cases
    const testCases = await TestCase.find({ projectId }).sort({ createdAt: 1 });
    const testResults = [];
    let autoScore = 0;
    let passedTests = 0;

    for (const testCase of testCases) {
      const result = await runCodeWithInput(code, language, testCase.input);
      const actualOutput = result.output.trim();
      const expectedOutput = testCase.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;

      if (passed) {
        autoScore += testCase.points;
        passedTests++;
      }

      testResults.push({
        testCaseId: testCase._id,
        passed: passed,
        actualOutput: actualOutput,
        points: passed ? testCase.points : 0
      });
    }

    // Update team project with results
    team.project = {
      ...team.project.toObject?.() || team.project,
      submitted: true,
      projectId: projectId, // Store projectId
      file_name: req.file.filename,
      code: code,
      language: language,
      autoScore: autoScore,
      manualScore: 0,
      score: autoScore,
      testResults: testResults,
      totalTests: testCases.length,
      passedTests: passedTests
    };

    // Add violations from request body
    if (req.body.violations) {
      team.violations = (team.violations || 0) + Number(req.body.violations);
    }

    team.recalculateFinalScore();
    await team.save();

    res.json({
      message: 'Code submitted and tested',
      autoScore,
      passedTests,
      totalTests: testCases.length,
      file_name: req.file.filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
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
  const { code, language, input } = req.body;
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

    // Command construction - ALWAYS pipe input (or empty newline)
    const safeInput = input ? input.replace(/"/g, '\\"') : '';

    if (language === 'c') {
      command = `gcc ${current.source} -o ${current.exec} && echo "${safeInput}" | ${current.exec}`;
    } else {
      command = `echo "${safeInput}" | python3 ${current.source}`;
    }

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      // Cleanup files
      if (fs.existsSync(current.source)) fs.unlinkSync(current.source);
      if (current.exec && fs.existsSync(current.exec)) fs.unlinkSync(current.exec);

      if (error) {
        const msg = stderr || stdout || (error.killed ? 'Execution Timed Out (Possible Infinite Loop or Wait for Input)' : 'Execution Error');
        return res.json({
          output: msg,
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

