import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API_BASE } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Timer, Trophy, Code2, Layers } from 'lucide-react';

const DashboardCard = ({ title, status, score, actionLabel, onAction, icon: Icon, disabled, subtitle }) => (
    <motion.div
        whileHover={!disabled ? { scale: 1.02 } : {}}
        className="glass-panel"
        style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="flex justify-between items-start">
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--primary)' }}>
                <Icon size={24} />
            </div>
            {status ? <CheckCircle2 color="var(--accent)" /> : <Circle color="var(--text-muted)" />}
        </div>
        <div>
            <h3 style={{ fontSize: '1.3rem' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{subtitle}</p>}
        </div>
        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {status ? `Score: ${score}` : 'Pending'}
        </p>
        <button
            onClick={onAction}
            disabled={disabled}
            className={`btn ${status ? 'btn-ghost' : 'btn-primary'}`}
            style={{ marginTop: 'auto', opacity: disabled && status ? 0.7 : 1 }}>
            {status ? 'View Results' : actionLabel}
        </button>
    </motion.div>
);

const TeamDashboard = () => {
    const [team, setTeam] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const [quizzes, setQuizzes] = useState([]);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        if (!user || user.role !== 'team') {
            navigate('/');
            return;
        }
        loadDashboardData();
    }, [user, navigate]);

    const loadDashboardData = async () => {
        try {
            const [teamRes, quizRes, projectRes] = await Promise.all([
                axios.get(`${API_BASE}/team/me`),
                axios.get(`${API_BASE}/team/active-quizzes`),
                axios.get(`${API_BASE}/team/projects`) // Corrected endpoint for teams
            ]);
            setTeam(teamRes.data);
            setQuizzes(quizRes.data);
            setProjects(projectRes.data);
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        }
    };



    if (!team) return <div>Loading...</div>;

    return (
        <div className="animate-in container" style={{ padding: '20px 40px' }}>
            <div className="glass-panel" style={{ padding: '60px', marginBottom: '40px', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(0, 0, 0, 0.02) 100%)' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '15px' }}>Hello, <span style={{ color: 'var(--primary)' }}>{team.team_name}</span> 👋</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>You're currently ranked <strong style={{ color: 'var(--text)' }}>#1</strong> on the leaderboard.</p>
                <div className="flex gap-6 mt-8">
                    <div className="glass-panel" style={{ padding: '15px 30px', background: 'rgba(0, 0, 0, 0.03)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Members</span>
                        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{team.members.join(', ')}</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '15px 30px', background: 'rgba(0, 0, 0, 0.03)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Score</span>
                        <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.5rem' }}>{team.final_score}</p>
                    </div>
                </div>
            </div>

            {/* Active Quizzes */}
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Timer color="var(--primary)" /> Active Challenges
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                    {quizzes.filter(q => !q.completed).map((quiz, idx) => (
                        <DashboardCard
                            key={quiz._id}
                            title={quiz.title}
                            icon={Code2}
                            status={false}
                            actionLabel="Start Quiz"
                            onAction={() => navigate(`/quiz/${quiz._id}`)}
                            subtitle={`Time Limit: ${quiz.timeLimit} mins • ${quiz.totalQuestions} Questions`}
                        />
                    ))}

                    {/* Project if not submitted */}
                    {projects.map(proj => !team.project.submitted && (
                        <DashboardCard
                            key={proj._id}
                            title={proj.title}
                            subtitle={`Deadline: Round End • ${proj.timeLimit} mins recommended`}
                            icon={Layers}
                            status={false}
                            actionLabel="Enter Workspace"
                            onAction={() => navigate(`/project-workspace/${proj._id}`)}
                        />
                    ))}

                    {quizzes.filter(q => !q.completed).length === 0 && !team.project.submitted && (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: 'span 2', opacity: 0.7 }}>
                            <p style={{ color: 'var(--text-muted)' }}>No pending quizzes at this moment.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Submissions / Completed */}
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <CheckCircle2 color="var(--accent)" /> Completed Milestones
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                    {quizzes.filter(q => q.completed).map((quiz) => (
                        <DashboardCard
                            key={quiz._id}
                            title={quiz.title}
                            icon={Trophy}
                            status={true}
                            score={quiz.score}
                            disabled={true}
                            subtitle="Evaluation Complete"
                        />
                    ))}

                    {team.project.submitted && (
                        <motion.div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid var(--accent)' }}>
                            <div className="flex justify-between items-start">
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--accent)' }}>
                                    <CheckCircle2 size={24} />
                                </div>
                                <CheckCircle2 color="var(--accent)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem' }}>Project Submitted</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Submission received successfully</p>
                            </div>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                {team.project.score > 0 ? `Score: ${team.project.score}` : 'Pending Evaluation'}
                            </p>
                        </motion.div>
                    )}

                    {quizzes.filter(q => q.completed).length === 0 && !team.project.submitted && (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: 'span 2', opacity: 0.7 }}>
                            <p style={{ color: 'var(--text-muted)' }}>No completed milestones yet. Finish a task to see it here!</p>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

export default TeamDashboard;
