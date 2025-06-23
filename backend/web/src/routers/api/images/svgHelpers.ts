import { TextMeasurer } from '../../../utils/images/measurer';

interface LineProps {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    doubleLine?: {
        outerLineWidth: number;
        outerLineColor: string;
    };
    lineColor?: string;
    lineWidth?: number;
}
export function createSVGLine({ x1, y1, x2, y2, doubleLine, lineColor, lineWidth }: LineProps): string {
    const outerLineWidth = doubleLine?.outerLineWidth || 0;
    const outerLineColor = doubleLine?.outerLineColor || 'black';
    lineColor = lineColor || 'black';
    lineWidth = lineWidth || 1;

    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${outerLineColor}" stroke-width="${outerLineWidth}" />
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
}
interface CircleProps {
    cx: number;
    cy: number;
    r: number;
    fillColor?: string;
    strokeWidth?: number;
    strokeColor?: string;
}
export function createSVGCircle({ cx, cy, r, fillColor, strokeWidth, strokeColor }: CircleProps): string {
    fillColor = fillColor || 'black';
    strokeWidth = strokeWidth || 1;
    strokeColor = strokeColor || 'black';

    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
}
interface TextProps {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fillColor?: string;
    textAlign?: 'start' | 'middle' | 'end';
    textBaseline?: 'hanging' | 'middle' | 'bottom';
    maxLength?: number;
}
const textMeasurer = new TextMeasurer();
export function createSVGText({ x, y, text, fontSize, fontFamily, fillColor, textAlign, textBaseline, maxLength }: TextProps): string {
    fontSize = fontSize || 16;
    fontFamily = fontFamily || 'Arial';
    fillColor = fillColor || 'black';
    textAlign = textAlign || 'start';
    textBaseline = textBaseline || 'middle';
    let scaleX = 1;
    if (maxLength) {
        const measuredText = textMeasurer.measure(text, `${fontSize}px ${fontFamily}`);
        if (measuredText > maxLength) {
            scaleX = measuredText / maxLength;
            return `<text x="${
                x * scaleX
            }" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fillColor}" text-anchor="${textAlign}" dominant-baseline="${textBaseline}" transform="scale(${
                1 / scaleX
            }, 1)">${text}</text>`;
        }
    }

    return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fillColor}" text-anchor="${textAlign}" dominant-baseline="${textBaseline}">${text}</text>`;
}

interface MessageBoxProps {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fillColor?: string;
    bgColor?: string;
    width?: number;
}
export function createSVGMessageBox({ fromX, fromY, toX, toY, text, fontSize, fontFamily, fillColor, bgColor, width }: MessageBoxProps): string {
    fontSize = fontSize || 12;
    fontFamily = fontFamily || 'Arial';
    fillColor = fillColor || 'black';
    bgColor = bgColor || '#f0f0f0';
    width = width || 200;

    const textSVG = createSVGText({
        x: toX,
        y: toY,
        text: text,
        fontSize: fontSize,
        fontFamily: fontFamily,
        fillColor: fillColor,
        textAlign: 'middle',
        textBaseline: 'middle',
    });
    let boxLineSVG = createSVGLine({
        x1: fromX,
        y1: fromY,
        x2: toX,
        y2: toY,
        lineColor: '#fff',
        lineWidth: 1,
    });
    let boxSVG = `<rect x="${toX - width / 2}" y="${toY - 10}" width="${width}" height="20" fill="${bgColor}" stroke="#888" stroke-width="0.5" rx="2" />`;
    return boxLineSVG + boxSVG + textSVG;
}
export function getRatingColor(rating: number): { color: string; alpha: number } {
    const COLORS = [
        { rating: 0, color: '#808080', alpha: 0.15 },
        { rating: 400, color: '#804000', alpha: 0.15 },
        { rating: 800, color: '#008000', alpha: 0.15 },
        { rating: 1200, color: '#00C0C0', alpha: 0.2 },
        { rating: 1600, color: '#0000FF', alpha: 0.1 },
        { rating: 2000, color: '#C0C000', alpha: 0.25 },
        { rating: 2400, color: '#FF8000', alpha: 0.2 },
        { rating: 2800, color: '#FF0000', alpha: 0.1 },
    ];
    for (let i = COLORS.length - 1; i >= 0; --i) {
        if (rating >= COLORS[i].rating) return { color: COLORS[i].color, alpha: COLORS[i].alpha };
    }
    return { color: '#808080', alpha: 0.15 };
}

function escapeXML(str: string) {
    return str.replace(/[&<>"]/g, (s) => (s === '&' ? '&amp;' : s === '<' ? '&lt;' : s === '>' ? '&gt;' : '&quot;'));
}
