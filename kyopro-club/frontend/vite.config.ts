import { defineConfig } from 'vite';
import path from 'path';
import excludeLatoPlugin from './excludeLatoPlugin';

export default defineConfig({
    root: path.resolve(__dirname),
    publicDir: 'public',
    base: '/public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                home: path.resolve(__dirname, 'src/home.ts'),
                error: path.resolve(__dirname, 'src/error.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
    plugins: [excludeLatoPlugin()],
});
