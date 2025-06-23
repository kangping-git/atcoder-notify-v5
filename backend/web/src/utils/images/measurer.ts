import { createCanvas } from 'canvas';

export class TextMeasurer {
    private ctx = createCanvas(0, 0).getContext('2d')!;

    measure(text: string, font: string): number {
        this.ctx.font = font;
        return this.ctx.measureText(text).width;
    }
}
