import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../context/AuthContext';
import { Trophy, Medal, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const Leaderboard = () => {
    const [teams, setTeams] = useState([]);
    const [activeQuizzes, setActiveQuizzes] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const [teamRes, quizRes] = await Promise.all([
                axios.get(`${API_BASE}/leaderboard`),
                axios.get(`${API_BASE}/public-quizzes`)
            ]);
            setTeams(teamRes.data);
            setActiveQuizzes(quizRes.data.filter(q => q.isSufficient)); // Only show "Active" quizzes
        };
        fetchData();
    }, []);

    const getRankIcon = (rank) => {
        if (rank === 0) return <Medal color="#fbbf24" size={24} />;
        if (rank === 1) return <Medal color="#94a3b8" size={24} />;
        if (rank === 2) return <Medal color="#d97706" size={24} />;
        return <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>#{rank + 1}</span>;
    };

    const getTeamQuizScore = (team, quizId) => {
        const result = team.quizResults?.find(r => r.quizId === quizId);
        return result ? result.score : 0;
    };

    return (
        <div className="animate-in container" style={{ padding: '20px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                    <Trophy size={80} color="var(--primary)" style={{ marginBottom: '24px' }} />
                </motion.div>
                <h1 style={{ fontSize: '4rem', fontWeight: 800 }}>Final Standings</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>The elite programmers of the seminar.</p>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '20px', textAlign: 'left' }}>Rank</th>
                            <th style={{ padding: '20px', textAlign: 'left' }}>Team Name</th>
                            {activeQuizzes.map(q => (
                                <th key={q._id} style={{ padding: '20px', textAlign: 'center' }}>{q.title}</th>
                            ))}
                            <th style={{ padding: '20px', textAlign: 'center' }}>Project</th>
                            <th style={{ padding: '20px', textAlign: 'right' }}>Final Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team, idx) => (
                            <motion.tr
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={team._id}
                                style={{ borderTop: '1px solid rgba(0,0,0,0.05)', background: idx === 0 ? 'rgba(79,70,229,0.05)' : 'transparent' }}
                            >
                                <td style={{ padding: '20px' }}>{getRankIcon(idx)}</td>
                                <td style={{ padding: '20px', fontWeight: 600 }}>{team.team_name}</td>
                                {activeQuizzes.map(q => (
                                    <td key={q._id} style={{ padding: '20px', textAlign: 'center' }}>{getTeamQuizScore(team, q._id)}</td>
                                ))}
                                <td style={{ padding: '20px', textAlign: 'center' }}>{team.project.score}</td>
                                <td style={{ padding: '20px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem' }}>{team.final_score}</td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                {teams.length === 0 && <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No rankings available yet.</p>}
            </div>
        </div>
    );
};

export default Leaderboard;
