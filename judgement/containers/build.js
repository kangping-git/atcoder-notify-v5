const fs = require('fs');
const docker = require('dockerode');
const path = require('path');
const tar = require('tar-fs');

const dockerClient = new docker();
const files = fs.readdirSync(__dirname, { withFileTypes: true });

for (const file of files) {
    if (file.isDirectory() && file.name !== 'runner') {
        const containerName = file.name; // 例: "cpp-judge"
        const dockerfileRelPath = path.posix.join(containerName, 'Dockerfile'); // "cpp-judge/Dockerfile"
        const contextPath = __dirname;

        // __dirname 以下を丸ごと tar 化
        const contextStream = tar.pack(contextPath, {
            // 念のため隠しファイルも含めるオプション
            entries: fs.readdirSync(contextPath),
        });

        dockerClient.buildImage(
            contextStream,
            {
                t: containerName,
                dockerfile: dockerfileRelPath,
                buildargs: {},
            },
            (err, stream) => {
                if (err) {
                    console.error(`Error building image for ${containerName}:`, err);
                    return;
                }
                console.log(`Building image for ${containerName} using ${dockerfileRelPath}...`);
                stream.pipe(process.stdout, { end: true });
                stream.on('end', () => {
                    console.log(`\nFinished building ${containerName}\n`);
                });
            },
        );
    }
}
