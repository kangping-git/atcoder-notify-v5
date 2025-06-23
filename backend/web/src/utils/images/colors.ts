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
