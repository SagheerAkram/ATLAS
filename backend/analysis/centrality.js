export function computeCentrality(graph) {
    const centrality = new Map();

    // Simple PageRank-style centrality
    const nodes = Array.from(graph.nodes.keys());
    const dampingFactor = 0.85;
    const iterations = 20;

    // Initialize all nodes with equal centrality
    for (const nodeId of nodes) {
        centrality.set(nodeId, 1.0 / nodes.length);
    }

    // Build adjacency structure
    const inbound = new Map();
    const outbound = new Map();

    for (const nodeId of nodes) {
        inbound.set(nodeId, []);
        outbound.set(nodeId, []);
    }

    for (const edge of graph.edges) {
        if (inbound.has(edge.target)) {
            inbound.get(edge.target).push(edge.source);
        }
        if (outbound.has(edge.source)) {
            outbound.get(edge.source).push(edge.target);
        }
    }

    // Iterate PageRank
    for (let iter = 0; iter < iterations; iter++) {
        const newCentrality = new Map();

        for (const nodeId of nodes) {
            let sum = 0;
            const incoming = inbound.get(nodeId) || [];

            for (const sourceId of incoming) {
                const sourceOutDegree = (outbound.get(sourceId) || []).length;
                if (sourceOutDegree > 0) {
                    sum += centrality.get(sourceId) / sourceOutDegree;
                }
            }

            newCentrality.set(nodeId, (1 - dampingFactor) / nodes.length + dampingFactor * sum);
        }

        // Update centrality
        for (const [nodeId, value] of newCentrality.entries()) {
            centrality.set(nodeId, value);
        }
    }

    // Normalize to 0-1 range
    const maxCentrality = Math.max(...centrality.values());
    if (maxCentrality > 0) {
        for (const [nodeId, value] of centrality.entries()) {
            centrality.set(nodeId, value / maxCentrality);
        }
    }

    return centrality;
}
