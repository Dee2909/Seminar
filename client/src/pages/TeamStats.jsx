import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API_BASE } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Users, Trophy, Clock, AlertTriangle,
    ArrowLeft, ChevronRight, CheckCircle2,
    XCircle, HelpCircle, Activity, ShieldAlert
} from 'lucide-react';

const TeamStats = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [team, setTeam] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/admin/login');
            return;
        }
        fetchData();
    }, [id, user, navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamRes, quizRes] = await Promise.all([
                axios.get(`${API_BASE}/admin/teams/${id}`),
                axios.get(`${API_BASE}/admin/quizzes`)
            ]);
            setTeam(teamRes.data);
            setQuizzes(quizRes.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to load team statistics');
            setLoading(false);
        }
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
            <div className="container" style={{ maxWidth: '1200px' }}>
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

                {/* Detailed Breakdown */}
                <div className="glass-panel" style={{ padding: '40px' }}>
                    <h3 className="mb-8 flex items-center gap-3">
                        <Activity color="var(--primary)" /> Quiz Performance History
                    </h3>

                    {team.quizResults && team.quizResults.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {team.quizResults.map((res, i) => {
                                const quiz = quizzes.find(q => q._id === res.quizId);
                                const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

                                return (
                                    <div key={i} className="glass-panel" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(0,0,0,0.05)', padding: '25px' }}>
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }}></div>
                                                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{quiz?.title || 'Unknown Quiz'}</h4>
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
            </div>
        </div>
    );
};

export default TeamStats;
