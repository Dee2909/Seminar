import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API_BASE } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Send, ChevronRight, HelpCircle, ShieldAlert } from 'lucide-react';

const QuizPage = () => {
    const { num } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [time, setTime] = useState(600); // 10 minutes
    const [loading, setLoading] = useState(true);
    const [quizInfo, setQuizInfo] = useState(null);
    const [violations, setViolations] = useState(0);
    const [warning, setWarning] = useState(null);

    // Refs to avoid stale closures in event listeners
    const violationsRef = useRef(0);
    const answersRef = useRef({});
    const questionsRef = useRef([]);
    const timeRef = useRef(0);

    const { user } = useAuth();

    useEffect(() => {
        if (!user || user.role !== 'team') {
            navigate('/team/login');
            return;
        }
        const initQuiz = async () => {
            await fetchQuizData();
        };
        initQuiz();
    }, [user, navigate]);

    const fetchQuizData = async () => {
        try {
            const res = await axios.get(`${API_BASE}/team/questions?quizId=${num}`);
            const all = Array.isArray(res.data) ? res.data : [];

            // We also need quiz static info (total questions, time limit)
            const quizInfoRes = await axios.get(`${API_BASE}/team/quiz/${num}`);
            const currentQuiz = quizInfoRes.data;

            if (!currentQuiz || all.length === 0) {
                setQuestions([]);
                setLoading(false);
                return;
            }

            setQuizInfo(currentQuiz);
            setTime((currentQuiz.timeLimit || 10) * 60);

            let shuffledQuestions = [...all].sort(() => Math.random() - 0.5);
            shuffledQuestions = shuffledQuestions.slice(0, currentQuiz.totalQuestions).map(q => {
                const keys = ['A', 'B', 'C', 'D'];
                return {
                    ...q,
                    shuffledOptionKeys: keys.sort(() => Math.random() - 0.5)
                };
            });

            setQuestions(shuffledQuestions);
            questionsRef.current = shuffledQuestions;
            setLoading(false);

            // Start timer after loading
            const timer = setInterval(() => {
                setTime(prev => {
                    const next = prev <= 1 ? 0 : prev - 1;
                    timeRef.current = next;
                    if (next === 0) {
                        clearInterval(timer);
                        handleSubmit();
                    }
                    return next;
                });
            }, 1000);

            // --- Protection Layers ---

            // 1. Fullscreen Enforcement
            const enterFullscreen = () => {
                const doc = document.documentElement;
                if (doc.requestFullscreen) doc.requestFullscreen();
                else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();
                else if (doc.msRequestFullscreen) doc.msRequestFullscreen();
            };

            // Attempt to enter fullscreen (requires user interaction, but we can try)
            enterFullscreen();

            const handleFullscreenChange = () => {
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    setViolations(v => {
                        const nextV = v + 1;
                        if (nextV >= 3) {
                            handleSubmit();
                            return nextV;
                        }
                        setWarning('WARNING: Fullscreen exited! Staying in fullscreen is mandatory. 3 strikes and you are out.');
                        return nextV;
                    });
                }
            };
            document.addEventListener('fullscreenchange', handleFullscreenChange);
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

            // 2. Tab Switch / Window Blur Detection
            const recordViolation = (type) => {
                const nextV = violationsRef.current + 1;
                violationsRef.current = nextV;
                setViolations(nextV);

                if (nextV >= 3) {
                    setWarning('PERMANENT DISQUALIFICATION: Too many violations. Submitting...');
                    setTimeout(() => handleSubmit(), 1500);
                } else {
                    setWarning(`CRITICAL WARNING: ${type} detected! (Violation ${nextV}/3). 3 strikes and your quiz is auto-submitted.`);
                }
            };

            const handleVisibilityChange = () => {
                if (document.hidden) recordViolation('Tab Switch');
            };

            const handleBlur = () => {
                recordViolation('Window Blur/Unfocus');
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleBlur);

            // 3. Disable Right Click, Copy, Paste
            const preventDefault = (e) => e.preventDefault();
            document.addEventListener('contextmenu', preventDefault);
            document.addEventListener('copy', preventDefault);
            document.addEventListener('paste', preventDefault);
            document.addEventListener('selectstart', preventDefault);

            return () => {
                clearInterval(timer);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('blur', handleBlur);
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
                document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
                document.removeEventListener('contextmenu', preventDefault);
                document.removeEventListener('copy', preventDefault);
                document.removeEventListener('paste', preventDefault);
                document.removeEventListener('selectstart', preventDefault);
            };
        } catch (err) {
            console.error('Failed to load quiz', err);
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        let score = 0;
        let answered = 0;
        let skipped = 0;

        // Use Refs to get latest values, especially if called from stale listeners
        const currentAnswers = answersRef.current;
        const currentQuestions = questionsRef.current;
        const currentViolations = violationsRef.current;
        const currentTime = timeRef.current;

        currentQuestions.forEach((q, idx) => {
            if (currentAnswers[idx]) {
                answered++;
                if (currentAnswers[idx] === q.correct_answer) score += 10;
            } else {
                skipped++;
            }
        });

        try {
            await axios.post(`${API_BASE}/team/quiz`, {
                quizId: num,
                score,
                time_remaining: currentTime,
                questionsAnswered: answered,
                questionsSkipped: skipped,
                violations: currentViolations
            });
            navigate('/dashboard');
        } catch (err) {
            console.error('Submission failed', err);
            navigate('/dashboard');
        }
    };

    if (loading) return <div className="text-center mt-4">Loading Quiz...</div>;
    if (questions.length === 0) return <div className="text-center mt-4">No questions found for this quiz.</div>;

    const currentQ = questions[currentIndex];
    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="flex flex-col items-center w-full" style={{ padding: '40px 20px' }}>
            <div className="flex justify-between items-center glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '15px 30px', marginBottom: '30px' }}>
                <h2 className="flex items-center gap-2"><HelpCircle color="var(--primary)" /> Question {currentIndex + 1} of {questions.length}</h2>
                <div className="flex items-center gap-2" style={{ color: time < 60 ? 'var(--danger)' : 'var(--accent)', fontWeight: 800, fontSize: '1.2rem' }}>
                    <Clock size={20} /> {formatTime(time)}
                </div>
            </div>

            {warning && (
                <div className="animate-in" style={{ width: '100%', maxWidth: '900px', padding: '15px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', border: '1px solid var(--danger)', fontWeight: 600 }}>
                    {warning}
                </div>
            )}

            <div style={{ width: '100%', maxWidth: '900px' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-panel"
                        style={{ padding: '40px' }}
                    >
                        <h1 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>{currentQ.question}</h1>

                        {currentQ.question_image && (
                            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                                <img
                                    src={`http://localhost:5001/uploads/${currentQ.question_image}`}
                                    alt="Question Visual"
                                    style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '15px' }}>
                            {(currentQ.shuffledOptionKeys || ['A', 'B', 'C', 'D']).map(opt => (
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    key={opt}
                                    onClick={() => {
                                        const newAnswers = { ...answers, [currentIndex]: opt };
                                        setAnswers(newAnswers);
                                        answersRef.current = newAnswers;
                                    }}
                                    className={`btn ${answers[currentIndex] === opt ? 'btn-primary' : 'btn-ghost'}`}
                                    style={{
                                        justifyContent: 'flex-start',
                                        padding: '15px',
                                        border: answers[currentIndex] === opt ? 'none' : '1px solid #e2e8f0',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        height: 'auto'
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span style={{ fontWeight: 800, marginRight: '15px', color: answers[currentIndex] === opt ? 'white' : 'var(--primary)' }}>{opt}.</span>
                                        {currentQ.options[opt]}
                                    </div>
                                    {currentQ.options_images?.[opt] && (
                                        <img
                                            src={`http://localhost:5001/uploads/${currentQ.options_images[opt]}`}
                                            alt={`Option ${opt}`}
                                            style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                                        />
                                    )}
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleNext}
                                className="btn btn-primary gap-2"
                                style={{ padding: '15px 40px' }}
                                disabled={!answers[currentIndex]}
                            >
                                {currentIndex === questions.length - 1 ? 'Finish & Submit' : 'Next Question'} <ChevronRight size={18} />
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QuizPage;
