import { initScene } from './scene.js';
import { GraphRenderer } from './graph-renderer.js';
import { setupInteractions } from './interactions.js';

const ws = new WebSocket('ws://localhost:3000');
const { scene, camera, renderer, controls } = initScene();
const graphRenderer = new GraphRenderer(scene);

let currentMode = 'structure';

// WebSocket message handling
ws.onopen = () => {
    console.log('Connected to ATLAS server');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'node':
            graphRenderer.addNode(message.data);
            break;

        case 'edge':
            graphRenderer.addEdge(message.data);
            break;

        case 'positions':
            graphRenderer.updatePositions(message.data);
            break;

        case 'complete':
            console.log('Analysis complete');
            break;
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Mode switching
document.getElementById('mode-structure').addEventListener('click', () => {
    setMode('structure');
});

document.getElementById('mode-change').addEventListener('click', () => {
    setMode('change');
});

document.getElementById('mode-coupling').addEventListener('click', () => {
    setMode('coupling');
});

function setMode(mode) {
    currentMode = mode;

    // Update UI
    document.querySelectorAll('#controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`mode-${mode}`).classList.add('active');

    // Send mode change to server
    ws.send(JSON.stringify({ type: 'mode', mode }));
}

// Setup interactions
setupInteractions(camera, renderer, controls, graphRenderer);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
