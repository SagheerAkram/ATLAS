#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import open from 'open';
import { startServer } from './backend/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoPath = process.argv[2] || '.';
const absolutePath = resolve(process.cwd(), repoPath);

const PORT = 3000;
const url = `http://localhost:${PORT}`;

console.log('ATLAS');
console.log(`Analyzing: ${absolutePath}`);
console.log(`Opening: ${url}\n`);

// Start server (begins streaming immediately)
startServer(absolutePath, PORT);

// Launch browser immediately (before analysis completes)
setTimeout(() => {
  open(url);
}, 500);
