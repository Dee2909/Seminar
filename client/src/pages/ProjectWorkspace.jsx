import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API_BASE } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FileText, Code2, Send, ChevronLeft, Download, ShieldCheck, Play, Terminal, Trash2 } from 'lucide-react';

const ProjectWorkspace = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState('c'); // 'c' or 'python'
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState('');
    const [violations, setViolations] = useState(0);
    const [warning, setWarning] = useState(null);

    // Integrity Refs
    const violationsRef = useRef(0);
    const timeRef = useRef(0);
    const codeRef = useRef('');

    const boilerplates = {
        c: '#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    printf("Hello World\\n");\n    return 0;\n}',
        python: '# Write your Python code here\n\ndef main():\n    print("Hello World")\n\nif __name__ == "__main__":\n    main()'
    };

    useEffect(() => {
        if (!user || user.role !== 'team') {
            navigate('/team/login');
            return;
        }
        fetchProject();

        // --- Integrity Layer ---
        const recordViolation = (type) => {
            const nextV = violationsRef.current + 1;
            violationsRef.current = nextV;
            setViolations(nextV);

            if (nextV >= 3) {
                setWarning('CRITICAL: 3rd Violation Detected. Submitting Workspace...');
                setTimeout(() => handleSubmit(), 1500);
            } else {
                setWarning(`SECURITY ALERT: ${type} detected! (Violation ${nextV}/3). 3 strikes and your project is auto-submitted.`);
            }
        };

        const handleVisibility = () => { if (document.hidden) recordViolation('Tab Switch'); };
        const handleBlur = () => { recordViolation('Window Unfocus'); };

        const handleKeys = (e) => {
            // Block PrintScreen and common screenshot shortcuts
            if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))) {
                e.preventDefault();
                alert('SCREENSHOT PROHIBITED: This action has been logged.');
                recordViolation('Screenshot Attempt');
            }
        };

        const prevent = (e) => e.preventDefault();

        // Add Listeners
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('keydown', handleKeys);
        document.addEventListener('contextmenu', prevent);
        document.addEventListener('copy', prevent);
        document.addEventListener('paste', prevent);
        document.addEventListener('selectstart', prevent);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('keydown', handleKeys);
            document.removeEventListener('contextmenu', prevent);
            document.removeEventListener('copy', prevent);
            document.removeEventListener('paste', prevent);
            document.removeEventListener('selectstart', prevent);
        };
    }, [id]);

    const fetchProject = async () => {
        try {
            const res = await axios.get(`${API_BASE}/team/projects`);
            const current = res.data.find(p => p._id === id);
            if (current) {
                setProject(current);
                setCode(boilerplates.c); // Default to C
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleLanguageChange = (lang) => {
        if (window.confirm(`Switch to ${lang === 'c' ? 'C' : 'Python'}? This will reset your current code.`)) {
            setLanguage(lang);
            setCode(boilerplates[lang]);
            setOutput('');
        }
    };

    const handleRun = async () => {
        try {
            setRunning(true);
            setOutput('Compiling and Running...\n');
            const res = await axios.post(`${API_BASE}/team/run-code`, { code, language });
            setOutput(res.data.output);
        } catch (err) {
            setOutput(`Error: ${err.response?.data?.output || 'Failed to execute code'}`);
        } finally {
            setRunning(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const currentCode = codeRef.current || code;
            const extension = language === 'c' ? 'c' : 'py';
            const blob = new Blob([currentCode], { type: 'text/plain' });
            const file = new File([blob], `solution.${extension}`, { type: 'text/plain' });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('violations', violationsRef.current);

            await axios.post(`${API_BASE}/team/upload`, formData);
            if (!alertShown.current) {
                alert('Workspace submitted successfully!');
                alertShown.current = true;
            }
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            navigate('/dashboard');
        } finally {
            setSubmitting(false);
        }
    };
    const alertShown = useRef(false);

    if (loading) return <div className="p-10 text-center">Loading Workspace...</div>;
    if (!project) return <div className="p-10 text-center">Project not found.</div>;

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
            {/* Workspace Header */}
            <div className="glass-panel" style={{ padding: '15px 30px', margin: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm">
                        <ChevronLeft size={20} /> Back
                    </button>
                    <div style={{ height: '24px', width: '1px', background: '#ddd' }} />
                    <div>
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{project.title} Workspace</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Round Duration: {project.timeLimit} Minutes</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2" style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 600 }}>
                        <ShieldCheck size={18} /> Anti-Plagiarism Enabled
                    </div>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary gap-2"
                        disabled={submitting}
                        style={{ padding: '10px 30px' }}
                    >
                        {submitting ? 'Submitting...' : 'Final Submission'} <Send size={18} />
                    </button>
                </div>
            </div>

            {warning && (
                <div style={{ margin: '0 15px 15px', padding: '12px', background: 'var(--danger)', color: 'white', borderRadius: '10px', textAlign: 'center', fontWeight: 700, animation: 'pulse 2s infinite' }}>
                    ⚠️ {warning}
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
            `}</style>

            {/* Split Screen Area */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '15px', padding: '0 15px 15px', overflow: 'hidden' }}>

                {/* Left Side: Question area */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #eee', background: 'rgba(79, 70, 229, 0.02)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} color="var(--primary)" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Problem Statement</h3>
                    </div>
                    <div style={{ flex: 1, padding: '30px', overflowY: 'auto', fontSize: '1.1rem', lineHeight: '1.8' }}>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>
                            {project.description || 'No detailed description provided for this task.'}
                        </div>

                        {project.pdf_file && (
                            <div style={{ marginTop: '40px', padding: '20px', borderRadius: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                                <p style={{ fontSize: '0.9rem', marginBottom: '12px', fontWeight: 500 }}>Supporting Documents:</p>
                                <a
                                    href={`http://localhost:5001/uploads/${project.pdf_file}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-ghost"
                                    style={{ color: 'var(--primary)', border: '1px solid var(--primary)', width: '100%' }}
                                >
                                    <Download size={18} style={{ marginRight: '10px' }} /> Download PDF Instructions
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e1e1e', color: 'white' }}>
                    <div style={{ padding: '8px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2d2d2d' }}>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Code2 size={16} color="#94a3b8" />
                                <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
                                    {language === 'c' ? 'main.c' : 'script.py'}
                                </span>
                            </div>
                            <div style={{ height: '16px', width: '1px', background: '#444' }} />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleLanguageChange('c')}
                                    className="btn"
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.75rem',
                                        height: 'auto',
                                        background: language === 'c' ? 'var(--primary)' : 'transparent',
                                        color: language === 'c' ? 'white' : '#94a3b8',
                                        border: '1px solid ' + (language === 'c' ? 'var(--primary)' : '#444')
                                    }}
                                >
                                    C
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('python')}
                                    className="btn"
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.75rem',
                                        height: 'auto',
                                        background: language === 'python' ? 'var(--primary)' : 'transparent',
                                        color: language === 'python' ? 'white' : '#94a3b8',
                                        border: '1px solid ' + (language === 'python' ? 'var(--primary)' : '#444')
                                    }}
                                >
                                    Python
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRun}
                                disabled={running}
                                className="btn gap-2"
                                style={{
                                    padding: '6px 18px',
                                    height: 'auto',
                                    background: 'var(--accent)',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: 700
                                }}
                            >
                                {running ? 'Running...' : <><Play size={14} fill="currentColor" /> Run Code</>}
                            </button>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <textarea
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value);
                                codeRef.current = e.target.value;
                            }}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                color: '#d4d4d4',
                                border: 'none',
                                padding: '25px',
                                fontFamily: '"Fira Code", "Courier New", monospace',
                                fontSize: '15px',
                                lineHeight: '1.6',
                                resize: 'none',
                                outline: 'none',
                                width: '100%'
                            }}
                            placeholder="Start coding your solution here..."
                            spellCheck="false"
                        />

                        {/* Console / Terminal area */}
                        <div style={{ height: '200px', background: '#000', borderTop: '2px solid #333', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '8px 20px', background: '#1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                                <div className="flex items-center gap-2" style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <Terminal size={14} /> Output Console
                                </div>
                                <button onClick={() => setOutput('')} className="btn btn-sm" style={{ padding: '2px', color: '#666' }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <div style={{ flex: 1, padding: '15px 25px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '14px', color: '#33ff33', whiteSpace: 'pre-wrap' }}>
                                {output || 'Ready to run... Click "Run Code" to see the output here.'}
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '10px 20px', background: '#252526', borderTop: '1px solid #333', display: 'flex', gap: '15px', fontSize: '0.8rem', color: '#858585' }}>
                        <span>UTF-8</span>
                        <span>{language === 'c' ? 'C (GCC 11)' : 'Python (3.12)'}</span>
                        <span>Ln {code.split('\n').length}, Col {code.length}</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProjectWorkspace;
