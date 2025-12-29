import simpleGit from 'simple-git';

export async function analyzeGitHistory(repoPath) {
    const git = simpleGit(repoPath);
    const gitData = {};

    try {
        // Check if it's a git repository
        await git.status();

        // Get commit log
        const log = await git.log({ maxCount: 500 });

        // Track churn per file
        const fileChurn = new Map();
        const cochangeMatrix = new Map();

        for (const commit of log.all) {
            try {
                const diff = await git.show([commit.hash, '--name-only', '--format=']);
                const files = diff.split('\n').filter(f => f.trim());

                // Update churn
                for (const file of files) {
                    fileChurn.set(file, (fileChurn.get(file) || 0) + 1);
                }

                // Track co-changes
                for (let i = 0; i < files.length; i++) {
                    for (let j = i + 1; j < files.length; j++) {
                        const key = `${files[i]}::${files[j]}`;
                        cochangeMatrix.set(key, (cochangeMatrix.get(key) || 0) + 1);
                    }
                }
            } catch (err) {
                // Skip commits we can't analyze
            }
        }

        // Build git data structure
        for (const [file, churn] of fileChurn.entries()) {
            gitData[file] = {
                churn: churn,
                cochanges: []
            };
        }

        // Add co-change relationships
        for (const [key, count] of cochangeMatrix.entries()) {
            const [file1, file2] = key.split('::');
            if (gitData[file1]) {
                gitData[file1].cochanges.push({ file: file2, count });
            }
            if (gitData[file2]) {
                gitData[file2].cochanges.push({ file: file1, count });
            }
        }

    } catch (err) {
        // Not a git repository or git not available
        console.log('Git analysis skipped:', err.message);
    }

    return gitData;
}
