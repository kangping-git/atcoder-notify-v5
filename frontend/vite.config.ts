import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                home: path.resolve(__dirname, 'src/home.ts'),
                error: path.resolve(__dirname, 'src/error.ts'),
                '418': path.resolve(__dirname, 'src/special/418.ts'),
                login: path.resolve(__dirname, 'src/login.ts'),
                register: path.resolve(__dirname, 'src/register.ts'),
                dashboard: path.resolve(__dirname, 'src/dashboard.ts'),
                apps: path.resolve(__dirname, 'src/apps/apps.ts'),
                users: path.resolve(__dirname, 'src/apps/users.ts'),
                rating_simulator: path.resolve(__dirname, 'src/apps/rating_simulator/index.ts'),
                default: path.resolve(__dirname, 'src/default.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name][extname]',
            },
        },
        emptyOutDir: true,
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
});
