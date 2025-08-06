import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

// public/Lato フォルダを dist から除外する Vite プラグイン
export default function excludeLatoPlugin(): Plugin {
    return {
        name: 'exclude-lato-plugin',
        generateBundle(_, bundle) {
            // Lato フォルダ内のアセットを削除
            for (const file of Object.keys(bundle)) {
                if (file.startsWith('Lato/')) {
                    delete bundle[file];
                }
            }
        },
        // publicDir から Lato を dist へコピーしない
        closeBundle() {
            const distLato = path.resolve(__dirname, 'dist', 'Lato');
            if (fs.existsSync(distLato)) {
                fs.rmSync(distLato, { recursive: true, force: true });
            }
        },
    };
}
