const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema(
    {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        input: { type: String, required: true }, // Input for the test case
        expectedOutput: { type: String, required: true }, // Expected output
        points: { type: Number, default: 10 }, // Points for this test case
        isHidden: { type: Boolean, default: false }, // Hidden test cases not shown to students
        description: { type: String } // Optional description of what this test case checks
    },
    { timestamps: true }
);

module.exports = mongoose.model('TestCase', TestCaseSchema);
