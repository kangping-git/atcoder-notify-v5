import type { GraphFeature } from './GraphFeature';
import type { BaseHistoryGraph } from '../baseHistoryGraph';
import { Database } from '../../../../database';
import { createSVGLine, createSVGText } from '../svgHelpers';
import { submissions as SubmissionRecord } from '@prisma/client';

export class SubmissionGraphFeature implements GraphFeature {
    readonly kind = 'submission' as const;
    /** もっとも背面にしたいので -20 */
    readonly zIndex = -20;

    constructor(private graph: BaseHistoryGraph) { }

    async render(): Promise<string> {
        const { submissions } = await this.fetchSubmissions();
        if (submissions.length === 0) return '';

        const getX = (t: number) => this.graph.getX(t);
        const submissionCount = submissions.length + 100;
        const submissionStep = submissionCount > 10000 ? 2000 : submissionCount > 5000 ? 1000 : 400;
        const getY = (k: number) => this.graph.graphPos.y + this.graph.graphSize.height - (k / submissionCount) * this.graph.graphSize.height;

        const gridLines: string[] = [];
        const labels: string[] = [];

        let lastI = 0;
        for (let i = 0; i < submissionCount; i += submissionStep) {
            const y = getY(i);
            gridLines.push(
                createSVGLine({
                    x1: this.graph.graphPos.x,
                    y1: y,
                    x2: this.graph.graphPos.x + this.graph.graphSize.width,
                    y2: y,
                    lineColor: '#aaa',
                    lineWidth: 0.5,
                }),
            );
            labels.push(
                createSVGText({
                    x: this.graph.graphPos.x + this.graph.graphSize.width + 5,
                    y,
                    text: i.toString(),
                    fontSize: 12,
                    fontFamily: 'Lato',
                    fillColor: '#000',
                    textBaseline: 'middle',
                }),
            );
            lastI = i;
        }
        if (getY(lastI) - getY(submissionCount - 100) > 10) {
            const y = getY(submissionCount - 100);
            gridLines.push(
                createSVGLine({
                    x1: this.graph.graphPos.x,
                    y1: y,
                    x2: this.graph.graphPos.x + this.graph.graphSize.width,
                    y2: y,
                    lineColor: '#aaa',
                    lineWidth: 0.5,
                }),
            );
            labels.push(
                createSVGText({
                    x: this.graph.graphPos.x + this.graph.graphSize.width + 5,
                    y,
                    text: (submissionCount - 100).toString(),
                    fontSize: 12,
                    fontFamily: 'Lato',
                    fillColor: '#000',
                    textBaseline: 'middle',
                }),
            );
        }

        /* 折れ線 */
        const polyLines: string[] = [];
        let lastX = 0,
            lastY = 0;
        for (let i = 0; i < submissions.length; ++i) {
            const sub = submissions[i];
            const x = getX(sub.datetime.getTime());
            const y = getY(i);
            if (i === 0) {
                lastX = x;
                lastY = y;
                continue;
            }
            if (Math.floor(x) - Math.floor(lastX) < 1 && i < submissions.length - 1) continue;
            polyLines.push(
                createSVGLine({
                    x1: lastX,
                    y1: lastY,
                    x2: x,
                    y2: y,
                    doubleLine: { outerLineColor: '#000', outerLineWidth: 2 },
                    lineColor: '#faf',
                    lineWidth: 1.5,
                }),
            );
            lastX = x;
            lastY = y;
        }

        return `<g class="submissions">${gridLines.join('')}${labels.join('')}${polyLines.join('')}</g>`;
    }

    private async fetchSubmissions() {
        const subs = (await Database.getDatabase().submissions.findMany({
            where: {
                user: { name: (this.graph as any).userName },
                task: { contest: { isHeuristic: (this.graph as any).isHeuristic } },
            },
            orderBy: { datetime: 'asc' },
        })) as SubmissionRecord[];

        return { submissions: subs };
    }
}
