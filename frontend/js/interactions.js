import * as THREE from 'three';

export function setupInteractions(camera, renderer, controls, graphRenderer) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('tooltip');

    let hoveredNode = null;

    // Mouse move for hover
    renderer.domElement.addEventListener('mousemove', (event) => {
        // Update mouse position
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Raycast
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(graphRenderer.getNodeMeshes());

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const nodeId = mesh.userData.nodeId;

            if (hoveredNode !== nodeId) {
                hoveredNode = nodeId;

                // Show tooltip
                const nodeData = graphRenderer.getNodeData(nodeId);
                tooltip.innerHTML = `
          <strong>${nodeData.path}</strong><br>
          Centrality: ${(nodeData.centrality || 0).toFixed(3)}<br>
          Churn: ${nodeData.churn || 0}
        `;
                tooltip.classList.add('visible');

                // Highlight node
                mesh.material.emissive.setHex(0x4488ff);
            }

            // Position tooltip
            tooltip.style.left = event.clientX + 15 + 'px';
            tooltip.style.top = event.clientY + 15 + 'px';

        } else {
            if (hoveredNode) {
                // Unhighlight previous node
                const mesh = graphRenderer.nodeMeshes.get(hoveredNode);
                if (mesh) {
                    mesh.material.emissive.setHex(0x2244aa);
                }
                hoveredNode = null;
            }

            tooltip.classList.remove('visible');
        }
    });

    // Click for drill-down
    renderer.domElement.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(graphRenderer.getNodeMeshes());

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const nodeData = graphRenderer.getNodeData(mesh.userData.nodeId);

            console.log('Clicked node:', nodeData);

            // Focus camera on node
            const targetPos = mesh.position.clone();
            const distance = 30;
            const direction = camera.position.clone().sub(controls.target).normalize();
            const newCameraPos = targetPos.clone().add(direction.multiplyScalar(distance));

            // Smooth camera transition
            animateCamera(camera, controls, newCameraPos, targetPos);
        }
    });
}

function animateCamera(camera, controls, targetPosition, targetLookAt) {
    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();
    const duration = 1000; // ms
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        camera.position.lerpVectors(startPos, targetPosition, eased);
        controls.target.lerpVectors(startLookAt, targetLookAt, eased);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    update();
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
