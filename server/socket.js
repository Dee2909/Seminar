const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Map to store running processes and their stdin buffers
const processStates = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('run-code-start', async ({ code, language }) => {
            // 1. Cleanup any existing process on this socket
            if (processStates.has(socket.id)) {
                const state = processStates.get(socket.id);
                state.proc.kill();
                processStates.delete(socket.id);
            }

            // 2. Prepare environment
            const id = Date.now() + Math.random().toString(36).substring(7);
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            let sourceFile, execFile;
            let command, args;

            try {
                if (language === 'c') {
                    sourceFile = path.join(tempDir, `run_${id}.c`);
                    execFile = path.join(tempDir, `run_${id}.out`);
                    fs.writeFileSync(sourceFile, code);

                    // Compile first
                    await new Promise((resolve, reject) => {
                        exec(`gcc "${sourceFile}" -o "${execFile}"`, (error, stdout, stderr) => {
                            if (error) {
                                socket.emit('output', stderr || stdout || 'Compilation Error\n');
                                socket.emit('finished');
                                reject('Compilation Failed');
                            } else {
                                resolve();
                            }
                        });
                    });

                    command = execFile;
                    args = [];

                } else if (language === 'python') {
                    sourceFile = path.join(tempDir, `run_${id}.py`);
                    fs.writeFileSync(sourceFile, code);
                    command = 'python3';
                    args = ['-u', sourceFile]; // -u for unbuffered binary stdout/stderr
                } else {
                    socket.emit('output', 'Unsupported language\n');
                    socket.emit('finished');
                    return;
                }

                // 3. Spawn process
                const proc = spawn(command, args);
                processStates.set(socket.id, { proc, buffer: '', sourceFile, execFile });

                socket.emit('output', `\x1b[32mRunning ${language === 'c' ? 'C' : 'Python'} code...\x1b[0m\r\n`);

                // 4. Handle IO
                proc.stdout.on('data', (data) => {
                    socket.emit('output', data.toString());
                });

                proc.stderr.on('data', (data) => {
                    socket.emit('output', `\x1b[31m${data.toString()}\x1b[0m`);
                });

                proc.on('close', (code) => {
                    socket.emit('output', `\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`);
                    socket.emit('finished');

                    const state = processStates.get(socket.id);
                    if (state) {
                        try {
                            if (fs.existsSync(state.sourceFile)) fs.unlinkSync(state.sourceFile);
                            if (state.execFile && fs.existsSync(state.execFile)) fs.unlinkSync(state.execFile);
                        } catch (e) {
                            console.error('Cleanup error:', e);
                        }
                    }
                    processStates.delete(socket.id);
                });

                proc.on('error', (err) => {
                    socket.emit('output', `\x1b[31mError spawning process: ${err.message}\x1b[0m\r\n`);
                    socket.emit('finished');
                });

            } catch (err) {
                if (typeof err === 'string' && err !== 'Compilation Failed') {
                    socket.emit('output', `Setup Error: ${err}\n`);
                    socket.emit('finished');
                }
            }
        });

        socket.on('input', (data) => {
            const state = processStates.get(socket.id);
            if (!state || !state.proc || !state.proc.stdin) return;

            // Basic line-editing simulation for a more "real" terminal feel
            for (let i = 0; i < data.length; i++) {
                const char = data[i];

                if (char === '\r') {
                    // Enter: send buffer + newline to process, then echo newline to terminal
                    state.proc.stdin.write(state.buffer + '\n');
                    socket.emit('output', '\r\n');
                    state.buffer = '';
                } else if (char === '\x7f' || char === '\b') {
                    // Backspace / Delete
                    if (state.buffer.length > 0) {
                        state.buffer = state.buffer.slice(0, -1);
                        socket.emit('output', '\b \b'); // Move back, space, move back
                    }
                } else {
                    // Regular character: append to buffer and echo back to terminal
                    state.buffer += char;
                    socket.emit('output', char);
                }
            }
        });

        socket.on('disconnect', () => {
            if (processStates.has(socket.id)) {
                const state = processStates.get(socket.id);
                state.proc.kill();
                processStates.delete(socket.id);
            }
            console.log(`Socket disconnected: ${socket.id}`);
        });

        socket.on('stop-run', () => {
            if (processStates.has(socket.id)) {
                const state = processStates.get(socket.id);
                state.proc.kill('SIGINT');
            }
        });
    });
};
