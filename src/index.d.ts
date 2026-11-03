export type MortonRange<T extends object = {}> = T & {
  start: number | bigint;
  length: number | bigint;
  cellWidth?: number;
  pathVertices?: [number | bigint, number | bigint][];
};

export interface MortonLayout {
  canvasWidth(): number;
  canvasWidth(value: number): this;
  order(): number;
  order(value: number): this;
  simplifyCurves(): boolean;
  simplifyCurves(value: boolean): this;
  layout<T extends object>(range: MortonRange<T>): this;
  getValAtXY(x: number, y: number): number | bigint;
}

declare function morton(): MortonLayout;

export default morton;