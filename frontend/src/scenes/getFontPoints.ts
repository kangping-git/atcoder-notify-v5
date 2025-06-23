interface GetFontPointsOptions {
    font?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    step?: number;
    maxPoints?: number;
}

export function getFontPoints(
    text: string,
    options: GetFontPointsOptions = {},
): { x: number; y: number }[] {
    const {
        font = 'bold 150px sans-serif',
        canvasWidth = 500,
        canvasHeight = 200,
        step = 4,
        maxPoints = 200,
    } = options;

    const off = document.createElement('canvas');
    off.width = canvasWidth;
    off.height = canvasHeight;
    const ctx = off.getContext('2d')!;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

    const img = ctx.getImageData(0, 0, off.width, off.height).data;
    const candidates: { x: number; y: number }[] = [];

    for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
            const idx = (y * off.width + x) * 4 + 3;
            if (img[idx] > 128) {
                candidates.push({ x: x + Math.random() * 10 - 5, y: y + Math.random() * 10 - 5 });
            }
        }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    if (candidates.length < maxPoints) {
        const diff = maxPoints - candidates.length;
        for (let i = 0; i < diff; i++) {
            candidates.push(candidates[Math.floor(Math.random() * candidates.length)]);
        }
    }

    return candidates.slice(0, maxPoints);
}
