import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API_BASE } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import CodeTerminal from '../components/CodeTerminal';
import {
    Users, Trophy, Clock, AlertTriangle,
    ArrowLeft, ChevronRight, CheckCircle2,
    XCircle, HelpCircle, Activity, ShieldAlert,
    FileCode, Terminal, Trash2, Video
} from 'lucide-react';

const TeamStats = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [team, setTeam] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectReports, setProjectReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewCode, setViewCode] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

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

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchData();
    }, [id, user, navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamRes, quizRes, projectRes, reportsRes] = await Promise.all([
                axios.get(`${API_BASE}/admin/teams/${id}`),
                axios.get(`${API_BASE}/admin/quizzes`),
                axios.get(`${API_BASE}/admin/projects`),
                axios.get(`${API_BASE}/admin/project-reports/${id}`)
            ]);
            setTeam(teamRes.data);
            setQuizzes(quizRes.data);
            setProjects(projectRes.data);
            // Backend returns { teamId, project: {...}, ... }
            const reportData = reportsRes.data;
            if (reportData && reportData.project && reportData.project.submitted) {
                // Wrap in array for the UI map
                setProjectReports([{
                    ...reportData.project,
                    _id: 'report-1', // dummy id for React key
                    violations: reportData.violations, // Use team total if project specific not available
                    submittedAt: teamRes.data.updatedAt // Placeholder if not explicitly tracked
                }]);
            } else {
                setProjectReports([]);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to load team statistics');
            setLoading(false);
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

    if (loading) return (
        <div className="flex items-center justify-center min-vh-100">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="btn-primary" style={{ padding: 20, borderRadius: '50%' }}>
                <Activity size={40} />
            </motion.div>
        </div>
    );

    if (error || !team) return (
        <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
            <div className="glass-panel" style={{ padding: 40, border: '1px solid var(--danger)' }}>
                <ShieldAlert size={60} color="var(--danger)" style={{ marginBottom: 20 }} />
                <h3>{error || 'Team not found'}</h3>
                <button onClick={() => navigate('/admin')} className="btn btn-primary mt-4">Return to Dashboard</button>
            </div>
        </div>
    );

    return (
        <div className="animate-in" style={{ padding: '40px 20px' }}>
            {/* Header */}
            <div className="container">
                <button onClick={() => navigate('/admin')} className="btn btn-ghost mb-6 gap-2" style={{ marginLeft: -12 }}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: 8 }}>{team.team_name}</h1>
                        <p className="opacity-70 flex items-center gap-2">
                            <Users size={16} /> {team.members?.join(', ')}
                        </p>
                    </div>
                    <div className="text-right">
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Registered On</span>
                        <p style={{ fontWeight: 600 }}>{new Date(team.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Performance Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', background: 'var(--primary)', color: 'white' }}>
                        <Trophy size={40} style={{ margin: '0 auto 15px', opacity: 0.8 }} />
                        <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>Final Score</span>
                        <h2 style={{ fontSize: '3rem', margin: 0 }}>{team.final_score}</h2>
                    </div>

                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
                        <AlertTriangle size={40} color="var(--danger)" style={{ margin: '0 auto 15px', opacity: 0.8 }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Violations</span>
                        <h2 style={{ fontSize: '3rem', margin: 0, color: team.violations > 0 ? 'var(--danger)' : 'inherit' }}>{team.violations || 0}</h2>
                    </div>

                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
                        <HelpCircle size={40} color="var(--primary)" style={{ margin: '0 auto 15px', opacity: 0.8 }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Quizzes Attended</span>
                        <h2 style={{ fontSize: '3rem', margin: 0 }}>{team.quizResults?.length || 0}</h2>
                    </div>

                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
                        <ShieldAlert size={40} color="var(--accent)" style={{ margin: '0 auto 15px', opacity: 0.8 }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Last IP Address</span>
                        <h2 style={{ fontSize: '1.5rem', marginTop: 15 }}>{team.lastIp || 'N/A'}</h2>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{team.lastLoginAt ? `Last active: ${new Date(team.lastLoginAt).toLocaleString()}` : ''}</span>
                    </div>
                </div>

                {/* Quiz Performance History */}
                <div className="glass-panel" style={{ padding: '40px' }}>
                    <h3 className="mb-8 flex items-center gap-3">
                        <Activity color="var(--primary)" /> Quiz Performance History
                    </h3>

                    {team.quizResults && team.quizResults.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {team.quizResults.map((res, i) => {
                                const quiz = quizzes.find(q => String(q._id) === String(res.quizId));
                                const formatTime = (s) => {
                                    if (typeof s !== 'number') return '0:00';
                                    return `${Math.floor(s / 60)}:${((s % 60) || 0).toString().padStart(2, '0')}`;
                                };

                                return (
                                    <div key={i} className="glass-panel" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(0,0,0,0.05)', padding: '25px' }}>
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }}></div>
                                                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{quiz?.title || `Quiz (ID: ${res.quizId?.substring(0, 8) || '???'})`}</h4>
                                            </div>
                                            <span className="btn btn-sm btn-ghost" style={{ background: 'rgba(0,0,0,0.05)', fontWeight: 800 }}>
                                                Score: {res.score}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions Answered</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700 }}>
                                                    <CheckCircle2 size={16} color="var(--success)" /> {res.questionsAnswered}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions Skipped</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700 }}>
                                                    <XCircle size={16} color="var(--danger)" /> {res.questionsSkipped}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time Remaining</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700 }}>
                                                    <Clock size={16} color="var(--primary)" /> {formatTime(res.time_remaining)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Integrity Alerts</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700, color: res.violations > 0 ? 'var(--danger)' : 'inherit' }}>
                                                    <ShieldAlert size={16} /> {res.violations} Alerts
                                                </div>
                                            </div>
                                            {res.recording_file ? (
                                                <div className="flex flex-col gap-1">
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proctoring Video</span>
                                                    <a
                                                        href={`${API_BASE.replace('/api', '')}/uploads/${res.recording_file}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 mt-1"
                                                        style={{
                                                            fontWeight: 700,
                                                            color: 'var(--primary)',
                                                            textDecoration: 'none',
                                                            background: 'rgba(99, 102, 241, 0.05)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid rgba(99, 102, 241, 0.1)',
                                                            width: 'fit-content'
                                                        }}
                                                    >
                                                        <Video size={16} /> View Recording
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proctoring Video</span>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        No recording available
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {res.violations > 0 && (
                                            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)', fontSize: '0.85rem', color: 'var(--danger)' }}>
                                                <strong>Note:</strong> Multiple integrity alerts were triggered during this session (Tab switching or Fullscreen exit detected).
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                            <HelpCircle size={40} style={{ margin: '0 auto 15px', opacity: 0.3 }} />
                            <p>This team hasn't participated in any quizzes yet.</p>
                        </div>
                    )}
                </div>

                {/* Project Performance History */}
                <div className="glass-panel" style={{ padding: '40px', marginTop: '40px' }}>
                    <h3 className="mb-8 flex items-center gap-3">
                        <FileCode color="var(--success)" /> Project Performance
                    </h3>

                    {projectReports && projectReports.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {projectReports.map((report, i) => {
                                const project = projects.find(p => String(p._id) === String(report.projectId));

                                return (
                                    <div key={i} className="glass-panel" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(0,0,0,0.05)', padding: '25px' }}>
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }}></div>
                                                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{project?.title || `Project (ID: ${report.projectId?.substring(0, 8) || '???'})`}</h4>
                                                <span style={{ fontSize: '0.75rem', background: '#eee', padding: '2px 8px', borderRadius: '4px', color: '#666', textTransform: 'uppercase' }}>
                                                    {report.language}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => setViewCode({ code: report.code, language: report.language, teamName: team.team_name })}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: 'var(--primary)', border: '1px solid var(--primary)' }}
                                                >
                                                    <Terminal size={14} style={{ marginRight: 5 }} /> View Code
                                                </button>
                                                <span className="btn btn-sm btn-ghost" style={{ background: 'rgba(0,0,0,0.05)', fontWeight: 600 }}>
                                                    Auto Score: {report.autoScore}
                                                </span>
                                                <span className="btn btn-sm btn-ghost" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--success)', fontWeight: 800 }}>
                                                    Manual Score: {report.manualScore}
                                                </span>
                                                <span className="btn btn-sm" style={{ background: 'var(--primary)', color: 'white', fontWeight: 800 }}>
                                                    Total: {report.autoScore + report.manualScore}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--success)' }}>
                                                    <CheckCircle2 size={16} /> Submitted
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Test Cases Passed</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700 }}>
                                                    {report.testResults?.filter(r => r.passed).length} / {report.testResults?.length}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Integrity Violations</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700, color: report.violations > 0 ? 'var(--danger)' : 'inherit' }}>
                                                    <AlertTriangle size={16} /> {report.violations} Alerts
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submission Time</span>
                                                <div className="flex items-center gap-2" style={{ fontWeight: 700 }}>
                                                    <Clock size={16} color="var(--primary)" /> {new Date(report.submittedAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            {report.recording_file ? (
                                                <div className="flex flex-col gap-1">
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proctoring Video</span>
                                                    <a
                                                        href={`${API_BASE.replace('/api', '')}/uploads/${report.recording_file}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 mt-1"
                                                        style={{
                                                            fontWeight: 700,
                                                            color: 'var(--success)',
                                                            textDecoration: 'none',
                                                            background: 'rgba(52, 211, 153, 0.05)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid rgba(52, 211, 153, 0.1)',
                                                            width: 'fit-content'
                                                        }}
                                                    >
                                                        <Video size={16} /> View Recording
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proctoring Video</span>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        No recording available
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {report.violations > 0 && (
                                            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)', fontSize: '0.85rem', color: 'var(--danger)' }}>
                                                <strong>Security Note:</strong> This report has flagged violations. Check the admin dashboard for detailed logs.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                            <HelpCircle size={40} style={{ margin: '0 auto 15px', opacity: 0.3 }} />
                            <p>This team hasn't submitted any projects yet.</p>
                        </div>
                    )}
                </div>
            </div>

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
                                <h3 style={{ margin: 0 }}>Review Submission: {viewCode.teamName}</h3>
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
                            {/* Code Editor */}
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <h4 style={{ marginBottom: '10px' }}>Source Code</h4>
                                <textarea
                                    value={viewCode.code || ''}
                                    onChange={(e) => setViewCode({ ...viewCode, code: e.target.value })}
                                    style={{ flex: 1, overflow: 'auto', background: '#1e1e1e', color: '#d4d4d4', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', resize: 'none', border: 'none' }}
                                    spellCheck="false"
                                    placeholder="// No code submitted."
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
        </div>
    );
};

export default TeamStats;
