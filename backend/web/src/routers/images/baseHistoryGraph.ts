import { Database } from '../../database';
import { normalizeRating } from '../../utils/rating';
import { createSVGCircle, createSVGLine, createSVGMessageBox, createSVGText, getRatingColor } from './svgHelpers';
import type { GraphFeature } from './features/GraphFeature';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

interface CtorParams {
    userName: string;
    isHeuristic: boolean;
    includeHeader?: boolean;
}

export class BaseHistoryGraph {
    /* ─ public readonly state ─ */
    readonly userName: string;
    readonly isHeuristic: boolean;

    /* ─ configurable ─ */
    readonly width = 640; // base width (submissions がある場合 +40 する)
    readonly height = 360; // graph body 高さ
    readonly graphPos = { x: 50, y: 5 };
    readonly graphSize = { width: 580, height: 325 };

    /* ─ private ─ */
    private includeHeader: boolean;
    private features: GraphFeature[] = [];

    /* 履歴データ (lazy-load) */
    private ratingHistory: { contest: { title: string; endTime: Date }; newRating: number; performance: number }[] = [];

    /* 計算済み境界値 */
    private drawingMinTime = 0;
    private drawingMaxTime = 0;
    private drawingMinRating = 0;
    private drawingMaxRating = 0;

    /* 最大値─吹き出しダイアログ位置 */
    private maxRatingIndex = -1;

    /* feature presence flags (bounds 計算に使う) */
    private withPerformance = false;

    /* ───────────────────────────────────── */

    constructor(params: CtorParams) {
        this.userName = params.userName;
        this.isHeuristic = params.isHeuristic;
        this.includeHeader = params.includeHeader ?? false;
    }

    /** 他ファイルから拡張機能を登録 */
    addFeature(feature: GraphFeature) {
        this.features.push(feature);
        if (feature.kind === 'performance') this.withPerformance = true;
    }

    /* =================== 公開ビルド関数 =================== */

    /** 履歴グラフ (body だけ) の SVG を返す */
    async buildHistorySVG(): Promise<string> {
        await this.ensureHistoryLoaded();

        if (!this.ratingHistory.length) {
            return this.wrapSVG(
                '<text x="50" y="180" font-size="16" fill="#888">No rating history available</text>',
                this.height,
            );
        }

        /* zIndex で並び替え */
        const sorted = [...this.features].sort((a, b) => a.zIndex - b.zIndex);
        const below = sorted.filter((f) => f.zIndex < 0);
        const above = sorted.filter((f) => f.zIndex >= 0);

        const parts: string[] = [];
        parts.push(this.drawBackground());

        /* ─ 背面 Feature ─ */
        for (const f of below) parts.push(await f.render());

        /* ─ レーティング折れ線 ─ */
        parts.push(this.drawRatingPolyline());

        /* ─ 前面 Feature ─ */
        for (const f of above) parts.push(await f.render());

        return this.wrapSVG(parts.join(''), this.height);
    }

    /** 現在レーティングヘッダ付き SVG を返す */
    async buildRatingSummarySVG(): Promise<string> {
        if (!this.includeHeader) return this.buildHistorySVG(); // 予備

        await this.ensureHistoryLoaded();
        if (!this.ratingHistory.length) {
            return this.wrapSVG(
                '<text x="50" y="180" font-size="16" fill="#888">No rating history available</text>',
                this.height + 80,
            );
        }
        const headerSVG = await this.drawRatingHeader();
        const graphSVG = await this.buildHistorySVG();
        const innerGraph = graphSVG.replace(/^<svg[^>]*>|<\/svg>$/g, '');
        const combined = `<g>${headerSVG}</g><g transform="translate(0,80)">${innerGraph}</g>`;

        return this.wrapSVG(combined, this.height + 80);
    }

    /* ===================================================== */

    public getX(timeMs: number): number {
        return (
            this.graphPos.x +
            ((timeMs - this.drawingMinTime) / (this.drawingMaxTime - this.drawingMinTime)) * this.graphSize.width
        );
    }
    public getY(rating: number): number {
        return (
            this.graphPos.y +
            this.graphSize.height -
            ((rating - this.drawingMinRating) / (this.drawingMaxRating - this.drawingMinRating)) * this.graphSize.height
        );
    }

    /** 最大 rating の (x,y) を公開 (performance 吹き出しと重ならないように使える) */
    public getMaxRatingPoint() {
        const ev = this.ratingHistory[this.maxRatingIndex];
        return {
            x: this.getX(ev.contest.endTime.getTime()),
            y: this.getY(ev.newRating),
            value: ev.newRating,
            contest: ev.contest,
        };
    }

    private async ensureHistoryLoaded() {
        if (this.ratingHistory.length) return;

        this.ratingHistory = await Database.getDatabase().userRatingChangeEvent.findMany({
            where: { user: { name: this.userName }, isHeuristic: this.isHeuristic },
            select: { contest: true, newRating: true, performance: true },
            orderBy: { contest: { endTime: 'asc' } },
        });

        if (!this.ratingHistory.length) {
            return;
        }

        /* bounds 計算 */
        const minRating = Math.min(...this.ratingHistory.map((e) => e.newRating));
        const maxRating = Math.max(...this.ratingHistory.map((e) => e.newRating));
        const minTime = this.ratingHistory[0].contest.endTime.getTime();
        const maxTime = this.ratingHistory[this.ratingHistory.length - 1].contest.endTime.getTime();

        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        this.drawingMinTime = minTime - THIRTY_DAYS;
        this.drawingMaxTime = maxTime + THIRTY_DAYS;

        this.drawingMinRating = Math.min(1500, Math.max(0, minRating - 300));
        this.drawingMaxRating = maxRating + 300;

        if (this.withPerformance) {
            const minPerf = Math.min(...this.ratingHistory.map((e) => normalizeRating(e.performance)));
            const maxPerf = Math.max(...this.ratingHistory.map((e) => normalizeRating(e.performance)));
            this.drawingMinRating = Math.min(this.drawingMinRating, Math.max(0, minPerf - 300));
            this.drawingMaxRating = Math.max(this.drawingMaxRating, maxPerf + 300);
        }
        if (this.hasSubmissionFeature()) {
            console.log(`Fetching submission times for user: ${this.userName}, heuristic: ${this.isHeuristic}`);
            const db = Database.getDatabase();

            const subs = await db.submissions.findMany({
                where: { user: { name: this.userName }, contest: { isHeuristic: this.isHeuristic } },
                select: { datetime: true },
            });
            subs.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
            const oldest = subs[0];
            const newest = subs[subs.length - 1];

            if (oldest) this.drawingMinTime = Math.min(this.drawingMinTime, oldest.datetime.getTime());
            if (newest) this.drawingMaxTime = Math.max(this.drawingMaxTime, newest.datetime.getTime());
        }

        this.maxRatingIndex = this.ratingHistory.findIndex((e) => e.newRating === maxRating);
    }

    /** グラフ背景（レート帯塗り・軸・月ラベル） */
    private drawBackground(): string {
        const bgRects: string[] = [];
        const splitLines: string[] = [];
        const labels: string[] = [];

        /* ── rating 帯ごとの背景矩形・閾線・ラベル ── */
        let first = true;
        for (let i = 0; i < 25; ++i) {
            const low = i * 400;
            const high = (i + 1) * 400 - 1;
            if (high < this.drawingMinRating || low > this.drawingMaxRating) continue;

            const rectLow = Math.max(low, this.drawingMinRating);
            const rectHigh = Math.min(high, this.drawingMaxRating);
            const col = getRatingColor(rectLow);

            bgRects.push(
                `<rect x="${this.graphPos.x}" y="${this.getY(rectHigh)}" width="${this.graphSize.width}" height="${
                    this.getY(rectLow) - this.getY(rectHigh)
                }"
          fill="${col.color}" fill-opacity="0.3"/>`,
            );

            if (!first) {
                splitLines.push(
                    createSVGLine({
                        x1: this.graphPos.x,
                        y1: this.getY(rectLow),
                        x2: this.graphPos.x + this.graphSize.width,
                        y2: this.getY(rectLow),
                        lineColor: rectLow === 2000 ? '#000' : '#fff',
                        lineWidth: 0.5,
                    }),
                );
            }
            /* left side ラベル */
            if (!first || rectLow === 0) {
                labels.push(
                    createSVGText({
                        x: this.graphPos.x - 5,
                        y: this.getY(rectLow),
                        text: rectLow.toString(),
                        fontSize: 12,
                        fontFamily: 'Lato',
                        fillColor: '#000',
                        textAlign: 'end',
                        textBaseline: 'middle',
                    }),
                );
            }
            first = false;
        }

        /* ── 月・年目盛 ── */
        const timeSpan = this.drawingMaxTime - this.drawingMinTime;
        const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
        let monthStep = [1, 2, 3, 6].find((s) => timeSpan / (s * ONE_YEAR) < 1) ?? 6;

        const startYear = new Date(this.drawingMinTime).getFullYear();
        const endYear = new Date(this.drawingMaxTime).getFullYear();

        for (let y = startYear; y <= endYear; ++y) {
            let firstMonthLabelForYear = true;
            for (let m = 0; m < 12; m += monthStep) {
                const dt = new Date(y, m, 1);
                const t = dt.getTime();
                if (t < this.drawingMinTime || t > this.drawingMaxTime) continue;

                const x = this.getX(t);
                splitLines.push(
                    createSVGLine({
                        x1: x,
                        y1: this.graphPos.y,
                        x2: x,
                        y2: this.graphPos.y + this.graphSize.height,
                        lineColor: '#fff',
                        lineWidth: 0.5,
                    }),
                );
                labels.push(
                    createSVGText({
                        x,
                        y: this.graphPos.y + this.graphSize.height + 2,
                        text: MONTH_NAMES[m],
                        fontSize: 12,
                        fontFamily: 'Lato',
                        fillColor: '#000',
                        textAlign: 'middle',
                        textBaseline: 'hanging',
                    }),
                );
                if (firstMonthLabelForYear) {
                    labels.push(
                        createSVGText({
                            x,
                            y: this.graphPos.y + this.graphSize.height + 15,
                            text: y.toString(),
                            fontSize: 12,
                            fontFamily: 'Lato',
                            fillColor: '#000',
                            textAlign: 'middle',
                            textBaseline: 'hanging',
                        }),
                    );
                }
                firstMonthLabelForYear = false;
            }
        }

        /* ── 外枠 ── */
        const border = `<rect x="${this.graphPos.x}" y="${this.graphPos.y}" width="${this.graphSize.width}" height="${this.graphSize.height}"
                     fill="none" stroke="#808080" stroke-width="1.5" rx="2"/>`;

        return `<g>${bgRects.join('')}${splitLines.join('')}${labels.join('')}${border}</g>`;
    }

    /** レーティング推移折れ線 + ドット + Highest 吹き出し */
    private drawRatingPolyline(): string {
        const lines: string[] = [];
        const circles: string[] = [];

        for (let i = 0; i < this.ratingHistory.length; ++i) {
            const ev = this.ratingHistory[i];

            if (i) {
                const prev = this.ratingHistory[i - 1];
                lines.push(
                    createSVGLine({
                        x1: this.getX(prev.contest.endTime.getTime()),
                        y1: this.getY(prev.newRating),
                        x2: this.getX(ev.contest.endTime.getTime()),
                        y2: this.getY(ev.newRating),
                        doubleLine: { outerLineColor: '#aaa', outerLineWidth: 2 },
                        lineColor: '#fff',
                        lineWidth: 0.5,
                    }),
                );
            }

            const highlight = i === this.maxRatingIndex;
            circles.push(
                createSVGCircle({
                    cx: this.getX(ev.contest.endTime.getTime()),
                    cy: this.getY(ev.newRating),
                    r: 3.5,
                    fillColor: getRatingColor(ev.newRating).color,
                    strokeColor: highlight ? '#000' : '#fff',
                    strokeWidth: 0.5,
                }),
            );
        }

        /* Highest 吹き出し */
        const maxPt = this.getMaxRatingPoint();
        const dialogX = maxPt.x > this.graphPos.x + this.graphSize.width / 2 ? maxPt.x - 80 : maxPt.x + 80;
        const message = createSVGMessageBox({
            fromX: maxPt.x,
            fromY: maxPt.y,
            toX: dialogX,
            toY: maxPt.y - 18,
            text: `Highest: ${maxPt.value}`,
            fontFamily: 'Lato',
            width: 80,
        });

        return `<g filter="url(#drop-shadow)">${lines.join('')}${circles.join('')}${message}</g>`;
    }

    /** ヘッダー部 (最新コンテストの rating / diff / 順位) */
    private async drawRatingHeader(): Promise<string> {
        const [latest] = await Database.getDatabase().userRatingChangeEvent.findMany({
            where: { user: { name: this.userName }, isHeuristic: this.isHeuristic },
            select: { contest: true, newRating: true, oldRating: true, place: true },
            orderBy: { contest: { endTime: 'desc' } },
            take: 1,
        });

        if (!latest) return '';

        const diffVal = latest.newRating - latest.oldRating;
        const diffStr = diffVal > 0 ? `+${diffVal}` : diffVal === 0 ? '±0' : diffVal.toString();

        const rect = `<rect width="580" height="70" x="50" y="5" rx="2" stroke-width="1"
                    stroke="${getRatingColor(latest.newRating).color}" fill="none"/>`;

        const ratingText = createSVGText({
            x: 125,
            y: 40,
            text: latest.newRating.toString(),
            fontSize: 48,
            fontFamily: "'Squada One'",
            fillColor: getRatingColor(latest.newRating).color,
            textAlign: 'middle',
            textBaseline: 'middle',
        });

        const placeText = createSVGText({
            x: 210,
            y: 30.9,
            text: this.formatPlace(latest.place),
            fontSize: 16,
            fontFamily: 'Lato',
            fillColor: '#000',
            textAlign: 'middle',
            textBaseline: 'middle',
        });

        const diffText = createSVGText({
            x: 210,
            y: 51.7,
            text: diffStr,
            fontSize: 12,
            fontFamily: 'Lato',
            fillColor: '#888',
            textAlign: 'middle',
            textBaseline: 'middle',
        });

        const dateText = createSVGText({
            x: 250,
            y: 22.5,
            text: this.formatDate(latest.contest.endTime),
            fontSize: 14,
            fontFamily: 'Lato',
            fillColor: '#000',
            textBaseline: 'middle',
        });

        const contestText = createSVGText({
            x: 250,
            y: 48.75,
            text: latest.contest.title,
            fontSize: 20,
            fontFamily: "'Noto Sans JP', Lato, sans-serif",
            fillColor: '#000',
            textBaseline: 'middle',
            maxLength: 370,
        });

        return `<g>${rect}${ratingText}${placeText}${diffText}${dateText}${contestText}</g>`;
    }

    /* ───── util ───── */
    private formatDate(d: Date) {
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }
    private formatPlace(n: number) {
        const s = n.toString();
        if (/11$|12$|13$/.test(s)) return `${s}th`;
        if (/1$/.test(s)) return `${s}st`;
        if (/2$/.test(s)) return `${s}nd`;
        if (/3$/.test(s)) return `${s}rd`;
        return `${s}th`;
    }
    private hasSubmissionFeature() {
        return this.features.some((f) => f.kind === 'submission');
    }

    /** <svg> ラッパ */
    private wrapSVG(inner: string, height: number): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${
            this.width + (this.hasSubmissionFeature() ? 40 : 0)
        }" height="${height}"
      viewBox="0 0 ${this.width + (this.hasSubmissionFeature() ? 40 : 0)} ${height}">
      <defs>
        <filter id="drop-shadow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="720" height="440">
          <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#fff"/>
      ${inner}
    </svg>`;
    }
}
