import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

const CODE_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx',
    '.py', '.java', '.cpp', '.c', '.h',
    '.go', '.rs', '.rb', '.php',
    '.cs', '.swift', '.kt'
];

export async function scanRepository(repoPath, onFile) {
    const files = [];

    async function scan(dir) {
        try {
            const entries = await readdir(dir);

            for (const entry of entries) {
                // Skip node_modules, .git, etc.
                if (entry === 'node_modules' || entry === '.git' ||
                    entry === 'dist' || entry === 'build' ||
                    entry.startsWith('.')) {
                    continue;
                }

                const fullPath = join(dir, entry);
                const stats = await stat(fullPath);

                if (stats.isDirectory()) {
                    await scan(fullPath);
                } else if (stats.isFile()) {
                    const ext = entry.substring(entry.lastIndexOf('.'));
                    if (CODE_EXTENSIONS.includes(ext)) {
                        const relativePath = relative(repoPath, fullPath);
                        const file = {
                            path: relativePath,
                            fullPath: fullPath,
                            size: stats.size,
                            ext: ext
                        };

                        files.push(file);

                        // Stream file discovery immediately
                        if (onFile) {
                            onFile(file);
                        }
                    }
                }
            }
        } catch (err) {
            // Skip directories we can't read
        }
    }

    await scan(repoPath);
    return files;
}
