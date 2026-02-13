import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API_BASE } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FileText, Code2, Send, ChevronLeft, Download, ShieldCheck, Play, Terminal, Trash2 } from 'lucide-react';
import CodeTerminal from '../components/CodeTerminal';
import { io } from 'socket.io-client';
import ProctoringSystem from '../components/ProctoringSystem';

const ProjectWorkspace = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState('c');
    const [code, setCode] = useState('');
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [warning, setWarning] = useState(null);
    const [tabViolations, setTabViolations] = useState(0);
    const [screenshotViolations, setScreenshotViolations] = useState(0);
    const [isTestStarted, setIsTestStarted] = useState(false);

    // Refs
    const tabViolationsRef = useRef(0);
    const screenshotViolationsRef = useRef(0);
    const violationsRef = useRef(0);
    const codeRef = useRef('');
    const codeTerminalRef = useRef(null);
    const socketRef = useRef(null);
    const alertShown = useRef(false);
    const proctoringRef = useRef(null);
    const recordingBlobRef = useRef(null);

    const boilerplates = {
        c: '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}',
        python: 'print("Hello World")'
    };

    useEffect(() => {
        const socket = io(API_BASE.replace('/api', ''), { withCredentials: true });
        socketRef.current = socket;
        socket.on('output', (data) => codeTerminalRef.current?.write(data));
        socket.on('finished', () => {
            setRunning(false);
            codeTerminalRef.current?.writeln('\r\n\x1b[33m--- Finalized ---\x1b[0m\r\n');
        });
        return () => { socket.disconnect(); };
    }, []);

    useEffect(() => {
        if (!user || user.role !== 'team') {
            navigate('/');
            return;
        }
        fetchProject();

        return () => {
            cleanupListeners();
        };
    }, [id]);

    const fetchProject = async () => {
        try {
            const res = await axios.get(`${API_BASE}/team/projects`);
            const current = res.data.find(p => p._id === id);
            if (current) {
                setProject(current);
                setCode(boilerplates.c);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const startTest = () => {
        setIsTestStarted(true);
        // Setup listeners
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('keydown', handleKeys);
        document.addEventListener('contextmenu', prevent);
        document.addEventListener('copy', prevent);
        document.addEventListener('paste', prevent);
    };

    const cleanupListeners = () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('keydown', handleKeys);
        document.removeEventListener('contextmenu', prevent);
        document.removeEventListener('copy', prevent);
        document.removeEventListener('paste', prevent);
    };

    const handleTabViolation = () => {
        const current = tabViolationsRef.current + 1;
        tabViolationsRef.current = current;
        setTabViolations(current);
        violationsRef.current += 1;
        if (current >= 4) {
            setWarning('CRITICAL: 4th Tab Switch. Auto-submitting...');
            handleSubmit();
        } else {
            setWarning(`WARNING: Tab Switch Detected! (${current}/3 allowed).`);
        }
    };

    const handleScreenshotViolation = () => {
        setWarning('CRITICAL: Screenshot Attempt! Auto-submitting...');
        handleSubmit();
    };

    const handleVisibility = () => { if (document.hidden) handleTabViolation(); };
    const handleBlur = () => handleTabViolation();
    const handleKeys = (e) => {
        const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key);
        if (e.key === 'PrintScreen' || isMacScreenshot) {
            e.preventDefault();
            handleScreenshotViolation();
        }
    };
    const prevent = (e) => e.preventDefault();

    const handleRun = () => {
        setRunning(true);
        codeTerminalRef.current?.clear();
        socketRef.current.emit('run-code-start', { code, language });
        setTimeout(() => codeTerminalRef.current?.focus(), 100);
    };

    const handleSubmit = async () => {
        cleanupListeners();
        try {
            setSubmitting(true);

            // 1. Stop proctoring and get blob
            let finalBlob = recordingBlobRef.current;
            if (proctoringRef.current) {
                finalBlob = await proctoringRef.current.finishRecording();
            }

            const extension = language === 'c' ? 'c' : 'py';
            const file = new File([new Blob([codeRef.current || code])], `solution.${extension}`);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', id);
            formData.append('violations', violationsRef.current);

            if (finalBlob) {
                formData.append('recording', finalBlob, `project_${id}_${Date.now()}.webm`);
            }

            await axios.post(`${API_BASE}/team/upload`, formData);
            navigate('/dashboard');
        } catch (err) {
            console.error('Upload Error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Unknown upload error';
            alert(`Submission Failed: ${errorMsg}\n\nPlease check your internet connection or file size.`);
            setSubmitting(false); // Don't navigate away so they can retry
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Workspace...</div>;

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            {isTestStarted ? (
                <>
                    <div className="glass-panel" style={{ padding: '15px 30px', margin: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm"><ChevronLeft size={20} /> Back</button>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{project.title} Workspace</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3" style={{ fontSize: '0.85rem', fontWeight: 600, background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
                                <span style={{ color: tabViolations > 0 ? 'var(--danger)' : '#64748b' }}>Tabs: {tabViolations}/3</span>
                            </div>
                            <button onClick={handleSubmit} className="btn btn-primary gap-2" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Final Submission'} <Send size={18} />
                            </button>
                        </div>
                    </div>

                    {warning && <div style={{ margin: '0 15px 15px', padding: '12px', background: 'var(--danger)', color: 'white', borderRadius: '10px', textAlign: 'center', fontWeight: 700 }}>⚠️ {warning}</div>}

                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '15px', padding: '0 15px 15px', overflow: 'hidden' }}>
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid #eee', background: 'rgba(79, 70, 229, 0.02)' }}>
                                <h3 className="flex items-center gap-2 m-0"><FileText size={20} color="var(--primary)" /> Problem Statement</h3>
                            </div>
                            <div style={{ flex: 1, padding: '30px', overflowY: 'auto', fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                                {project.description}
                            </div>
                        </div>

                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e1e1e', color: 'white' }}>
                            <div style={{ padding: '8px 20px', background: '#2d2d2d', display: 'flex', justifyContent: 'space-between' }}>
                                <div className="flex gap-2">
                                    {['c', 'python'].map(l => (
                                        <button key={l} onClick={() => setLanguage(l)} className="btn btn-sm" style={{ background: language === l ? 'var(--primary)' : 'transparent', color: language === l ? 'white' : '#94a3b8' }}>{l.toUpperCase()}</button>
                                    ))}
                                </div>
                                <button onClick={handleRun} disabled={running} className="btn btn-sm" style={{ background: 'var(--accent)', color: 'white' }}>{running ? 'Running...' : 'Run Code'}</button>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => { setCode(e.target.value); codeRef.current = e.target.value; }}
                                style={{ flex: 1, background: 'transparent', color: '#d4d4d4', border: 'none', padding: '25px', fontFamily: 'monospace', fontSize: '15px', resize: 'none', outline: 'none' }}
                            />
                            <div style={{ height: '250px', background: '#000' }}>
                                <div style={{ padding: '8px 20px', background: '#1a1a1a', fontSize: '0.75rem' }}>Terminal Output</div>
                                <div style={{ flex: 1, height: 'calc(100% - 31px)' }}>
                                    <CodeTerminal ref={codeTerminalRef} onData={(data) => socketRef.current?.emit('input', data)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-pulse" style={{ marginBottom: '20px' }}>
                        <ShieldCheck size={100} color="var(--primary)" />
                    </div>
                    <h1 style={{ fontWeight: 900, marginBottom: '10px' }}>Secure Environment Initializing</h1>
                    <p style={{ color: '#666' }}>Please complete the system check to unlock the workspace.</p>
                </div>
            )}

            <ProctoringSystem
                ref={proctoringRef}
                isRunning={!loading}
                onStart={startTest}
                onStop={(blob) => { recordingBlobRef.current = blob; }}
                onPermissionDenied={() => navigate('/dashboard')}
            />
        </div>
    );
};

export default ProjectWorkspace;
