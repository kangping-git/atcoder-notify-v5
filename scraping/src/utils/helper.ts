namespace Helper {
    export function getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    export function getRandomFloat(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    export function getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }
}
