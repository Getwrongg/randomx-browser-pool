// Run both apps from a single script.
// Dev mode: starts coordinator (tsx watch) and miner (vite dev).

const { spawn } = require('node:child_process');
const path = require('node:path');

function run(cwd, cmd, args) {
    const p = spawn(cmd, args, {
        cwd,
        shell: true,          // so Windows runs npm scripts fine
        stdio: 'inherit',
        env: process.env
    });
    return p;
}

const root = __dirname;
const coordDir = path.join(root, 'coordinator-node');
const minerDir = path.join(root, 'miner-web');

// 1) Coordinator
const coord = run(coordDir, 'npm', ['run', 'dev']);

// 2) Miner
const miner = run(minerDir, 'npm', ['run', 'dev']);

function shutdown(code = 0) {
    if (coord && !coord.killed) try { coord.kill('SIGINT'); } catch { }
    if (miner && !miner.killed) try { miner.kill('SIGINT'); } catch { }
    process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => shutdown(0));
