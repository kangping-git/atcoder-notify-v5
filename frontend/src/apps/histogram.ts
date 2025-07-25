import { COLORS, getColorByRating, getParams } from './users';

export function openHistogram(isAlgo: boolean) {
    var xAxis = [
        0, 1, 2, 3, 4, 5, 7, 9, 12, 15, 19, 25, 32, 42, 54, 69, 89, 114, 147, 188, 242, 311, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500,
        1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800,
    ];

    const algoHistogramWindow = document.createElement('div');
    algoHistogramWindow.className = 'window';
    if (isAlgo) {
        algoHistogramWindow.innerHTML = `
            <h2>Algo Histogram</h2>
            <canvas id="algoHistogram" width="500" height="350"></canvas>
        `;
    } else {
        algoHistogramWindow.innerHTML = `
            <h2>Heuristic Histogram</h2>
            <canvas id="heuristicHistogram" width="500" height="350"></canvas>
        `;
    }
    document.body.appendChild(algoHistogramWindow);
    async function drawHistogram() {
        const canvas = document.getElementById(isAlgo ? 'algoHistogram' : 'heuristicHistogram') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const params = new URLSearchParams(getParams());
        const rawData = await (await fetch('/api/v1/users/histogram?' + params)).json();
        let data = [];
        if (isAlgo) {
            data = rawData.algoHistogram.map((value: { algoRating: number; _count: number }) => {
                return {
                    algoRating: value.algoRating,
                    _count: value._count,
                };
            });
        } else {
            data = rawData.heuristicHistogram.map((value: { heuristicRating: number; _count: number }) => {
                return {
                    algoRating: value.heuristicRating,
                    _count: value._count,
                };
            });
        }
        const histogramData = new Array(xAxis.length).fill(0);
        data.forEach((value: { algoRating: number; _count: number }) => {
            const { algoRating } = value;
            if (algoRating < 0 || algoRating > 3800) return;
            const index = xAxis.findIndex((x) => x >= algoRating);
            if (index !== -1) {
                histogramData[index] += value._count;
            }
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = '12px Lato';
        ctx.textBaseline = 'middle';
        const barWidth = (canvas.width - 50) / xAxis.length;
        for (let i = 0; i < histogramData.length; i++) {
            const barHeight = (histogramData[i] / Math.max(...histogramData)) * (canvas.height - 70);
            ctx.fillStyle = getColorByRating(xAxis[i]);
            ctx.fillRect(i * barWidth + 45, canvas.height - barHeight - 40, barWidth - 1, barHeight);
            if (i % 2 === 0) {
                ctx.fillStyle = 'black';
                ctx.save();
                ctx.translate(i * barWidth + 45 + barWidth / 2, canvas.height - 35);
                ctx.rotate(Math.PI / 2);
                ctx.fillText(xAxis[i].toString(), 0, 0);
                ctx.restore();
            }
        }
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(45, 10, canvas.width - 50, canvas.height - 50);
    }
    window.onFilterApplied(drawHistogram);
    drawHistogram();
    return { windowElement: algoHistogramWindow, onClose: () => window.dispatchFilterApplied(drawHistogram) };
}
