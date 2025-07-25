import { canvasData } from '.';

interface ContestData {
    id: string;
    title: string;
    ratingRangeBegin: number;
    ratingRangeEnd: number;
    isHeuristic: boolean;
    contestType: string;
    lastSubmissionCrawlTime: Date | null;
    startTime: string;
    endTime: string;
    duration: number;
    resultPageHash: string;
    createdAt: Date;
    updatedAt: Date;
}
interface RatingData {
    oldRating: number;
    newRating: number;
    isHeuristic: boolean;
    contestId: string;
    contest: ContestData;
    performance: number;
    InnerPerformance: number;
    place: number;
}

export interface RatingColor {
    color: string;
    alpha: number;
}
export const COLORS: Array<{ rating: number; color: string; alpha: number }> = [
    { rating: 0, color: '#808080', alpha: 0.15 },
    { rating: 400, color: '#804000', alpha: 0.15 },
    { rating: 800, color: '#008000', alpha: 0.15 },
    { rating: 1200, color: '#00C0C0', alpha: 0.2 },
    { rating: 1600, color: '#0000FF', alpha: 0.1 },
    { rating: 2000, color: '#C0C000', alpha: 0.25 },
    { rating: 2400, color: '#FF8000', alpha: 0.2 },
    { rating: 2800, color: '#FF0000', alpha: 0.1 },
];
export function getRatingColor(rating: number): RatingColor {
    for (let i = COLORS.length - 1; i >= 0; i--) {
        if (rating >= COLORS[i].rating) {
            return { color: COLORS[i].color, alpha: COLORS[i].alpha };
        }
    }
    return { color: '#808080', alpha: 0.15 };
}

const cache: Record<string, RatingData[]> = {};
let mouseX = 0;
let mouseY = 0;
let isEntering = false;
let isEventRegistered = false;
let tip = {
    x: 0,
    y: 0,
    rating: 0,
    alpha: 0,
    isLeft: true,
    performance: 0,
};
export async function draw(
    ctx: CanvasRenderingContext2D,
    username: string,
    times: number = 1,
    isHeuristic = false,
    isLongHeuristic = false,
    usernameInput?: HTMLInputElement,
) {
    if (!isEventRegistered) {
        isEventRegistered = true;
        ctx.canvas.addEventListener('pointerenter', (e) => {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
            isEntering = true;
        });
        ctx.canvas.addEventListener('pointerleave', (e) => {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
            isEntering = false;
        });
        ctx.canvas.addEventListener('pointermove', (e) => {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
            isEntering = true;
            e.preventDefault();
        });
    }

    let data = cache[username];
    if (!data) {
        data = await (await fetch(`/api/v1/users/detail/${username}/history`)).json();
        if (!data || !Array.isArray(data)) {
            data = [];
        }
        cache[username] = data;
    }

    ctx.clearRect(0, 0, canvasData.width, canvasData.height);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1.0;
    let drawMaxPerformance = Math.max(3200, 500 + Math.max(...data.map((v) => v.newRating)));
    let cacheKey = `${username}-${times}-${isHeuristic ? 'heuristic' : 'algo'}-${isLongHeuristic}`;
    let { ratings, calcRating } =
        ratingsCache[cacheKey] || calcRatings(data, 1, drawMaxPerformance, drawMaxPerformance / (canvasData.width - 50), times, isHeuristic, isLongHeuristic);
    if (ratingsCache[cacheKey] && ratingsCache[cacheKey].ratings.length === ratings.length) {
        calcRating = ratingsCache[cacheKey].calcRating;
    } else {
        ratingsCache[cacheKey] = { ratings, calcRating };
    }
    let max = Math.max(...ratings);
    let min = Math.min(...ratings);
    let drawMax = max + 300;
    let drawMin = Math.max(0, min - 300);
    let drawingWidth = canvasData.width - 50;
    let drawingHeight = canvasData.height - 40;

    let flag = true;
    let lastYPos = drawingHeight + 5;
    ctx.textAlign = 'right';
    for (let y = 0; y <= 8000; y += 400) {
        const yPos = 5 + drawingHeight - ((y - drawMin) * drawingHeight) / (drawMax - drawMin);
        if (yPos < 5 || yPos > canvasData.height - 35) {
            if (!flag) {
                flag = true;
                ctx.fillStyle = getRatingColor(y - 400).color + '4d';
                ctx.fillRect(45, 5, canvasData.width - 50, lastYPos - 5);
            }
            continue;
        }
        if (flag) {
            flag = false;
            ctx.fillStyle = getRatingColor(y - 400).color + '4d';
            ctx.fillRect(45, yPos, canvasData.width - 50, lastYPos - yPos);
        } else {
            ctx.fillStyle = getRatingColor(y - 400).color + '4d';
            ctx.fillRect(45, yPos, canvasData.width - 50, lastYPos - yPos);
        }
        lastYPos = yPos;
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(`${y}`, 40, yPos + 4);
        ctx.beginPath();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.5;
        ctx.moveTo(45, yPos);
        ctx.lineTo(canvasData.width - 5, yPos);
        ctx.stroke();
        ctx.closePath();
    }
    ctx.textAlign = 'center';

    let span = 200;
    if (canvasData.width < 600) {
        span = 400;
    }
    for (let x = 0; x < drawMaxPerformance; x += span) {
        const xPos = 45 + ((x - 1) * (canvasData.width - 50)) / (drawMaxPerformance - 1);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(`${x}`, xPos, canvasData.height - 20);
        ctx.beginPath();
        ctx.moveTo(xPos, canvasData.height - 35);
        ctx.lineTo(xPos, 5);
        ctx.stroke();
        ctx.closePath();
    }

    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i < ratings.length; i++) {
        const x = 45 + (i * drawingWidth) / ratings.length;
        const y = 5 + drawingHeight - ((ratings[i] - drawMin) * drawingHeight) / (drawMax - drawMin);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    ctx.closePath();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 5, canvasData.width - 50, canvasData.height - 40);

    let dataFiltered = data.filter((d) => d.isHeuristic === isHeuristic);

    let nowRating = dataFiltered[dataFiltered.length - 1]?.newRating || 0;
    let maxRating = Math.max(...dataFiltered.map((v) => v.newRating)) || 0;
    if (maxRating < 0) {
        maxRating = 0;
    }
    let ratingElement = document.getElementById('rating') as HTMLInputElement;
    let performanceElement = document.getElementById('performance') as HTMLInputElement;
    if (window.isUserChanged) {
        ratingElement.value = String(Math.floor((nowRating + 1) / 400) * 400 + 400);
        window.isRatingChanged = true;
    }
    if (window.isRatingChanged) {
        let goalRating = parseFloat(ratingElement.value);
        ratingElement.style.color = getRatingColor(goalRating).color;
        if (goalRating <= 0) {
            performanceElement.value = String(Number.MAX_SAFE_INTEGER * -1);
            performanceElement.style.color = getRatingColor(0).color;
        } else {
            let l = 0;
            let r = 400;
            while (calcRating(r) < goalRating) {
                l = r;
                r *= 2;
            }
            r += 100;
            l -= 100;
            while (r - l > 0.005) {
                let mid = (l + r) / 2;
                if (calcRating(mid) < goalRating) {
                    l = mid;
                } else {
                    r = mid;
                }
            }
            performanceElement.value = String(((l + r) / 2).toFixed(2));
            performanceElement.style.color = getRatingColor((l + r) / 2).color;
        }
    } else if (window.isPerformanceChanged) {
        let performance = parseFloat(performanceElement.value);
        performanceElement.style.color = getRatingColor(performance).color;
        if (performance <= 0) {
            ratingElement.value = '0';
        }
        let rating = calcRating(performance);
        ratingElement.value = String(rating.toFixed(2));
        ratingElement.style.color = getRatingColor(rating).color;
    }
    window.isRatingChanged = false;
    window.isPerformanceChanged = false;
    window.isUserChanged = false;
    let nowRatingYPos = 5 + drawingHeight - ((nowRating - drawMin) * drawingHeight) / (drawMax - drawMin);
    let maxRatingYPos = 5 + drawingHeight - ((maxRating - drawMin) * drawingHeight) / (drawMax - drawMin);
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 2;
    if (nowRatingYPos < 5) {
        nowRatingYPos = 5;
    }
    if (nowRatingYPos > canvasData.height - 35) {
        nowRatingYPos = canvasData.height - 35;
    }
    if (maxRatingYPos < 5) {
        maxRatingYPos = 5;
    }
    if (maxRatingYPos > canvasData.height - 35) {
        maxRatingYPos = canvasData.height - 35;
    }
    ctx.beginPath();
    ctx.moveTo(45, nowRatingYPos);
    ctx.lineTo(canvasData.width - 5, nowRatingYPos);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(45, maxRatingYPos);
    ctx.lineTo(canvasData.width - 5, maxRatingYPos);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(50, nowRatingYPos - 30, 70, 25, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(canvasData.width - 100, maxRatingYPos - 30, 90, 25, 5);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '13px Arial';
    ctx.fillText(`Now: ${Math.round(nowRating)}`, 85, nowRatingYPos - 13);
    ctx.fillText(`Highest: ${Math.round(maxRating)}`, canvasData.width - 55, maxRatingYPos - 13);

    if (usernameInput) {
        usernameInput.style.color = getRatingColor(nowRating).color;
    }

    if (isEntering && mouseX >= 45 && mouseX <= canvasData.width - 5 && mouseY >= 5 && mouseY <= canvasData.height - 35) {
        ctx.fillStyle = '#000';
        let isLeft = mouseX < canvasData.width / 2;
        let xPos = ((mouseX - 45) / (canvasData.width - 50)) * drawMaxPerformance;
        let rating = calcRating(xPos);
        let drawX = Math.max(45, Math.min(mouseX - (isLeft ? 0 : 90), canvasData.width - 90));
        let yPos = 5 + drawingHeight - ((rating - drawMin) * drawingHeight) / (drawMax - drawMin) - 17.5;
        tip.x = (drawX + tip.x) / 2;
        tip.y = (yPos + tip.y) / 2;
        tip.rating = rating;
        tip.performance = xPos;
        tip.alpha += (1 - tip.alpha) * 0.2;
        tip.isLeft = isLeft;
    } else {
        tip.alpha -= tip.alpha * 0.2;
    }
    ctx.globalAlpha = tip.alpha * 0.8;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(tip.x + 5, tip.y, 80, 35, 5);
    ctx.fill();
    if (tip.isLeft) {
        ctx.beginPath();
        ctx.moveTo(tip.x + 5, tip.y + 17.5 - 5);
        ctx.lineTo(tip.x + 5 - 5, tip.y + 17.5);
        ctx.lineTo(tip.x + 5, tip.y + 17.5 + 5);
        ctx.lineTo(tip.x + 5 + 5, tip.y + 17.5);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(tip.x + 85, tip.y + 17.5 - 5);
        ctx.lineTo(tip.x + 85 - 5, tip.y + 17.5);
        ctx.lineTo(tip.x + 85, tip.y + 17.5 + 5);
        ctx.lineTo(tip.x + 85 + 5, tip.y + 17.5);
        ctx.fill();
    }
    ctx.globalAlpha = tip.alpha;
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Perf: ${Math.round(tip.performance)}`, tip.x + 10, tip.y + 15);
    ctx.fillText(`Rating: ${Math.round(tip.rating)}`, tip.x + 10, tip.y + 30);
}
function G(X: number) {
    return 2.0 ** (X / 800.0);
}
function invG(X: number) {
    return 800.0 * Math.log2(X);
}
function mapRating(rating: number) {
    if (rating < 400) {
        return 400 / Math.exp((400 - rating) / 400);
    }
    return rating;
}
function mapRatingInv(rating: number) {
    if (rating < 400) {
        return 400 * (1 + Math.log(rating / 400));
    }
    return rating;
}
function correction(count: number) {
    return ((Math.sqrt(1 - 0.81 ** count) / (1 - 0.9 ** count) - 1) / (Math.sqrt(19) - 1)) * 1200;
}
const S = 724.4744301;
const R = 0.8271973364;
let ratingsCache: Record<string, { ratings: number[]; calcRating: (performance: number) => number }> = {};
function calcRatings(data: RatingData[], min: number, max: number, span: number, times: number, isHeuristic: boolean, isLongHeuristic: boolean) {
    let newRatings: number[] = [];
    if (isHeuristic) {
        let dataOnlyHeuristic = data.filter((d) => d.isHeuristic);
        let baseQ: number[][] = [];
        for (let i = 0; i < dataOnlyHeuristic.length; i++) {
            let days = Math.floor((new Date().getTime() - new Date(dataOnlyHeuristic[i].contest.endTime).getTime()) / (1000 * 60 * 60 * 24));
            let offset = 150 - 100 * (days / 365);
            const d = dataOnlyHeuristic[i];
            let isShortContest = new Date(d.contest.endTime).getTime() - new Date(d.contest.startTime).getTime() < 24 * 60 * 60 * 1000;
            for (let j = 1; j <= 100; j++) {
                baseQ.push([d.InnerPerformance - S * Math.log(j) + offset, isShortContest ? 0.5 : 1]);
            }
        }
        baseQ.sort((a, b) => b[0] - a[0]);
        for (let x = min; x <= max; x += span) {
            let Q = Array.from(baseQ);
            for (let j = 0; j < 100; j++) {
                for (let i = 0; i < times; i++) {
                    Q.push([x - S * Math.log(j + 1), isLongHeuristic ? 1.0 : 0.5]);
                }
            }
            Q.sort((a, b) => b[0] - a[0]);
            let sigma = 0;
            let ruiseki = [0];
            for (let i = 0; i < Q.length; i++) {
                ruiseki.push(ruiseki[i] + Q[i][1]);
            }
            for (let i = 0; i < Q.length; i++) {
                sigma += Q[i][0] * (R ** ruiseki[i] - R ** ruiseki[i + 1]);
            }
            newRatings.push(mapRating(sigma));
        }
        return {
            ratings: newRatings,
            calcRating: (performance: number) => {
                let Q = Array.from(baseQ);
                for (let j = 0; j < 100; j++) {
                    for (let i = 0; i < times; i++) {
                        Q.push([performance - S * Math.log(j + 1), isLongHeuristic ? 1.0 : 0.5]);
                    }
                }
                Q.sort((a, b) => b[0] - a[0]);
                let sigma = 0;
                let ruiseki = [0];
                for (let i = 0; i < Q.length; i++) {
                    ruiseki.push(ruiseki[i] + Q[i][1]);
                }
                for (let i = 0; i < Q.length; i++) {
                    sigma += Q[i][0] * (R ** ruiseki[i] - R ** ruiseki[i + 1]);
                }
                return mapRating(sigma);
            },
        };
    }
    let dataOnlyAlgo = data.filter((d) => !d.isHeuristic);
    dataOnlyAlgo.sort((a, b) => b.contest.startTime.localeCompare(a.contest.startTime));
    let ratingA = 0;
    let ratingB = 9 * (1 - 0.9 ** (dataOnlyAlgo.length + times));
    for (let i = 0; i < dataOnlyAlgo.length; i++) {
        const d = dataOnlyAlgo[i];
        ratingA += G(d.InnerPerformance) * 0.9 ** (i + 1 + times);
    }
    for (let x = min; x <= max; x += span) {
        let sigma = ratingA;
        for (let i = 0; i < times; i++) {
            sigma += 0.9 ** (i + 1) * G(mapRatingInv(x));
        }
        newRatings.push(mapRating(invG(sigma / ratingB) - correction(dataOnlyAlgo.length + times)));
    }
    return {
        ratings: newRatings,
        calcRating: (performance: number) => {
            let sigma = ratingA;
            for (let i = 0; i < times; i++) {
                sigma += 0.9 ** (i + 1) * G(mapRatingInv(performance));
            }
            return mapRating(invG(sigma / ratingB) - correction(dataOnlyAlgo.length + times));
        },
    };
}
