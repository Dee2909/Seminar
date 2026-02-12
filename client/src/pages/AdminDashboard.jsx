import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';
import {
    Users, FileCode, PlusCircle, CheckCircle,
    ListChecks, Layers, Clock, ListOrdered, CheckCircle2
} from 'lucide-react';
import { getQuizzes, addQuestion as addQuestionSvc, createQuiz as createQuizSvc } from '../services/quizService';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [activeTab, setActiveTab] = useState('projects');
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
    const [projectFile, setProjectFile] = useState(null);

    const { user } = useAuth();

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/admin/login');
            return;
        }
        fetchTeams();
        loadQuizzes();
        fetchProjects();
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
        if (projectFile) formData.append('file', projectFile);

        try {
            setLoading(true);
            await axios.post(`${API_BASE}/admin/projects`, formData);
            setSuccess('Project added successfully!');
            setProjectForm({ title: '', timeLimit: 60, description: '' });
            setProjectFile(null);
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
                    { id: 'teams', label: 'Teams', icon: Users }
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
                                        <td style={{ padding: 16, fontWeight: 600 }}>{q.title}</td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>{q.questionBankSize}</td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>{q.uploadedQuestions}</td>
                                        <td style={{ padding: 16, textAlign: 'center' }}>{q.timeLimit}m</td>
                                        <td style={{ padding: 16 }}>
                                            <span style={{ color: q.isSufficient ? 'var(--accent)' : 'var(--warning)', fontSize: '0.85rem' }}>
                                                {q.isSufficient ? '✓ Sufficient' : `⚠ Needs ${q.questionBankSize - q.uploadedQuestions} more`}
                                            </span>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'right' }}>
                                            <div className="flex justify-end gap-2">
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedQuizId(q._id); setActiveTab('add-questions'); }}>Add Questions</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteQuiz(q._id)}>Remove</button>
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
        </div>
    );
};

export default AdminDashboard;
