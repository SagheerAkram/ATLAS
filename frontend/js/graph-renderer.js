import * as THREE from 'three';

export class GraphRenderer {
    constructor(scene) {
        this.scene = scene;
        this.nodes = new Map();
        this.edges = new Map();
        this.nodeMeshes = new Map();
        this.edgeLines = new Map();
    }

    addNode(nodeData) {
        this.nodes.set(nodeData.id, nodeData);

        // Create node mesh (sphere)
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x4488ff,
            emissive: 0x2244aa,
            shininess: 30
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { nodeId: nodeData.id, nodeData };

        this.scene.add(mesh);
        this.nodeMeshes.set(nodeData.id, mesh);
    }

    addEdge(edgeData) {
        const edgeId = `${edgeData.source}-${edgeData.target}`;
        this.edges.set(edgeId, edgeData);

        // Create edge line
        const material = new THREE.LineBasicMaterial({
            color: 0x333333,
            opacity: 0.3,
            transparent: true
        });

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6); // 2 points * 3 coordinates
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const line = new THREE.Line(geometry, material);
        line.userData = { edgeId, edgeData };

        this.scene.add(line);
        this.edgeLines.set(edgeId, line);
    }

    updatePositions(positions) {
        // Update node positions and sizes
        for (const [nodeId, posData] of Object.entries(positions)) {
            const mesh = this.nodeMeshes.get(nodeId);
            if (mesh) {
                // Smooth interpolation
                mesh.position.lerp(
                    new THREE.Vector3(posData.x, posData.y, posData.z),
                    0.3
                );

                // Update size based on influence (centrality)
                const targetScale = posData.size;
                mesh.scale.lerp(
                    new THREE.Vector3(targetScale, targetScale, targetScale),
                    0.1
                );
            }
        }

        // Update edge positions
        for (const [edgeId, line] of this.edgeLines.entries()) {
            const edgeData = this.edges.get(edgeId);
            if (!edgeData) continue;

            const sourceMesh = this.nodeMeshes.get(edgeData.source);
            const targetMesh = this.nodeMeshes.get(edgeData.target);

            if (sourceMesh && targetMesh) {
                const positions = line.geometry.attributes.position.array;
                positions[0] = sourceMesh.position.x;
                positions[1] = sourceMesh.position.y;
                positions[2] = sourceMesh.position.z;
                positions[3] = targetMesh.position.x;
                positions[4] = targetMesh.position.y;
                positions[5] = targetMesh.position.z;
                line.geometry.attributes.position.needsUpdate = true;
            }
        }
    }

    getNodeMeshes() {
        return Array.from(this.nodeMeshes.values());
    }

    getNodeData(nodeId) {
        return this.nodes.get(nodeId);
    }
}
