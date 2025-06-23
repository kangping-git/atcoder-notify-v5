import type { GraphFeature } from './GraphFeature';
import type { BaseHistoryGraph } from '../baseHistoryGraph';
import { createSVGCircle, createSVGLine, getRatingColor } from '../svgHelpers';
import { normalizeRating } from '../../../utils/rating';

export class PerformanceGraphFeature implements GraphFeature {
    readonly kind = 'performance' as const;
    /** レーティング折れ線より背面に置きたいので -10 */
    readonly zIndex = -10;

    constructor(private graph: BaseHistoryGraph) {}

    async render(): Promise<string> {
        const history = (this.graph as any).ratingHistory;
        if (!history.length) return '';

        /* 折れ線 & ドット */
        const lines: string[] = [];
        const circles: string[] = [];

        for (let i = 0; i < history.length; ++i) {
            const ev = history[i];
            const perfY = this.graph.getY(normalizeRating(ev.performance));

            if (i) {
                const prev = history[i - 1];
                lines.push(
                    createSVGLine({
                        x1: this.graph.getX(prev.contest.endTime.getTime()),
                        y1: this.graph.getY(normalizeRating(prev.performance)),
                        x2: this.graph.getX(ev.contest.endTime.getTime()),
                        y2: perfY,
                        doubleLine: { outerLineColor: '#faa', outerLineWidth: 1 },
                        lineColor: '#fff',
                        lineWidth: 0.5,
                    }),
                );
            }

            circles.push(
                createSVGCircle({
                    cx: this.graph.getX(ev.contest.endTime.getTime()),
                    cy: perfY,
                    r: 2,
                    fillColor: `${getRatingColor(ev.performance).color}77`,
                    strokeColor: '#fff',
                    strokeWidth: 0.5,
                }),
            );
        }

        /* 最高 Performance 吹き出し（省略可なら削除しても OK） */
        const maxPerf = Math.max(...history.map((h: any) => h.performance));
        const idx = history.findIndex((h: any) => h.performance === maxPerf);
        const ref = history[idx];
        const x = this.graph.getX(ref.contest.endTime.getTime());
        const y = this.graph.getY(normalizeRating(ref.performance));
        const toX = x > this.graph.graphPos.x + this.graph.graphSize.width / 2 ? x - 80 : x + 80;
        const dialog =
            `<g>${createSVGLine({ x1: x, y1: y, x2: toX, y2: y - 16, lineColor: '#fff', lineWidth: 1 })}` +
            `<rect x="${toX - 40}" y="${
                y - 26
            }" width="80" height="20" fill="#fff" stroke="#888" stroke-width="0.5" rx="2"/>` +
            `<text x="${toX}" y="${
                y - 16
            }" font-size="12" font-family="Lato" fill="#000" text-anchor="middle" dominant-baseline="middle">Highest: ${normalizeRating(
                maxPerf,
            )}</text></g>`;

        return `<g filter="url(#drop-shadow)">${lines.join('')}${circles.join('')}${dialog}</g>`;
    }
}
