export function getRankingText(place: number): string {
    const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
    const rem100 = place % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${place}th`;
    const rem10 = place % 10;
    return `${place}${suffixes[rem10] ?? 'th'}`;
}
