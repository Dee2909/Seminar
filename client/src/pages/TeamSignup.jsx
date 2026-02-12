import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Users, Key, ListChecks, ArrowLeft } from 'lucide-react';

const TeamSignup = () => {
    const [formData, setFormData] = useState({
        team_name: '',
        password: '',
        membersCount: 5,
        members: ['', '', '', '', '']
    });
    const [error, setError] = useState('');
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedMembers = formData.members.map(m => m.trim()).filter(Boolean);

        if (trimmedMembers.length !== formData.membersCount) {
            setError(`Please enter exactly ${formData.membersCount} member names.`);
            return;
        }

        try {
            await signup({
                team_name: formData.team_name,
                password: formData.password,
                members: trimmedMembers
            });
            navigate('/team/login');
        } catch (err) {
            setError('Team name already exists or registration failed.');
        }
    };

    const handleMembersCountChange = (value) => {
        const count = parseInt(value, 10);
        const current = [...formData.members];
        if (current.length < count) {
            while (current.length < count) current.push('');
        } else if (current.length > count) {
            current.length = count;
        }
        setFormData({
            ...formData,
            membersCount: count,
            members: current
        });
    };

    return (
        <div className="flex justify-center items-center w-full" style={{ padding: '40px 0', minHeight: '80vh' }}>
            <div className="glass-panel animate-in" style={{ padding: '40px', width: '100%', maxWidth: '500px' }}>
                <Link to="/" className="btn btn-ghost gap-2" style={{ marginBottom: '20px', padding: '8px 12px' }}>
                    <ArrowLeft size={18} /> Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Team Registration</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Build your squad and join the race!</p>
                </div>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label><div className="flex items-center gap-2"><Users size={16} /> Team Name</div></label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Code Wizards"
                            value={formData.team_name}
                            onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label><div className="flex items-center gap-2"><Key size={16} /> Set Password</div></label>
                        <input
                            type="password"
                            required
                            placeholder="Min 6 characters"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label><div className="flex items-center gap-2"><ListChecks size={16} /> Number of Members</div></label>
                        <select
                            value={formData.membersCount}
                            onChange={(e) => handleMembersCountChange(e.target.value)}
                        >
                            <option value={5}>5 members</option>
                            <option value={6}>6 members</option>
                        </select>
                    </div>

                    {Array.from({ length: formData.membersCount }).map((_, idx) => (
                        <div className="input-group" key={idx}>
                            <label>Member {idx + 1} Name</label>
                            <input
                                type="text"
                                required
                                placeholder={`Member ${idx + 1}`}
                                value={formData.members[idx] || ''}
                                onChange={(e) => {
                                    const updated = [...formData.members];
                                    updated[idx] = e.target.value;
                                    setFormData({ ...formData, members: updated });
                                }}
                            />
                        </div>
                    ))}
                    <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', marginTop: '10px' }}>
                        Register Team
                    </button>
                </form>

                <p className="text-center mt-4" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Already have a team? <Link to="/team/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default TeamSignup;
