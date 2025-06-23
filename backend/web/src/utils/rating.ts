export function normalizeRating(rating: number): number {
    if (rating < 400) {
        return 400 / Math.exp((400 - rating) / 400);
    }
    return rating;
}
