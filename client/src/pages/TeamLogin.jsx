import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Key, Users, ArrowLeft } from 'lucide-react';

const TeamLogin = () => {
    const [formData, setFormData] = useState({ team_name: '', password: '' });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(formData, 'team');
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid team name or password');
        }
    };

    return (
        <div className="flex justify-center items-center w-full" style={{ minHeight: '70vh' }}>
            <div className="glass-panel animate-in" style={{ padding: '40px', width: '100%', maxWidth: '450px' }}>
                <Link to="/" className="btn btn-ghost gap-2" style={{ marginBottom: '20px', padding: '8px 12px' }}>
                    <ArrowLeft size={18} /> Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Team Login</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Welcome back, competitors!</p>
                </div>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label><div className="flex items-center gap-2"><Users size={16} /> Team Name</div></label>
                        <input
                            type="text"
                            required
                            placeholder="Enter your team name"
                            value={formData.team_name}
                            onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label><div className="flex items-center gap-2"><Key size={16} /> Password</div></label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', marginTop: '10px' }}>
                        Login to Dashboard
                    </button>
                </form>

                <p className="text-center mt-4" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Don't have a team? <Link to="/team/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create one</Link>
                </p>
            </div>
        </div>
    );
};

export default TeamLogin;
