import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

const CodeTerminal = forwardRef(({ onData, onResize }, ref) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);

    useImperativeHandle(ref, () => ({
        write: (data) => {
            xtermRef.current?.write(data);
        },
        clear: () => {
            xtermRef.current?.clear();
        },
        fit: () => {
            if (terminalRef.current && terminalRef.current.offsetHeight > 0) {
                fitAddonRef.current?.fit();
            }
        },
        focus: () => {
            xtermRef.current?.focus();
        },
        writeln: (data) => {
            xtermRef.current?.writeln(data);
        }
    }));

    useEffect(() => {
        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: '"Fira Code", monospace',
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#ffffff40'
            },
            convertEol: true // Important for handling \n properly
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);

        // Use a small delay to ensure the container is rendered and has dimensions
        // This prevents "dimensions of undefined" errors in xterm-addon-fit
        setTimeout(() => {
            if (terminalRef.current && terminalRef.current.offsetHeight > 0) {
                fitAddon.fit();
            }
        }, 100);

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Handle input
        term.onData((data) => {
            if (onData) onData(data);
        });

        // Handle resize
        const handleResize = () => {
            if (terminalRef.current && terminalRef.current.offsetHeight > 0) {
                fitAddon.fit();
                if (onResize) onResize(term.cols, term.rows);
            }
        };
        window.addEventListener('resize', handleResize);

        // Initial welcome message
        term.writeln('\x1b[33mTerminal Ready. Click "Run Code" to start.\x1b[0m');

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
        };
    }, []);

    return (
        <div
            ref={terminalRef}
            style={{ width: '100%', height: '100%', overflow: 'hidden', padding: '5px' }}
        />
    );
});

export default CodeTerminal;
