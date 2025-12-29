import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scanRepository } from './analysis/scanner.js';
import { analyzeDependencies } from './analysis/dependency-analyzer.js';
import { analyzeGitHistory } from './analysis/git-analyzer.js';
import { computeCentrality } from './analysis/centrality.js';
import { LayoutEngine } from './analysis/layout-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function startServer(repoPath, port) {
    const server = createServer((req, res) => {
        // Serve frontend files
        const frontendDir = join(__dirname, '../frontend');
        let filePath;

        if (req.url === '/') {
            filePath = join(frontendDir, 'index.html');
        } else if (req.url.startsWith('/js/')) {
            filePath = join(frontendDir, req.url);
        } else if (req.url === '/style.css') {
            filePath = join(frontendDir, 'style.css');
        } else {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        try {
            const content = readFileSync(filePath);
            const ext = filePath.split('.').pop();
            const contentType = {
                'html': 'text/html',
                'css': 'text/css',
                'js': 'application/javascript'
            }[ext] || 'text/plain';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        } catch (err) {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        console.log('Client connected');

        // Graph state
        const graph = {
            nodes: new Map(),
            edges: []
        };

        const layoutEngine = new LayoutEngine();

        // Stream analysis results incrementally
        analyzeRepository(repoPath, {
            onFile: (file) => {
                const nodeId = file.path;
                graph.nodes.set(nodeId, {
                    id: nodeId,
                    path: file.path,
                    size: file.size,
                    centrality: 0,
                    churn: 0,
                    dependencies: 0
                });

                ws.send(JSON.stringify({
                    type: 'node',
                    data: graph.nodes.get(nodeId)
                }));
            },

            onEdge: (edge) => {
                graph.edges.push(edge);
                ws.send(JSON.stringify({
                    type: 'edge',
                    data: edge
                }));

                // Update centrality incrementally
                const centrality = computeCentrality(graph);
                for (const [nodeId, score] of centrality.entries()) {
                    const node = graph.nodes.get(nodeId);
                    if (node) {
                        node.centrality = score;
                    }
                }
            },

            onGitData: (gitData) => {
                // Update nodes with git metadata
                for (const [path, data] of Object.entries(gitData)) {
                    const node = graph.nodes.get(path);
                    if (node) {
                        node.churn = data.churn || 0;
                        node.cochanges = data.cochanges || [];
                    }
                }

                // Create co-change edges
                for (const [path, data] of Object.entries(gitData)) {
                    if (data.cochanges) {
                        for (const cochange of data.cochanges) {
                            // Only create edge if both nodes exist and count is significant
                            if (graph.nodes.has(path) && graph.nodes.has(cochange.file) && cochange.count >= 3) {
                                const edgeId = `${path}-${cochange.file}`;
                                const reverseEdgeId = `${cochange.file}-${path}`;

                                // Avoid duplicate edges
                                if (!graph.edges.find(e =>
                                    (e.source === path && e.target === cochange.file) ||
                                    (e.source === cochange.file && e.target === path)
                                )) {
                                    const edge = {
                                        source: path,
                                        target: cochange.file,
                                        type: 'cochange',
                                        weight: Math.min(cochange.count / 10, 3) // Normalize weight
                                    };

                                    graph.edges.push(edge);
                                    ws.send(JSON.stringify({
                                        type: 'edge',
                                        data: edge
                                    }));
                                }
                            }
                        }
                    }
                }
            },

            onComplete: () => {
                console.log('Analysis complete');
                ws.send(JSON.stringify({ type: 'complete' }));
            }
        });

        // Stream layout updates
        setInterval(() => {
            const positions = layoutEngine.step(graph);
            ws.send(JSON.stringify({
                type: 'positions',
                data: positions
            }));
        }, 50); // 20 FPS

        // Handle mode changes
        ws.on('message', (message) => {
            const msg = JSON.parse(message);
            if (msg.type === 'mode') {
                layoutEngine.setMode(msg.mode);
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });

    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

async function analyzeRepository(repoPath, callbacks) {
    // Scan files (streams immediately)
    const files = await scanRepository(repoPath, callbacks.onFile);

    // Analyze dependencies (streams edges)
    await analyzeDependencies(files, callbacks.onEdge);

    // Analyze git history
    const gitData = await analyzeGitHistory(repoPath);
    callbacks.onGitData(gitData);

    callbacks.onComplete();
}
