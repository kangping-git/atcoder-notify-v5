function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const [startX, startY] = polarToCartesian(cx, cy, r, endAngle);
    const [endX, endY] = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [`M ${cx},${cy}`, `L ${startX},${startY}`, `A ${r},${r} 0 ${largeArc},0 ${endX},${endY}`, `Z`].join(' ');
}

export function createCircleGraph(title: string, dataList: { data: number; color: string; label: string }[]) {
    const dataSum = dataList.reduce((previousValue, currentValue) => previousValue + currentValue.data, 0);
    let SVG = '<svg width="300" height="300" viewBox="0 0 300 300"><rect x="0" y="0" width="300" height="300" fill="#1f1f1f" />';
    SVG += `<text x="150" y="20" font-family="Lato" font-size="20" fill="white" text-anchor="middle" alignment-baseline="hanging">${title}</text>`;
    let angle = 0;
    for (let data of dataList) {
        const arcAngle = (data.data / dataSum) * 360;
        console.log(arcAngle);
        SVG += `<path d="${describeArc(150, 150, 100, angle, angle + arcAngle - 0.1)}" fill="${data.color}" />`;
        const [startX, startY] = polarToCartesian(150, 150, 100, angle);
        SVG += `<line x1="150" y1="150" x2="${startX}" y2="${startY}" stroke="#fff" stroke-width="2"/>`;

        const midAngle = angle + arcAngle / 2;
        const [labelX, labelY] = polarToCartesian(150, 150, 60, midAngle);
        SVG += `<text x="${labelX}" y="${labelY}" font-family="Lato" font-size="14" fill="white" text-anchor="middle" alignment-baseline="middle">${data.label}</text>`;

        angle += arcAngle;
    }
    SVG += '</svg>';
    return SVG;
}
