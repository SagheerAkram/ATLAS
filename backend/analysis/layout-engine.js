export class LayoutEngine {
    constructor() {
        this.positions = new Map();
        this.velocities = new Map();
        this.mode = 'structure'; // structure, change, coupling

        // Force parameters
        this.repulsion = 100;
        this.attraction = 0.01;
        this.damping = 0.9;
        this.centerGravity = 0.001;
    }

    setMode(mode) {
        this.mode = mode;
    }

    step(graph) {
        // Initialize positions for new nodes
        for (const [nodeId, node] of graph.nodes.entries()) {
            if (!this.positions.has(nodeId)) {
                // Random initial position
                this.positions.set(nodeId, {
                    x: (Math.random() - 0.5) * 100,
                    y: (Math.random() - 0.5) * 100,
                    z: (Math.random() - 0.5) * 20 // Shallow depth for 2.5D
                });
                this.velocities.set(nodeId, { x: 0, y: 0, z: 0 });
            }
        }

        const forces = new Map();
        for (const nodeId of graph.nodes.keys()) {
            forces.set(nodeId, { x: 0, y: 0, z: 0 });
        }

        // Repulsion between all nodes
        const nodeIds = Array.from(graph.nodes.keys());
        for (let i = 0; i < nodeIds.length; i++) {
            for (let j = i + 1; j < nodeIds.length; j++) {
                const id1 = nodeIds[i];
                const id2 = nodeIds[j];

                const pos1 = this.positions.get(id1);
                const pos2 = this.positions.get(id2);

                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const dz = pos2.z - pos1.z;
                const distSq = dx * dx + dy * dy + dz * dz + 0.1;
                const dist = Math.sqrt(distSq);

                const force = this.repulsion / distSq;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                const fz = (dz / dist) * force * 0.3; // Reduced z-force for 2.5D

                const f1 = forces.get(id1);
                const f2 = forces.get(id2);
                f1.x -= fx; f1.y -= fy; f1.z -= fz;
                f2.x += fx; f2.y += fy; f2.z += fz;
            }
        }

        // Attraction along edges (mode-dependent weighting)
        for (const edge of graph.edges) {
            const pos1 = this.positions.get(edge.source);
            const pos2 = this.positions.get(edge.target);

            if (!pos1 || !pos2) continue;

            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            const dz = pos2.z - pos1.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 0.1);

            // Mode-based edge weight
            let weight = edge.weight || 1;
            if (this.mode === 'change') {
                // Increase weight for co-change edges
                weight *= (edge.type === 'cochange' ? 3 : 0.5);
            } else if (this.mode === 'coupling') {
                // Increase weight for dependency edges
                weight *= (edge.type === 'dependency' ? 3 : 0.5);
            }

            const force = this.attraction * dist * weight;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force * 0.3; // Reduced z-force

            const f1 = forces.get(edge.source);
            const f2 = forces.get(edge.target);
            if (f1 && f2) {
                f1.x += fx; f1.y += fy; f1.z += fz;
                f2.x -= fx; f2.y -= fy; f2.z -= fz;
            }
        }

        // Center gravity (stronger for high-centrality nodes)
        for (const [nodeId, node] of graph.nodes.entries()) {
            const pos = this.positions.get(nodeId);
            const force = forces.get(nodeId);

            // Centrality-based gravity (high centrality = pulled to center)
            const centralityFactor = (node.centrality || 0.1) * 2;
            force.x -= pos.x * this.centerGravity * centralityFactor;
            force.y -= pos.y * this.centerGravity * centralityFactor;
            force.z -= pos.z * this.centerGravity * centralityFactor * 0.5;
        }

        // Update velocities and positions
        for (const [nodeId, force] of forces.entries()) {
            const vel = this.velocities.get(nodeId);
            const pos = this.positions.get(nodeId);

            vel.x = (vel.x + force.x) * this.damping;
            vel.y = (vel.y + force.y) * this.damping;
            vel.z = (vel.z + force.z) * this.damping;

            pos.x += vel.x;
            pos.y += vel.y;
            pos.z += vel.z;
        }

        // Return positions with node metadata
        const result = {};
        for (const [nodeId, pos] of this.positions.entries()) {
            const node = graph.nodes.get(nodeId);
            result[nodeId] = {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                // Node size = influence (centrality)
                size: Math.max(2, (node?.centrality || 0.1) * 10)
            };
        }

        return result;
    }
}
