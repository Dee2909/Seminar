import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';
import {
    Users, FileCode, PlusCircle, CheckCircle,
    ListChecks, Layers, Clock, ListOrdered, CheckCircle2, BarChart, Code, TestTube, RotateCcw, Trash2
} from 'lucide-react';
import { getQuizzes, addQuestion as addQuestionSvc, createQuiz as createQuizSvc, updateQuiz as updateQuizSvc, getQuestions as getQuestionsSvc, updateQuestion as updateQuestionSvc, deleteQuestion as deleteQuestionSvc } from '../services/quizService';
import CodeTerminal from '../components/CodeTerminal';
import { io } from 'socket.io-client';
import { useRef } from 'react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [activeTab, setActiveTab] = useState('projects');
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', totalQuestions: 0, questionBankSize: 0, timeLimit: 0 });
    const [viewingQuizId, setViewingQuizId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [questionEditForm, setQuestionEditForm] = useState({
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        correct_answer: 'A'
    });

    // --- State for New Quiz ---
    const [quizForm, setQuizForm] = useState({
        title: '',
        quiz_type: 'C',
        totalQuestions: 10,
        questionBankSize: 20,
        timeLimit: 10 // 10 minutes for 10 questions
    });

    // --- State for Add Questions ---
    const [selectedQuizId, setSelectedQuizId] = useState('');
    const [questionInputs, setQuestionInputs] = useState([{
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correct_answer: 'A',
        qImg: null,
        oAImg: null,
        oBImg: null,
        oCImg: null,
        oDImg: null
    }]);

    const [projects, setProjects] = useState([]);
    const [projectForm, setProjectForm] = useState({ title: '', timeLimit: 60, description: '' });
    const [newTestCases, setNewTestCases] = useState([]); // Manage test cases during creation
    const [projectFile, setProjectFile] = useState(null);
    const [projectReports, setProjectReports] = useState([]);
    const [selectedProjectForTests, setSelectedProjectForTests] = useState('');
    const [testCases, setTestCases] = useState([]);
    const [testCaseForm, setTestCaseForm] = useState({ input: '', expectedOutput: '', points: 10, isHidden: false, description: '' });
    const [viewCode, setViewCode] = useState(null); // { code: '', language: '', teamName: '' }
    const [isRunning, setIsRunning] = useState(false);

    // --- State for New Team ---
    const [teamForm, setTeamForm] = useState({ team_name: '', password: '', members: [''] });
    const [showTeamModal, setShowTeamModal] = useState(false);

    // Terminal & Socket Refs for Admin
    const adminTerminalRef = useRef(null);
    const adminSocketRef = useRef(null);

    // --- Admin Socket Setup ---
    useEffect(() => {
        const socket = io(API_BASE.replace('/api', ''), {
            withCredentials: true
        });
        adminSocketRef.current = socket;

        socket.on('output', (data) => {
            adminTerminalRef.current?.write(data);
        });

        socket.on('finished', () => {
            setIsRunning(false);
            adminTerminalRef.current?.writeln('\r\n\x1b[33m--- Execution Finished ---\x1b[0m\r\n');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const { user } = useAuth();

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchTeams();
        loadQuizzes();
        fetchProjects();
        fetchProjectReports();
    }, [user, navigate]);

    const fetchProjects = async () => {
        try {
            const res = await axios.get(`${API_BASE}/admin/projects`);
            setProjects(res.data);
        } catch (err) {
            console.error('Failed to load projects', err);
        }
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', projectForm.title);
        formData.append('timeLimit', projectForm.timeLimit);
        formData.append('description', projectForm.description);
        formData.append('testCases', JSON.stringify(newTestCases)); // Send test cases
        if (projectFile) formData.append('file', projectFile);

        try {
            setLoading(true);
            await axios.post(`${API_BASE}/admin/projects`, formData);
            setSuccess('Project added successfully!');
            setProjectForm({ title: '', timeLimit: 60, description: '' });
            setProjectFile(null);
            setNewTestCases([]); // Reset test cases
            fetchProjects();
        } catch (err) {
            setError('Failed to add project');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = async (id) => {
        if (!window.confirm('Remove this project?')) return;
        await axios.delete(`${API_BASE}/admin/projects/${id}`);
        fetchProjects();
    };

    const fetchTeams = async () => {
        try {
            const res = await axios.get(`${API_BASE}/admin/teams`);
            setTeams(res.data);
        } catch (err) {
            console.error('Failed to load teams', err);
        }
    };

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            setLoading(true);
            const members = teamForm.members.filter(m => m.trim() !== '');
            if (!teamForm.team_name || !teamForm.password || members.length === 0) {
                return setError('Team name, password and at least one member are required.');
            }
            await axios.post(`${API_BASE}/admin/teams`, { ...teamForm, members });
            setSuccess('Team created successfully!');
            setTeamForm({ team_name: '', password: '', members: [''] });
            setShowTeamModal(false);
            fetchTeams();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create team');
        } finally {
            setLoading(false);
        }
    };

    const handleMemberChange = (index, value) => {
        const newMembers = [...teamForm.members];
        newMembers[index] = value;
        setTeamForm({ ...teamForm, members: newMembers });
    };

    const addMemberField = () => {
        setTeamForm({ ...teamForm, members: [...teamForm.members, ''] });
    };

    const removeMemberField = (index) => {
        const newMembers = teamForm.members.filter((_, i) => i !== index);
        setTeamForm({ ...teamForm, members: newMembers });
    };
    const handleDeleteTeam = async (id) => {
        if (!window.confirm('Remove this team permanently?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/teams/${id}`);
            setSuccess('Team removed successfully!');
            fetchTeams();
        } catch (err) {
            setError('Failed to remove team');
        }
    };

    const loadQuizzes = async () => {
        try {
            setLoading(true);
            const data = await getQuizzes();
            setQuizzes(data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load quizzes.');
        } finally {
            setLoading(false);
        }
    };

    const handleScoreProject = async (teamId, score) => {
        await axios.post(`${API_BASE}/admin/score-project`, { teamId, score: parseInt(score) });
        fetchTeams();
    };

    // --- Quiz Creation Logic ---
    const handleQuizFormChange = (e) => {
        const { name, value } = e.target;
        setQuizForm(prev => {
            const updated = { ...prev, [name]: ['totalQuestions', 'timeLimit', 'questionBankSize'].includes(name) ? Number(value) : value };
            if (name === 'totalQuestions') {
                updated.questionBankSize = Number(value) * 2;
                updated.timeLimit = Number(value); // Default 1 min per question
            }
            return updated;
        });
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            await createQuizSvc(quizForm);
            setSuccess('Quiz created successfully!');
            setQuizForm({ title: '', quiz_type: 'C', totalQuestions: 10, questionBankSize: 20, timeLimit: 10 });
            loadQuizzes();
            setActiveTab('quizzes');
        } catch (err) {
            setError('Failed to create quiz.');
        }
    };

    const handleDeleteQuiz = async (id) => {
        if (!window.confirm('Delete this quiz and all its questions?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/quizzes/${id}`);
            setSuccess('Quiz deleted successfully!');
            loadQuizzes();
        } catch (err) {
            setError('Failed to delete quiz.');
        }
    };

    const handleEditQuiz = (quiz) => {
        setEditingQuizId(quiz._id);
        setEditForm({
            title: quiz.title,
            totalQuestions: quiz.totalQuestions,
            questionBankSize: quiz.questionBankSize,
            timeLimit: quiz.timeLimit
        });
    };

    const handleUpdateQuiz = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            setLoading(true);
            await updateQuizSvc(editingQuizId, editForm);
            setSuccess('Quiz updated successfully!');
            setEditingQuizId(null);
            loadQuizzes();
        } catch (err) {
            setError('Failed to update quiz.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewQuestions = async (quizId) => {
        try {
            setLoading(true);
            setError(''); setSuccess('');
            const data = await getQuestionsSvc(quizId);
            setQuestions(data);
            setViewingQuizId(quizId);
            setActiveTab('view-questions');
        } catch (err) {
            setError('Failed to load questions.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditQuestion = (q) => {
        setEditingQuestionId(q._id);
        setQuestionEditForm({
            question: q.question,
            options: { ...q.options },
            correct_answer: q.correct_answer
        });
    };

    const handleUpdateQuestion = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            setLoading(true);
            await updateQuestionSvc(editingQuestionId, questionEditForm);
            setSuccess('Question updated!');
            setEditingQuestionId(null);
            const data = await getQuestionsSvc(viewingQuizId);
            setQuestions(data);
        } catch (err) {
            setError('Failed to update question.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!window.confirm('Delete this question?')) return;
        setError(''); setSuccess('');
        try {
            await deleteQuestionSvc(id);
            setSuccess('Question deleted!');
            const data = await getQuestionsSvc(viewingQuizId);
            setQuestions(data);
        } catch (err) {
            setError('Failed to delete question.');
        }
    };

    // --- Question Bank Logic ---
    const handleQuestionInputChange = (index, field, value) => {
        const updated = [...questionInputs];
        updated[index] = { ...updated[index], [field]: value };
        setQuestionInputs(updated);
    };

    const handleQuestionFileChange = (index, field, file) => {
        const updated = [...questionInputs];
        updated[index] = { ...updated[index], [field]: file };
        setQuestionInputs(updated);
    };

    const handleAddInputRow = () => {
        setQuestionInputs([...questionInputs, {
            question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct_answer: 'A',
            qImg: null, oAImg: null, oBImg: null, oCImg: null, oDImg: null
        }]);
    };

    const handleSubmitQuestions = async () => {
        setError(''); setSuccess('');
        if (!selectedQuizId) return setError('Please select a quiz.');

        try {
            setLoading(true);
            // We'll upload one by one if there are images, or use a specific multi-part strategy
            // For simplicity and reliability with multiple files per question, 
            // we'll send each question as a separate request if they have images.
            for (const q of questionInputs) {
                const formData = new FormData();
                formData.append('quizId', selectedQuizId);
                formData.append('question', q.question);
                formData.append('optionA', q.optionA);
                formData.append('optionB', q.optionB);
                formData.append('optionC', q.optionC);
                formData.append('optionD', q.optionD);
                formData.append('correct_answer', q.correct_answer);

                if (q.qImg) formData.append('qImg', q.qImg);
                if (q.oAImg) formData.append('oAImg', q.oAImg);
                if (q.oBImg) formData.append('oBImg', q.oBImg);
                if (q.oCImg) formData.append('oCImg', q.oCImg);
                if (q.oDImg) formData.append('oDImg', q.oDImg);

                await axios.post(`${API_BASE}/admin/add-question-v2`, formData);
            }

            setSuccess('Questions and images saved successfully!');
            setQuestionInputs([{
                question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct_answer: 'A',
                qImg: null, oAImg: null, oBImg: null, oCImg: null, oDImg: null
            }]);
            loadQuizzes();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save questions');
        } finally {
            setLoading(false);
        }
    };

    // --- Project Reports Functions ---
    const fetchProjectReports = async () => {
        try {
            const res = await axios.get(`${API_BASE}/admin/project-reports`);
            setProjectReports(res.data);
        } catch (err) {
            console.error('Failed to load project reports', err);
        }
    };

    const fetchTestCases = async (projectId) => {
        try {
            const res = await axios.get(`${API_BASE}/admin/projects/${projectId}/testcases`);
            setTestCases(res.data);
        } catch (err) {
            console.error('Failed to load test cases', err);
        }
    };

    const handleAddTestCase = async (e) => {
        e.preventDefault();
        if (!selectedProjectForTests) {
            setError('Please select a project first');
            return;
        }
        try {
            setLoading(true);
            await axios.post(`${API_BASE}/admin/projects/${selectedProjectForTests}/testcases`, testCaseForm);
            setSuccess('Test case added successfully!');
            setTestCaseForm({ input: '', expectedOutput: '', points: 10, isHidden: false, description: '' });
            fetchTestCases(selectedProjectForTests);
        } catch (err) {
            setError('Failed to add test case');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTestCase = async (id) => {
        if (!window.confirm('Delete this test case?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/testcases/${id}`);
            setSuccess('Test case deleted');
            fetchTestCases(selectedProjectForTests);
        } catch (err) {
            setError('Failed to delete test case');
        }
    };

    const handleUpdateManualScore = async (teamId, manualScore) => {
        try {
            await axios.post(`${API_BASE}/admin/project-reports/${teamId}/manual-score`, { manualScore: Number(manualScore) });
            setSuccess('Manual score updated!');
            fetchProjectReports();
        } catch (err) {
            setError('Failed to update manual score');
        }
    };

    const handleAdminRunCode = () => {
        if (!viewCode || !viewCode.code) return;
        if (!adminSocketRef.current) {
            alert('Socket not connected. Please refresh.');
            return;
        }

        setIsRunning(true);
        adminTerminalRef.current?.clear();
        adminTerminalRef.current?.writeln('\x1b[36mStarting administrative execution...\x1b[0m\r\n');

        adminSocketRef.current.emit('run-code-start', {
            code: viewCode.code,
            language: viewCode.language
        });

        setTimeout(() => adminTerminalRef.current?.focus(), 100);
    };

    const handleRetestTeam = async (teamId) => {
        if (!window.confirm('⚠️ Are you sure you want to RESET this team\'s submission?\n\nThis will DELETE their submitted code and score, moving them back to "Not Completed" status so they can submit again.')) return;
        try {
            setLoading(true);
            await axios.post(`${API_BASE}/admin/project-reports/${teamId}/retest`);
            setSuccess('Team submission reset. They can now resubmit.');
            fetchProjectReports();
        } catch (err) {
            setError('Failed to reset team submission');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in container" style={{ padding: '20px 40px' }}>
            <div className="mb-10">
                <h1 style={{ fontSize: '3rem', marginBottom: '8px' }}>Admin Panel</h1>
                <p style={{ color: 'var(--text-muted)' }}>Centralized control for projects, rounds, and question banks.</p>
            </div>

            <div className="flex gap-4 mb-8 border-b border-black/5 pb-2 overflow-x-auto">
                {[
                    { id: 'projects', label: 'Projects', icon: FileCode },
                    { id: 'quizzes', label: 'Manage Quizzes', icon: ListChecks },
                    { id: 'teams', label: 'Teams', icon: Users },
                    { id: 'reports', label: 'Project Reports', icon: BarChart }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ borderRadius: '12px 12px 0 0', padding: '16px 24px', whiteSpace: 'nowrap' }}
                    >
                        <tab.icon size={18} style={{ marginRight: 8 }} /> {tab.label}
                    </button>
                ))}
            </div>

            {error && <div className="animate-in" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: 12, borderRadius: 8, marginBottom: 20 }}>{error}</div>}
            {success && <div className="animate-in" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', padding: 12, borderRadius: 8, marginBottom: 20 }}>{success}</div>}

            {/* --- Projects Tab --- */}
            {activeTab === 'projects' && (
                <div className="animate-in">
                    <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '20px' }}>Setup Project Round</h3>
                        <form onSubmit={handleAddProject}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="input-group">
                                    <label>Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Final Build Challenge"
                                        value={projectForm.title}
                                        onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Duration (min)</label>
                                    <input
                                        type="number"
                                        value={projectForm.timeLimit}
                                        onChange={e => setProjectForm({ ...projectForm, timeLimit: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Supporting Documents (Optional PDF)</label>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={e => setProjectFile(e.target.files[0])}
                                        style={{ padding: '8px' }}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Problem Statement / Challenge Description (This will be shown in the Team Workspace)</label>
                                <textarea
                                    rows="6"
                                    placeholder="Describe the challenge details here. This text will be shown on the left side of the team's coding workspace..."
                                    value={projectForm.description}
                                    onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                                    required
                                    style={{ width: '100%', borderRadius: '12px' }}
                                />
                            </div>

                            {/* Test Cases Section */}
                            <div className="input-group" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label style={{ margin: 0 }}>Test Cases (Input/Output)</label>
                                    <button type="button" className="btn btn-sm" onClick={() => setNewTestCases([...newTestCases, { input: '', expectedOutput: '', points: 10, isHidden: false }])}>
                                        + Add Test Case
                                    </button>
                                </div>

                                {newTestCases.map((tc, idx) => (
                                    <div key={idx} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 0.5fr auto auto', gap: '10px', alignItems: 'end' }}>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: '#666' }}>Input</span>
                                            <textarea
                                                rows="2"
                                                value={tc.input}
                                                onChange={e => {
                                                    const updated = [...newTestCases];
                                                    updated[idx].input = e.target.value;
                                                    setNewTestCases(updated);
                                                }}
                                                placeholder="Input"
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '5px' }}
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: '#666' }}>Expected Output</span>
                                            <textarea
                                                rows="2"
                                                value={tc.expectedOutput}
                                                onChange={e => {
                                                    const updated = [...newTestCases];
                                                    updated[idx].expectedOutput = e.target.value;
                                                    setNewTestCases(updated);
                                                }}
                                                placeholder="Output"
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '5px' }}
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: '#666' }}>Points</span>
                                            <input
                                                type="number"
                                                value={tc.points}
                                                onChange={e => {
                                                    const updated = [...newTestCases];
                                                    updated[idx].points = Number(e.target.value);
                                                    setNewTestCases(updated);
                                                }}
                                                style={{ width: '100%', padding: '5px' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#666' }}>Hidden</span>
                                            <input
                                                type="checkbox"
                                                checked={tc.isHidden}
                                                onChange={e => {
                                                    const updated = [...newTestCases];
                                                    updated[idx].isHidden = e.target.checked;
                                                    setNewTestCases(updated);
                                                }}
                                            />
                                        </div>
                                        <button type="button" className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setNewTestCases(newTestCases.filter((_, i) => i !== idx))}>
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                {newTestCases.length === 0 && <div style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>No test cases added yet.</div>}
                            </div>

                            <div className="flex justify-end">
                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '200px' }}>
                                    {loading ? 'Processing...' : 'Deploy Project Round'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="glass-panel">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <tr style={{ textAlign: 'left' }}>
                                    <th style={{ padding: '20px' }}>Title</th>
                                    <th style={{ padding: '20px' }}>Time to Solve</th>
                                    <th style={{ padding: '20px' }}>View</th>
                                    <th style={{ padding: '20px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(p => (
                                    <tr key={p._id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                        <td style={{ padding: '20px', fontWeight: 600 }}>
                                            {p.title}
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.description}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{p.timeLimit} min</span>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div className="flex flex-col gap-1">
                                                {p.description && <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>✓ Text Prompt Added</span>}
                                                {p.pdf_file && (
                                                    <a
                                                        href={`http://localhost:5001/uploads/${p.pdf_file}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <FileCode size={14} /> View PDF
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'right' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ color: 'var(--danger)' }}
                                                onClick={() => handleDeleteProject(p._id)}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {projects.length === 0 && (
                            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No project tasks defined yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- Manage Quizzes Tab --- */}
            {activeTab === 'quizzes' && (
                <div className="animate-in">
                    <div className="glass-panel" style={{ padding: 32, marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 20 }}>Setup New Quiz</h3>
                        <form onSubmit={handleCreateQuiz} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 15, alignItems: 'flex-end' }}>
                            <div className="input-group">
                                <label>Quiz Title</label>
                                <input type="text" name="title" required value={quizForm.title} onChange={handleQuizFormChange} placeholder="e.g. Round 1: Basics" />
                            </div>
                            <div className="input-group">
                                <label>Questions</label>
                                <input type="number" name="totalQuestions" min={1} value={quizForm.totalQuestions} onChange={handleQuizFormChange} />
                            </div>
                            <div className="input-group">
                                <label>Req. Bank</label>
                                <input type="number" readOnly value={quizForm.questionBankSize} style={{ opacity: 0.7 }} />
                            </div>
                            <div className="input-group">
                                <label>Time (min)</label>
                                <input type="number" name="timeLimit" min={1} value={quizForm.timeLimit} onChange={handleQuizFormChange} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: 48 }}>Create Quiz</button>
                        </form>
                    </div>

                    <div className="glass-panel">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <tr>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Title</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Bank Size</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Uploaded</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Time (min)</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: 16, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quizzes.map(q => (
                                    <tr key={q._id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                        <td style={{ padding: 16, fontWeight: 600 }}>
                                            {editingQuizId === q._id ? (
                                                <input
                                                    type="text"
                                                    value={editForm.title}
                                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                    className="input-sm"
                                                    style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary)' }}
                                                />
                                            ) : (
                                                q.title
                                            )}
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>
                                            {editingQuizId === q._id ? (
                                                <input
                                                    type="number"
                                                    value={editForm.questionBankSize}
                                                    onChange={(e) => setEditForm({ ...editForm, questionBankSize: Number(e.target.value) })}
                                                    style={{ width: '60px', textAlign: 'center' }}
                                                />
                                            ) : (
                                                q.questionBankSize
                                            )}
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>{q.uploadedQuestions}</td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>
                                            {editingQuizId === q._id ? (
                                                <input
                                                    type="number"
                                                    value={editForm.timeLimit}
                                                    onChange={(e) => setEditForm({ ...editForm, timeLimit: Number(e.target.value) })}
                                                    style={{ width: '60px', textAlign: 'center' }}
                                                />
                                            ) : (
                                                `${q.timeLimit}m`
                                            )}
                                        </td>
                                        <td style={{ padding: 16 }}>
                                            <span style={{ color: q.isSufficient ? 'var(--accent)' : 'var(--warning)', fontSize: '0.85rem' }}>
                                                {q.isSufficient ? '✓ Sufficient' : `⚠ Needs ${q.questionBankSize - q.uploadedQuestions} more`}
                                            </span>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'right' }}>
                                            <div className="flex justify-end gap-2">
                                                {editingQuizId === q._id ? (
                                                    <>
                                                        <button className="btn btn-primary btn-sm" onClick={handleUpdateQuiz}>Save</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingQuizId(null)}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEditQuiz(q)}>Edit</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleViewQuestions(q._id)}>View Questions</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedQuizId(q._id); setActiveTab('add-questions'); }}>Add Questions</button>
                                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteQuiz(q._id)}>Remove</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {quizzes.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No quizzes created yet.</div>
                        )}
                    </div>
                </div>
            )}
            {/* --- Teams Tab --- */}
            {activeTab === 'teams' && (
                <div className="animate-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 style={{ margin: 0 }}>Registered Teams</h2>
                        <button
                            className="btn btn-primary flex items-center gap-2"
                            style={{ padding: '12px 24px' }}
                            onClick={() => setShowTeamModal(true)}
                        >
                            <PlusCircle size={20} /> Create New Team
                        </button>
                    </div>
                    <div className="glass-panel">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <tr>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Team Name</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Members</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Total Score</th>
                                    <th style={{ padding: 16, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map(team => (
                                    <tr key={team._id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                        <td style={{ padding: 16, fontWeight: 700 }}>{team.team_name}</td>
                                        <td style={{ padding: 16 }}>{team.members?.join(', ')}</td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>
                                            <span className="btn btn-ghost" style={{ cursor: 'default', background: 'rgba(0,0,0,0.03)', fontWeight: 800 }}>
                                                {team.final_score}
                                            </span>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'right' }}>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => navigate(`/admin/team-stats/${team._id}`)}
                                                >
                                                    View Stats
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: 'var(--danger)' }}
                                                    onClick={() => handleDeleteTeam(team._id)}
                                                >
                                                    Unregister
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {teams.length === 0 && (
                            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Users size={40} style={{ margin: '0 auto 15px', opacity: 0.3 }} />
                                <p>No teams have registered for the competition yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'add-questions' && (() => {
                const selQuiz = quizzes.find(q => q._id === selectedQuizId);
                const progress = selQuiz ? (selQuiz.uploadedQuestions / selQuiz.questionBankSize) * 100 : 0;

                return (
                    <div className="glass-panel animate-in" style={{ padding: 32 }}>
                        <div className="flex justify-between items-end mb-8">
                            <div style={{ flex: 1 }}>
                                <label className="block mb-2 text-sm font-semibold opacity-70">Target Quiz</label>
                                <select
                                    value={selectedQuizId}
                                    onChange={(e) => setSelectedQuizId(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                >
                                    <option value="">-- Choose Quiz --</option>
                                    {quizzes.map(q => <option key={q._id} value={q._id}>{q.title}</option>)}
                                </select>
                            </div>

                            {selQuiz && (
                                <div style={{ textAlign: 'right', minWidth: '350px' }}>
                                    <div className="flex justify-between mb-2 text-sm">
                                        <span>
                                            Status: {selQuiz.isSufficient ?
                                                <span style={{ color: 'var(--accent)', fontWeight: 800 }}>● LIVE</span> :
                                                <span style={{ color: 'var(--warning)', fontWeight: 800 }}>○ INCOMPLETE</span>}
                                        </span>
                                        <span style={{ fontWeight: 700 }}>
                                            {selQuiz.uploadedQuestions} / {selQuiz.questionBankSize} Questions
                                        </span>
                                    </div>
                                    <div style={{ height: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                                        {/* Marker for totalQuestions (minimum needed to go live) */}
                                        <div style={{
                                            position: 'absolute',
                                            left: `${(selQuiz.totalQuestions / selQuiz.questionBankSize) * 100}%`,
                                            top: 0, bottom: 0, width: 2,
                                            background: 'var(--danger)',
                                            zIndex: 2,
                                            opacity: 0.5
                                        }} title="Activation Threshold" />

                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min((selQuiz.uploadedQuestions / selQuiz.questionBankSize) * 100, 100)}%`,
                                            background: selQuiz.isSufficient ? 'var(--accent)' : 'var(--primary)',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                    <p style={{ fontSize: '0.7rem', marginTop: 4, opacity: 0.6 }}>
                                        Need {selQuiz.totalQuestions} to activate. Aim for {selQuiz.questionBankSize} for best randomization.
                                    </p>
                                </div>
                            )}
                        </div>

                        {selectedQuizId ? (
                            <>
                                {questionInputs.map((q, idx) => (
                                    <div key={idx} className="glass-panel mb-6" style={{ padding: 24, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div style={{ background: 'var(--primary)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                                                {selQuiz ? selQuiz.uploadedQuestions + 1 : idx + 1}
                                            </div>
                                            <h3 style={{ margin: 0 }}>Entry Form</h3>
                                        </div>

                                        <div className="input-group mb-4">
                                            <label>Question Text</label>
                                            <textarea
                                                rows="3"
                                                placeholder="Type the question prompt here..."
                                                value={q.question}
                                                onChange={(e) => handleQuestionInputChange(idx, 'question', e.target.value)}
                                            />
                                            <div style={{ marginTop: 10 }}>
                                                <label style={{ fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleQuestionFileChange(idx, 'qImg', e.target.files[0])} />
                                                    <PlusCircle size={14} /> {q.qImg ? `File: ${q.qImg.name}` : 'Attach Question Image'}
                                                </label>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                            {['A', 'B', 'C', 'D'].map(o => (
                                                <div key={o} className="input-group">
                                                    <label>Option {o}</label>
                                                    <input
                                                        type="text"
                                                        placeholder={`Enter choice ${o}`}
                                                        value={q[`option${o}`]}
                                                        onChange={(e) => handleQuestionInputChange(idx, `option${o}`, e.target.value)}
                                                    />
                                                    <div style={{ marginTop: 6 }}>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleQuestionFileChange(idx, `o${o}Img`, e.target.files[0])} />
                                                            🖼️ {q[`o${o}Img`] ? q[`o${o}Img`].name : `Add Image for ${o}`}
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="input-group" style={{ gridColumn: 'span 2', marginTop: 10 }}>
                                                <label>Correct Answer</label>
                                                <select
                                                    style={{ border: '2px solid var(--primary)' }}
                                                    value={q.correct_answer}
                                                    onChange={(e) => handleQuestionInputChange(idx, 'correct_answer', e.target.value)}
                                                >
                                                    {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>Option {o} is Correct</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex gap-4">
                                    <button className="btn btn-ghost" onClick={() => setActiveTab('quizzes')}>Back to List</button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ marginLeft: 'auto', padding: '12px 40px' }}
                                        onClick={handleSubmitQuestions}
                                        disabled={loading || !questionInputs[0].question}
                                    >
                                        {loading ? 'Processing...' : 'Submit & Add Next'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                                Please select a quiz above to start adding questions.
                            </div>
                        )}
                    </div>
                )
            })()}

            {activeTab === 'view-questions' && (
                <div className="animate-in">
                    <div className="flex items-center gap-4 mb-6">
                        <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('quizzes')}>← Back to Quizzes</button>
                        <h2 style={{ margin: 0 }}>Questions for {quizzes.find(q => q._id === viewingQuizId)?.title}</h2>
                    </div>

                    <div className="grid gap-6">
                        {questions.map((q, idx) => (
                            <div key={q._id} className="glass-panel" style={{ padding: 24 }}>
                                {editingQuestionId === q._id ? (
                                    <form onSubmit={handleUpdateQuestion} className="grid gap-4">
                                        <div className="input-group">
                                            <label>Question Text</label>
                                            <textarea
                                                className="w-full"
                                                value={questionEditForm.question}
                                                onChange={(e) => setQuestionEditForm({ ...questionEditForm, question: e.target.value })}
                                                rows="3"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {['A', 'B', 'C', 'D'].map(opt => (
                                                <div key={opt} className="input-group">
                                                    <label>Option {opt}</label>
                                                    <input
                                                        type="text"
                                                        value={questionEditForm.options[opt]}
                                                        onChange={(e) => {
                                                            const newOpts = { ...questionEditForm.options, [opt]: e.target.value };
                                                            setQuestionEditForm({ ...questionEditForm, options: newOpts });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="input-group w-full">
                                            <label>Correct Answer</label>
                                            <select
                                                className="w-full"
                                                value={questionEditForm.correct_answer}
                                                onChange={(e) => setQuestionEditForm({ ...questionEditForm, correct_answer: e.target.value })}
                                            >
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="submit" className="btn btn-primary">Save Changes</button>
                                            <button type="button" className="btn btn-ghost" onClick={() => setEditingQuestionId(null)}>Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: 4, marginRight: 10 }}>
                                                    QUESTION {idx + 1}
                                                </span>
                                                <h4 style={{ display: 'inline', margin: 0 }}>{q.question}</h4>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleEditQuestion(q)}>Edit</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteQuestion(q._id)}>Delete</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                            {Object.entries(q.options).map(([key, val]) => (
                                                <div key={key} style={{
                                                    padding: '12px 16px',
                                                    borderRadius: 12,
                                                    background: q.correct_answer === key ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.02)',
                                                    border: q.correct_answer === key ? '1px solid #22c55e' : '1px solid rgba(0,0,0,0.05)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12
                                                }}>
                                                    <span style={{
                                                        width: 28, height: 28, borderRadius: '50%', background: q.correct_answer === key ? '#22c55e' : 'rgba(0,0,0,0.1)',
                                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800
                                                    }}>{key}</span>
                                                    <span style={{ fontWeight: q.correct_answer === key ? 600 : 400 }}>{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {questions.length === 0 && (
                            <div className="glass-panel" style={{ padding: 60, textAlign: 'center', opacity: 0.5 }}>
                                No questions found for this quiz.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- Reports Tab --- */}
            {activeTab === 'reports' && (
                <div className="animate-in">
                    <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '20px' }}>Project Submission Reports</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <tr>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Team</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Language</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Tests Passed</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Auto Score</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Manual Score</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Total Score</th>
                                    <th style={{ padding: 16, textAlign: 'center' }}>Violations</th>
                                    <th style={{ padding: 16, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectReports.map(report => (
                                    <tr key={report.teamId} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                        <td style={{ padding: 16 }}>
                                            <div style={{ fontWeight: 700 }}>{report.teamName}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {report.members?.join(', ')}
                                            </div>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>
                                            <span style={{
                                                background: report.language === 'c' ? '#e0f2fe' : '#fef3c7',
                                                color: report.language === 'c' ? '#0369a1' : '#92400e',
                                                padding: '4px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                {report.language === 'c' ? 'C' : 'Python'}
                                            </span>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>
                                            <span style={{
                                                color: report.passedTests === report.totalTests ? 'var(--accent)' : 'var(--warning)',
                                                fontWeight: 700
                                            }}>
                                                {report.passedTests} / {report.totalTests}
                                            </span>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                                            {report.autoScore}
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                defaultValue={report.manualScore}
                                                onBlur={(e) => handleUpdateManualScore(report.teamId, e.target.value)}
                                                style={{
                                                    width: '80px',
                                                    padding: '6px',
                                                    textAlign: 'center',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '6px'
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>
                                            {report.totalScore}
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>
                                            <span style={{
                                                color: report.violations > 0 ? 'var(--danger)' : 'var(--text-muted)',
                                                fontWeight: report.violations > 0 ? 700 : 400
                                            }}>
                                                {report.violations}
                                            </span>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'right' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => {
                                                    setViewCode({
                                                        code: report.code,
                                                        language: report.language,
                                                        teamName: report.teamName
                                                    });
                                                }}
                                                style={{ marginRight: 8, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                                                title="View Code & Run"
                                            >
                                                <Code size={14} style={{ marginRight: 4 }} /> Code
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleRetestTeam(report.teamId)}
                                                style={{ marginRight: 8, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center' }}
                                                title="Reset Submission / Allow Re-submit"
                                            >
                                                <RotateCcw size={14} />
                                            </button>

                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {projectReports.length === 0 && (
                            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <BarChart size={40} style={{ margin: '0 auto 15px', opacity: 0.3 }} />
                                <p>No project submissions yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Test Case Management Section */}
                    <div className="glass-panel" style={{ padding: '32px' }}>
                        <h3 style={{ marginBottom: '20px' }}>Manage Test Cases</h3>

                        <div className="input-group" style={{ marginBottom: '20px' }}>
                            <label>Select Project</label>
                            <select
                                value={selectedProjectForTests}
                                onChange={(e) => {
                                    setSelectedProjectForTests(e.target.value);
                                    if (e.target.value) fetchTestCases(e.target.value);
                                }}
                                style={{ maxWidth: '400px' }}
                            >
                                <option value="">-- Choose Project --</option>
                                {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                            </select>
                        </div>

                        {selectedProjectForTests && (
                            <>
                                <form onSubmit={handleAddTestCase} style={{ marginBottom: '30px', padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                                    <h4 style={{ marginBottom: '15px' }}>Add New Test Case</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div className="input-group">
                                            <label>Input</label>
                                            <textarea
                                                rows="3"
                                                placeholder="Test input (e.g., '5' or '10 20')"
                                                value={testCaseForm.input}
                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, input: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Expected Output</label>
                                            <textarea
                                                rows="3"
                                                placeholder="Expected output (e.g., '120')"
                                                value={testCaseForm.expectedOutput}
                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, expectedOutput: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '15px', marginBottom: '15px' }}>
                                        <div className="input-group">
                                            <label>Points</label>
                                            <input
                                                type="number"
                                                value={testCaseForm.points}
                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, points: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={testCaseForm.isHidden}
                                                    onChange={(e) => setTestCaseForm({ ...testCaseForm, isHidden: e.target.checked })}
                                                />
                                                Hidden Test
                                            </label>
                                        </div>
                                        <div className="input-group">
                                            <label>Description (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., 'Tests factorial of 5'"
                                                value={testCaseForm.description}
                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Adding...' : 'Add Test Case'}
                                    </button>
                                </form>

                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                        <tr>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Description</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Input</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Expected Output</th>
                                            <th style={{ padding: 12, textAlign: 'center' }}>Points</th>
                                            <th style={{ padding: 12, textAlign: 'center' }}>Hidden</th>
                                            <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {testCases.map(tc => (
                                            <tr key={tc._id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                <td style={{ padding: 12, fontSize: '0.9rem' }}>{tc.description || '-'}</td>
                                                <td style={{ padding: 12, fontFamily: 'monospace', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {tc.input}
                                                </td>
                                                <td style={{ padding: 12, fontFamily: 'monospace', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {tc.expectedOutput}
                                                </td>
                                                <td style={{ padding: 12, textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{tc.points}</td>
                                                <td style={{ padding: 12, textAlign: 'center' }}>
                                                    {tc.isHidden ? <span style={{ color: 'var(--warning)' }}>🔒 Yes</span> : <span style={{ color: 'var(--text-muted)' }}>👁️ No</span>}
                                                </td>
                                                <td style={{ padding: 12, textAlign: 'right' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ color: 'var(--danger)' }}
                                                        onClick={() => handleDeleteTestCase(tc._id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {testCases.length === 0 && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No test cases added yet for this project.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* View Code Modal */}
            {viewCode && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setViewCode(null)}>
                    <div
                        className="glass-panel"
                        style={{ width: '90%', height: '90%', display: 'flex', flexDirection: 'column', background: 'white', padding: '24px' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 15 }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Code Submission: {viewCode.teamName}</h3>
                                <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Language:</span>
                                    <select
                                        value={viewCode.language}
                                        onChange={(e) => setViewCode({ ...viewCode, language: e.target.value })}
                                        style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                                    >
                                        <option value="c">C</option>
                                        <option value="python">Python</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={() => setViewCode(null)} className="btn btn-ghost" style={{ fontSize: '1.2rem', padding: '4px 12px' }}>&times;</button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                            {/* Code Editor (Editable) */}
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <h4 style={{ marginBottom: '10px' }}>Source Code</h4>
                                <textarea
                                    value={viewCode.code || ''}
                                    onChange={(e) => setViewCode({ ...viewCode, code: e.target.value })}
                                    style={{ flex: 1, overflow: 'auto', background: '#1e1e1e', color: '#d4d4d4', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', resize: 'none', border: 'none' }}
                                    spellCheck="false"
                                    placeholder="// No code submitted. Start typing..."
                                />
                            </div>

                            {/* Execution Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h4 style={{ margin: 0 }}>Run Code</h4>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => adminTerminalRef.current?.clear()}
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: '#888' }}
                                            title="Clear Terminal"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            onClick={handleAdminRunCode}
                                            className="btn btn-primary"
                                            disabled={isRunning}
                                            style={{ padding: '6px 16px', fontSize: '0.9rem' }}
                                        >
                                            {isRunning ? 'Running...' : 'Run Code'}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ flex: 1, background: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <CodeTerminal
                                        ref={adminTerminalRef}
                                        onData={(data) => adminSocketRef.current?.emit('input', data)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Creation Modal */}
            {showTeamModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }} onClick={() => setShowTeamModal(false)}>
                    <div className="glass-panel animate-in" style={{ width: '100%', maxWidth: '600px', padding: '40px', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 style={{ margin: 0 }}>Create New Team</h2>
                            <button className="btn btn-ghost" onClick={() => setShowTeamModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleCreateTeam}>
                            <div className="input-group mb-6">
                                <label>Team Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter unique team name"
                                    value={teamForm.team_name}
                                    onChange={e => setTeamForm({ ...teamForm, team_name: e.target.value })}
                                />
                            </div>

                            <div className="input-group mb-6">
                                <label>Team Password</label>
                                <input
                                    type="password"
                                    placeholder="Set temporary password"
                                    value={teamForm.password}
                                    onChange={e => setTeamForm({ ...teamForm, password: e.target.value })}
                                />
                            </div>

                            <div className="input-group mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <label style={{ margin: 0 }}>Members</label>
                                    <button type="button" className="btn btn-sm btn-ghost" style={{ color: 'var(--primary)' }} onClick={addMemberField}>
                                        + Add Member
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {teamForm.members.map((member, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder={`Member ${idx + 1} Name`}
                                                value={member}
                                                onChange={e => handleMemberChange(idx, e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            {teamForm.members.length > 1 && (
                                                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeMemberField(idx)}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowTeamModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                                    {loading ? 'Creating...' : 'Register Team'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
