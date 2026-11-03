export type MortonRange<T extends object = {}> = T & {
  start: number;
  length: number;
  cellWidth?: number;
  pathVertices?: [number, number][];
};

export interface MortonLayout {
  canvasWidth(): number;
  canvasWidth(value: number): this;
  order(): number;
  order(value: number): this;
  simplifyCurves(): boolean;
  simplifyCurves(value: boolean): this;
  layout<T extends object>(range: MortonRange<T>): this;
  getValAtXY(x: number, y: number): number;
}

declare function morton(): MortonLayout;

export default morton;