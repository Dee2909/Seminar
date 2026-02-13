import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const AuthContext = createContext();

axios.defaults.withCredentials = true;
const API_BASE = `${VITE_API_BASE_URL}/api`;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkToken();
    }, []);

    const checkToken = async () => {
        try {
            const res = await axios.get(`${API_BASE}/me`);
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials, type = 'team') => {
        const endpoint = type === 'admin' ? '/admin/login' : '/team/login';
        const res = await axios.post(`${API_BASE}${endpoint}`, credentials);
        setUser({ ...res.data, role: type });
        return res.data;
    };

    const signup = async (data) => {
        return await axios.post(`${API_BASE}/team/signup`, data);
    };

    const logout = async () => {
        await axios.post(`${API_BASE}/logout`);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
export { API_BASE };
