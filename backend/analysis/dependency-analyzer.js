import { readFile } from 'fs/promises';
import { parse } from 'acorn';
import { simple as walk } from 'acorn-walk';
import { dirname, resolve, relative } from 'path';

export async function analyzeDependencies(files, onEdge) {
    for (const file of files) {
        try {
            if (file.ext === '.js' || file.ext === '.jsx' ||
                file.ext === '.ts' || file.ext === '.tsx') {
                await analyzeJavaScript(file, files, onEdge);
            } else if (file.ext === '.py') {
                await analyzePython(file, files, onEdge);
            }
        } catch (err) {
            // Skip files we can't parse
        }
    }
}

async function analyzeJavaScript(file, allFiles, onEdge) {
    try {
        const content = await readFile(file.fullPath, 'utf-8');

        // Parse with acorn
        const ast = parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module'
        });

        const imports = [];

        walk(ast, {
            ImportDeclaration(node) {
                imports.push(node.source.value);
            },
            CallExpression(node) {
                if (node.callee.name === 'require' &&
                    node.arguments[0]?.type === 'Literal') {
                    imports.push(node.arguments[0].value);
                }
            }
        });

        // Resolve imports to actual files
        for (const importPath of imports) {
            if (importPath.startsWith('.')) {
                // Relative import
                const fileDir = dirname(file.fullPath);
                const resolvedPath = resolve(fileDir, importPath);

                // Find matching file
                const targetFile = allFiles.find(f => {
                    const withoutExt = resolvedPath.replace(/\.(js|ts|jsx|tsx)$/, '');
                    const fWithoutExt = f.fullPath.replace(/\.(js|ts|jsx|tsx)$/, '');
                    return fWithoutExt === withoutExt || f.fullPath === resolvedPath;
                });

                if (targetFile) {
                    // Stream edge immediately
                    onEdge({
                        source: file.path,
                        target: targetFile.path,
                        type: 'dependency',
                        weight: 1
                    });
                }
            }
        }
    } catch (err) {
        // Skip unparseable files
    }
}

async function analyzePython(file, allFiles, onEdge) {
    try {
        const content = await readFile(file.fullPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
            const importMatch = line.match(/^(?:from|import)\s+([.\w]+)/);
            if (importMatch) {
                const importPath = importMatch[1];

                if (importPath.startsWith('.')) {
                    // Relative import - try to resolve
                    const targetFile = allFiles.find(f =>
                        f.path.includes(importPath.replace(/\./g, '/'))
                    );

                    if (targetFile) {
                        onEdge({
                            source: file.path,
                            target: targetFile.path,
                            type: 'dependency',
                            weight: 1
                        });
                    }
                }
            }
        }
    } catch (err) {
        // Skip unparseable files
    }
}
