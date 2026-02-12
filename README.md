# SeminarComp - Advanced Programming Competition Platform

SeminarComp is a comprehensive, state-of-the-art web application designed for hosting programming seminars, coding challenges, and real-time quizzes. Built with a focus on integrity, aesthetics, and high performance, it provides an end-to-end solution for organizers and participants.

## 🌟 Key Features

### 👨‍💻 Participant Experience
*   **Integrated Project Workspace**: A professional split-screen IDE-like environment where teams can view problem statements and code solutions (C & Python) side-by-side.
*   **Cloud Code Runtime**: In-browser code execution for C and Python with an integrated output console.
*   **Intelligent Quiz Engine**: Randomized, timed quizzes with rich media support (images) for questions and options.
*   **Real-time Leaderboard**: Live ranking system based on total scores across multiple rounds.
*   **Modern Premium UI**: Built with 'Plus Jakarta Sans' typography, glassmorphism, and smooth Framer Motion animations.

### 🛡️ Security & Integrity (Anti-Cheating)
*   **3-Strike Tab Protection**: Automatic detection of tab switching or window defocusing. Quiz/Project is auto-submitted on the 3rd violation.
*   **Interaction Lockdown**: Disabled right-click, copy-paste, and text selection in critical competition areas.
*   **Screenshot Prevention**: Specialized listeners to intercept and log screenshot commands.
*   **Secure Submissions**: File-based and raw-code submissions with timestamps.

### 🛠️ Administration
*   **Comprehensive Management**: Full control over teams, quizzes, project rounds, and scoring.
*   **Flexible Task Deployment**: Add project rounds with rich text descriptions or PDF documents.
*   **Dynamic Ranking**: Automated score recalculation and final grade management.

## 🚀 Tech Stack

- **Frontend**: React.js, Framer Motion, Lucide-react, Axios
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Security**: JWT-based Authentication, Cross-platform Event Listeners
- **Execution**: Child Process Isolated Execution (GCC for C, Python 3.x)

## 📋 Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)
- GCC (for C code execution)
- Python 3.x (for Python code execution)

## 🛠️ Setup Instructions

### 1. Repository Setup
```bash
git clone https://github.com/Dee2909/Seminar.git
cd Seminar
```

### 2. Backend Configuration
Create a `.env` file in the `server` directory:
```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### 3. Installation
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Running the App
```bash
# Run backend
cd server
npm run dev

# Run frontend
cd client
npm run dev
```

## 📜 License
© 2026 SeminarComp. All rights reserved to Deenan.

Developed and Maintained by **Deenan**.
