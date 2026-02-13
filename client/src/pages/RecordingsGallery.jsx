import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, FileVideo, Calendar, HardDrive, Download, X } from 'lucide-react';
import { useAuth, API_BASE } from '../context/AuthContext';

const RecordingsGallery = () => {
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const { user } = useAuth();
    
    // Construct video base URL from the shared API_BASE (removes /api and adds /uploads/)
    const VIDEO_BASE = API_BASE.replace('/api', '') + '/uploads/';

    useEffect(() => {
        fetchRecordings();
    }, []);

    const fetchRecordings = async () => {
        try {
            const res = await axios.get(`${API_BASE}/admin/gridfs-files`, { withCredentials: true });
            setRecordings(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="container py-10">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bolder mb-2 gap-2 flex items-center">
                        <FileVideo size={32} />
                        Cloud Recordings Gallery
                    </h1>
                    <p className="text-muted">
                        Streaming directly from MongoDB GridFS Cloud Storage.
                        Total Recordings: {recordings.length}
                    </p>
                </div>
            </div>

            {recordings.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <FileVideo size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-500">No Recordings Found</h3>
                    <p className="text-gray-400">All student recordings will appear here automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recordings.map((rec) => (
                        <motion.div
                            key={rec._id}
                            whileHover={{ y: -5 }}
                            className="glass-panel p-0 overflow-hidden cursor-pointer group"
                            onClick={() => setSelectedVideo(rec)}
                        >
                            {/* Thumbnail Placeholder */}
                            <div className="h-48 bg-slate-900 flex items-center justify-center relative">
                                <FileVideo size={40} className="text-slate-600 group-hover:opacity-50 transition-all" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <div className="bg-primary text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                        <Play size={24} fill="currentColor" />
                                    </div>
                                </div>
                                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    {rec.sizeMB} MB
                                </span>
                            </div>

                            <div className="p-5">
                                <h3 className="font-bold text-lg mb-2 truncate" title={rec.filename}>
                                    {rec.filename}
                                </h3>
                                <div className="flex items-center justify-between text-sm text-muted">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {new Date(rec.uploadDate).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <HardDrive size={14} />
                                        mongoDB
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Video Modal */}
            <AnimatePresence>
                {selectedVideo && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-5xl bg-black rounded-lg overflow-hidden relative shadow-2xl"
                        >
                            <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
                                <h3 className="text-white font-semibold truncate pr-4">{selectedVideo.filename}</h3>
                                <button
                                    onClick={() => setSelectedVideo(null)}
                                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="aspect-video bg-black relative">
                                <video
                                    src={`${VIDEO_BASE}${selectedVideo.filename}`}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                    onError={(e) => console.error("Video Error:", e)}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>

                            <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-end gap-3">
                                <a 
                                    href={`${VIDEO_BASE}${selectedVideo.filename}`} 
                                    download 
                                    className="btn btn-ghost text-white gap-2 hover:bg-white/10"
                                >
                                    <Download size={18} /> Download
                                </a>
                                <button
                                    onClick={() => setSelectedVideo(null)}
                                    className="btn btn-primary ml-auto"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecordingsGallery;
