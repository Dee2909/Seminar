import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, User, ArrowLeft } from 'lucide-react';

const AdminLogin = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(formData, 'admin');
            navigate('/admin');
        } catch (err) {
            setError('Invalid admin credentials');
        }
    };

    return (
        <div className="flex justify-center items-center w-full" style={{ minHeight: '70vh' }}>
            <div className="glass-panel animate-in" style={{ padding: '40px', width: '100%', maxWidth: '400px', borderTop: '4px solid var(--primary)' }}>
                <Link to="/" className="btn btn-ghost gap-2" style={{ marginBottom: '20px', padding: '8px 12px' }}>
                    <ArrowLeft size={18} /> Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <ShieldCheck size={48} color="var(--primary)" style={{ marginBottom: '15px' }} />
                    <h2 style={{ fontSize: '1.8rem' }}>Admin Portal</h2>
                </div>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label><div className="flex items-center gap-2"><User size={16} /> Username</div></label>
                        <input type="text" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label><div className="flex items-center gap-2"><Lock size={16} /> Password</div></label>
                        <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%' }}>
                        Access Control Panel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
