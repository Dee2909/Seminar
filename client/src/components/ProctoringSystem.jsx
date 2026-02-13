import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Camera, Monitor, Mic, ShieldCheck, AlertCircle, Play, Loader2 } from 'lucide-react';

const ProctoringSystem = React.forwardRef(({ isRunning, onReady, onStart, onStop, onPermissionDenied }, ref) => {
    const [status, setStatus] = useState('CHECKING'); // IDLE, CHECKING, READY, RECORDING
    const [previewStream, setPreviewStream] = useState(null);
    const [error, setError] = useState(null);

    const camVideoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);
    const hasRequestedRef = useRef(false);

    // Use refs for streams to avoid re-render loops and dependency issues
    const activeStreamsRef = useRef({ cam: null, screen: null, audio: null });

    const stopAllStreams = useCallback(() => {
        const streams = activeStreamsRef.current;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) { console.error("Error stopping recorder:", e); }
        }
        if (streams.cam) streams.cam.getTracks().forEach(track => { track.stop(); track.enabled = false; });
        if (streams.screen) streams.screen.getTracks().forEach(track => { track.stop(); track.enabled = false; });
        if (streams.audio) streams.audio.getTracks().forEach(track => { track.stop(); track.enabled = false; });

        activeStreamsRef.current = { cam: null, screen: null, audio: null };
        setPreviewStream(null);
    }, []);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        finishRecording: () => {
            return new Promise((resolve) => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.onstop = () => {
                        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
                        stopAllStreams();
                        resolve(blob);
                    };
                    mediaRecorderRef.current.stop();
                } else {
                    stopAllStreams();
                    resolve(null);
                }
            });
        }
    }));

    const requestPermissions = async () => {
        setError(null);
        setStatus('CHECKING');
        try {
            console.log("Requesting AV permissions...");
            const avStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240 },
                audio: true
            });

            console.log("Requesting Screen permissions...");
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            const camStream = new MediaStream(avStream.getVideoTracks());
            const audioStream = new MediaStream(avStream.getAudioTracks());

            activeStreamsRef.current = { cam: camStream, screen: screenStream, audio: audioStream };
            setPreviewStream(camStream);
            setStatus('READY');

            screenStream.getVideoTracks()[0].onended = () => {
                setError("Screen sharing was stopped. This is a violation!");
                if (onPermissionDenied) onPermissionDenied("Screen sharing stopped");
                stopAllStreams();
            };

            if (onReady) onReady();
        } catch (err) {
            console.error("Proctoring Permissions Error:", err);
            setError(err.message || "Permissions for Camera, Microphone, and Screen are required.");
            setStatus('IDLE');
            hasRequestedRef.current = false;
            if (onPermissionDenied) onPermissionDenied(err.message);
        }
    };

    useEffect(() => {
        if (isRunning && !hasRequestedRef.current) {
            hasRequestedRef.current = true;
            requestPermissions();
        }

        return () => {
            stopAllStreams();
        };
    }, [isRunning, stopAllStreams]);

    useEffect(() => {
        if (camVideoRef.current && previewStream) {
            camVideoRef.current.srcObject = previewStream;
        }
    }, [previewStream, status]);

    const startTest = () => {
        try {
            const streams = activeStreamsRef.current;
            if (!streams.screen || !streams.audio) throw new Error("Missing streams");

            const combinedStream = new MediaStream([
                ...streams.screen.getVideoTracks(),
                ...streams.audio.getAudioTracks()
            ]);

            const recorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm;codecs=vp8,opus'
            });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunks.current.push(e.data);
            };

            recorder.onstop = () => {
                if (recordedChunks.current.length > 0) {
                    const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
                    console.log("Recording Saved Locally. Size:", (blob.size / 1024).toFixed(2), "KB");
                    if (onStop) onStop(blob);
                }
            };

            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setStatus('RECORDING');
            if (onStart) onStart();
        } catch (err) {
            console.error("Failed to start recording:", err);
            setError("Recording failed to initialize. Please check hardware.");
        }
    };

    if (error) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', background: 'white', textAlign: 'center' }}>
                    <AlertCircle size={60} color="var(--danger)" style={{ marginBottom: '20px', margin: '0 auto' }} />
                    <h2 style={{ marginBottom: '15px', color: '#1a1a1a' }}>Proctoring Required</h2>
                    <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
                    <button onClick={() => { hasRequestedRef.current = false; requestPermissions(); }} className="btn btn-primary w-full">Enable Now</button>
                    <button onClick={() => window.history.back()} className="btn btn-ghost w-full mt-2" style={{ color: '#999' }}>Go Back</button>
                </div>
            </div>
        );
    }

    if (status === 'CHECKING') {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={60} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ fontWeight: 800 }}>Waiting for Permissions...</h2>
                    <p style={{ color: '#666' }}>Please select "Allow" when the browser asks for Camera and Screen.</p>
                </div>
            </div>
        );
    }

    if (status === 'READY') {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.98)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ maxWidth: '500px', textAlign: 'center', background: 'white', padding: '50px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: '140px', height: '140px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 30px', border: '4px solid var(--success)', background: '#000' }}>
                        <video ref={camVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h1 style={{ marginBottom: '10px', fontWeight: 900 }}>Systems Ready</h1>
                    <p style={{ color: '#666', marginBottom: '40px' }}>Your camera, screen, and audio are verified. You can now begin the test.</p>
                    <button onClick={startTest} className="btn btn-primary" style={{ padding: '18px 50px', fontSize: '1.2rem', borderRadius: '14px', width: '100%' }}>
                        <Play size={20} fill="currentColor" style={{ marginRight: '10px' }} /> Start My Test
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'RECORDING') {
        return (
            <>
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1001 }}>
                    <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.8)', color: 'white', borderRadius: '30px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff4d4d' }} className="animate-pulse" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>REC ACTIVE</span>
                    </div>
                </div>
                <motion.div
                    drag
                    dragConstraints={{ left: -window.innerWidth + 220, right: 0, top: 0, bottom: window.innerHeight - 170 }}
                    style={{ position: 'fixed', bottom: '20px', right: '20px', width: '220px', height: '160px', zIndex: 1001, borderRadius: '16px', overflow: 'hidden', background: '#000', border: '3px solid var(--primary)', cursor: 'grab' }}
                >
                    <video ref={camVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: 'white' }}>Live Preview</div>
                </motion.div>
            </>
        );
    }

    return null;
});

export default ProctoringSystem;
