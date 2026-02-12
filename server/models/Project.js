const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        timeLimit: { type: Number, required: true }, // in minutes
        description: { type: String }, // For text-based question
        pdf_file: { type: String }, // Optional PDF
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
