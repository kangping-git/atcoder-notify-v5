const fs = require('fs');
const docker = require('dockerode');
const path = require('path');
const tar = require('tar-fs');

const dockerClient = new docker();
const files = fs.readdirSync(__dirname, { withFileTypes: true });

for (const file of files) {
    if (file.isDirectory() && file.name !== 'runner') {
        const containerName = file.name;
        const dockerfileRelPath = path.posix.join(containerName, 'Dockerfile');
        const contextPath = __dirname;

        const contextStream = tar.pack(contextPath, {
            entries: fs.readdirSync(contextPath),
        });

        dockerClient.buildImage(
            contextStream,
            {
                t: 'kyo-pro-club-judge/' + containerName,
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
