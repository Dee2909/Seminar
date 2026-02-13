import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API_BASE } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Send, ChevronRight, HelpCircle, ShieldAlert, Activity } from 'lucide-react';
import ProctoringSystem from '../components/ProctoringSystem';

const QuizPage = () => {
    const { num } = useParams();
    const navigate = useNavigate();

    // State
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [time, setTime] = useState(600);
    const [loading, setLoading] = useState(true);
    const [quizInfo, setQuizInfo] = useState(null);
    const [violations, setViolations] = useState(0);
    const [warning, setWarning] = useState(null);
    const [isQuizStarted, setIsQuizStarted] = useState(false);

    // Refs
    const violationsRef = useRef(0);
    const answersRef = useRef({});
    const questionsRef = useRef([]);
    const timeRef = useRef(0);
    const timerRef = useRef(null);
    const recordingBlobRef = useRef(null);
    const proctoringRef = useRef(null);

    const { user } = useAuth();

    useEffect(() => {
        if (!user || user.role !== 'team') {
            navigate('/');
            return;
        }
        fetchQuizData();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            cleanupListeners();
        };
    }, [user, navigate]);

    const fetchQuizData = async () => {
        try {
            const res = await axios.get(`${API_BASE}/team/questions?quizId=${num}`);
            const all = Array.isArray(res.data) ? res.data : [];

            const quizInfoRes = await axios.get(`${API_BASE}/team/quiz/${num}`);
            if (quizInfoRes.data) {
                setQuizInfo(quizInfoRes.data);
                setTime((quizInfoRes.data.timeLimit || 10) * 60);
            }

            if (all.length > 0) {
                let shuffled = [...all].sort(() => Math.random() - 0.5);
                shuffled = shuffled.slice(0, quizInfoRes.data?.totalQuestions || 10).map(q => ({
                    ...q,
                    shuffledOptionKeys: ['A', 'B', 'C', 'D'].sort(() => Math.random() - 0.5)
                }));
                setQuestions(shuffled);
                questionsRef.current = shuffled;
            }
            setLoading(false);
        } catch (err) {
            console.error('Failed to load quiz', err);
            setLoading(false);
        }
    };

    const startQuiz = () => {
        setIsQuizStarted(true);

        // Fullscreen
        const doc = document.documentElement;
        if (doc.requestFullscreen) doc.requestFullscreen();
        else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();

        // Timer
        timerRef.current = setInterval(() => {
            setTime(prev => {
                const next = prev <= 1 ? 0 : prev - 1;
                timeRef.current = next;
                if (next === 0) {
                    clearInterval(timerRef.current);
                    handleSubmit();
                }
                return next;
            });
        }, 1000);

        // Listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('copy', preventDefault);
        document.addEventListener('paste', preventDefault);
        document.addEventListener('selectstart', preventDefault);
    };

    const cleanupListeners = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('contextmenu', preventDefault);
        document.removeEventListener('copy', preventDefault);
        document.removeEventListener('paste', preventDefault);
        document.removeEventListener('selectstart', preventDefault);
    };

    const handleFullscreenChange = () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            recordViolation('Fullscreen Exit');
        }
    };

    const recordViolation = (type) => {
        const nextV = violationsRef.current + 1;
        violationsRef.current = nextV;
        setViolations(nextV);

        if (nextV >= 3) {
            setWarning('DISQUALIFIED: Too many violations. Submitting...');
            setTimeout(() => handleSubmit(), 1000);
        } else {
            setWarning(`WARNING: ${type} detected! (${nextV}/3). Avoid switching tabs or exiting fullscreen.`);
        }
    };

    const handleVisibilityChange = () => { if (document.hidden) recordViolation('Tab Switch'); };
    const handleBlur = () => recordViolation('Window Blur');
    const preventDefault = (e) => e.preventDefault();

    const handleSubmit = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        cleanupListeners();

        // 1. Stop proctoring and get blob
        let finalBlob = recordingBlobRef.current;
        if (proctoringRef.current) {
            finalBlob = await proctoringRef.current.finishRecording();
        }

        let score = 0;
        let answered = 0;
        const currentAnswers = answersRef.current;
        const currentQuestions = questionsRef.current;

        currentQuestions.forEach((q, idx) => {
            if (currentAnswers[idx]) {
                answered++;
                if (currentAnswers[idx] === q.correct_answer) score += 10;
            }
        });

        const formData = new FormData();
        formData.append('quizId', num);
        formData.append('score', score);
        formData.append('time_remaining', timeRef.current || 0);
        formData.append('questionsAnswered', answered);
        formData.append('questionsSkipped', (currentQuestions?.length || 0) - answered);
        formData.append('violations', violationsRef.current);

        if (finalBlob) {
            formData.append('recording', finalBlob, `quiz_${num}_${Date.now()}.webm`);
        }

        try {
            await axios.post(`${API_BASE}/team/quiz`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/dashboard');
        } catch (err) {
            console.error('Submission failed', err);
            navigate('/dashboard');
        }
    };

    if (loading) return <div className="text-center mt-10">Loading Quiz Data...</div>;

    return (
        <div className="flex flex-col items-center w-full" style={{ padding: '40px 20px', minHeight: '100vh', background: '#f8fafc' }}>
            {isQuizStarted ? (
                <>
                    <div className="flex justify-between items-center glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '15px 30px', marginBottom: '30px', background: 'white' }}>
                        <h2 className="flex items-center gap-2"><HelpCircle color="var(--primary)" /> Question {currentIndex + 1} of {questions.length}</h2>
                        <div className="flex items-center gap-2" style={{ color: time < 60 ? 'var(--danger)' : 'var(--accent)', fontWeight: 800, fontSize: '1.2rem' }}>
                            <Clock size={20} /> {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    {warning && (
                        <div className="animate-in" style={{ width: '100%', maxWidth: '900px', padding: '15px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', border: '1px solid var(--danger)', fontWeight: 600 }}>
                            {warning}
                        </div>
                    )}

                    <div style={{ width: '100%', maxWidth: '900px' }}>
                        <AnimatePresence mode="wait">
                            <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel" style={{ padding: '40px', background: 'white' }}>
                                <h1 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>{questions[currentIndex]?.question}</h1>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {questions[currentIndex]?.shuffledOptionKeys.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                const newAns = { ...answers, [currentIndex]: opt };
                                                setAnswers(newAns);
                                                answersRef.current = newAns;
                                            }}
                                            className={`btn ${answers[currentIndex] === opt ? 'btn-primary' : 'btn-ghost'}`}
                                            style={{ textAlign: 'left', border: '1px solid #e2e8e0', justifyContent: 'flex-start' }}
                                        >
                                            <span style={{ fontWeight: 800, marginRight: '10px' }}>{opt}.</span>
                                            {questions[currentIndex].options[opt]}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-end mt-8">
                                    <button
                                        onClick={() => currentIndex < questions.length - 1 ? setCurrentIndex(currentIndex + 1) : handleSubmit()}
                                        className="btn btn-primary gap-2"
                                        disabled={!answers[currentIndex]}
                                    >
                                        {currentIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'} <ChevronRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', marginTop: '100px' }}>
                    <Activity size={80} color="var(--primary)" className="animate-pulse mb-6" />
                    <h1 style={{ fontWeight: 900 }}>Secure Browser Initialized</h1>
                    <p style={{ color: '#666' }}>Waiting for proctoring systems to stabilize...</p>
                </div>
            )}

            <ProctoringSystem
                ref={proctoringRef}
                isRunning={!loading}
                onStart={startQuiz}
                onStop={(blob) => { recordingBlobRef.current = blob; }}
                onPermissionDenied={() => navigate('/dashboard')}
            />
        </div>
    );
};

export default QuizPage;
