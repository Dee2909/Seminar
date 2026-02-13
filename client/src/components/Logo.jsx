import React from 'react';

const Logo = ({ size = 32, className = "" }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`} style={{ userSelect: 'none' }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                {/* Glow effect */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '120%',
                    height: '120%',
                    background: 'radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, rgba(79, 70, 229, 0) 70%)',
                    borderRadius: '50%',
                    filter: 'blur(4px)'
                }}></div>

                {/* Main SVG Icon */}
                <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                >
                    <defs>
                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="logoGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Hexagon Base */}
                    <path
                        d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z"
                        fill="url(#logoGradient)"
                        fillOpacity="0.1"
                        stroke="url(#logoGradient)"
                        strokeWidth="3"
                    />

                    {/* Inner Trophy Element */}
                    <path
                        d="M35 30H65V45C65 53.2843 58.2843 60 50 60C41.7157 60 35 53.2843 35 45V30Z"
                        stroke="url(#logoGradient)"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M50 60V75"
                        stroke="url(#logoGradient2)"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M35 75H65"
                        stroke="url(#logoGradient2)"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />

                    {/* Code bits / accent */}
                    <rect x="42" y="38" width="16" height="4" rx="2" fill="url(#logoGradient2)" />
                    <circle cx="50" cy="50" r="3" fill="url(#logoGradient2)" />
                </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{
                    fontSize: size * 0.7,
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    Seminar<span style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>Comp</span>
                </span>
                <span style={{
                    fontSize: size * 0.25,
                    fontWeight: 600,
                    opacity: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    marginTop: '2px'
                }}>
                    Pro Excellence
                </span>
            </div>
        </div>
    );
};

export default Logo;
