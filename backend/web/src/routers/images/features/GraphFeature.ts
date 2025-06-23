/**
 * Feature プラグインの共通インタフェース。
 * `kind` は bounds 計算などで利用するため固定文字列で識別。
 */
export interface GraphFeature {
    readonly kind: 'performance' | 'submission';
    readonly zIndex: number;
    render(): Promise<string>;
}
