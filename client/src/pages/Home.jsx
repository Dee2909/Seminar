import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MousePointer2, Code, Zap, Users } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, desc }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="glass-panel"
        style={{ padding: '30px', flex: 1, minWidth: '250px' }}
    >
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--primary)' }}>
            <Icon size={24} />
        </div>
        <h3 style={{ marginBottom: '10px' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{desc}</p>
    </motion.div>
);

const Home = () => {
    return (
        <div className="animate-in w-full">
            <section style={{ textAlign: 'center', padding: '150px 60px', background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, transparent 75%)' }}>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: '5rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.1 }}>
                    Master the <span style={{ color: 'var(--primary)' }}>Code</span>. <br />
                    Win the Competition.
                </motion.h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.4rem', maxWidth: '800px', margin: '0 auto 48px', fontWeight: 400 }}>
                    Join the ultimate programming seminar challenge. Test your skills in C and Python, upload your best projects, and climb the leaderboard.
                </p>
                <div className="flex justify-center gap-6">
                    <Link to="/team/signup" className="btn btn-primary" style={{ padding: '20px 50px', fontSize: '1.2rem', borderRadius: '14px' }}>
                        Get Started
                    </Link>
                    <Link to="/leaderboard" className="btn btn-ghost" style={{ padding: '20px 50px', fontSize: '1.2rem', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                        View Leaderboard
                    </Link>
                </div>
            </section>

            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginTop: '60px', paddingBottom: '100px' }}>
                <FeatureCard
                    icon={Zap}
                    title="Real-time Quizzes"
                    desc="Test your knowledge with timed challenges in C and Python programming languages. Instant feedback and live scoring."
                />
                <FeatureCard
                    icon={Code}
                    title="Project Showcase"
                    desc="Submit your creative projects and get scored by experts based on code quality, innovation, and implementation details."
                />
                <FeatureCard
                    icon={Users}
                    title="Team Collaboration"
                    desc="Form teams of 5-6 members and work together to achieve the highest rank. Experience the power of collaborative coding."
                />
            </div>
        </div>
    );
};

export default Home;
