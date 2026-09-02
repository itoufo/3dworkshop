/**
 * clipper-lib は型定義を同梱していないため、このプロジェクトで使う範囲だけ宣言する。
 * 使うのは「閉じた多角形を外側/内側に一定距離ずらす」処理（ClipperOffset）だけ。
 */
declare module 'clipper-lib' {
  export interface IntPoint {
    X: number
    Y: number
  }

  /** 角の丸め方。Miter=尖らせる / Round=丸める / Square=面取り */
  export const JoinType: {
    jtSquare: number
    jtRound: number
    jtMiter: number
  }

  /** 端の処理。閉じた多角形は etClosedPolygon */
  export const EndType: {
    etClosedPolygon: number
    etClosedLine: number
    etOpenSquare: number
    etOpenRound: number
    etOpenButt: number
  }

  export class ClipperOffset {
    constructor(miterLimit?: number, arcTolerance?: number)
    AddPath(path: IntPoint[], joinType: number, endType: number): void
    AddPaths(paths: IntPoint[][], joinType: number, endType: number): void
    Execute(solution: IntPoint[][], delta: number): void
    Clear(): void
  }

  export const JS: {
    /** 重複点・ほぼ直線上の点を除去する */
    Clean(path: IntPoint[], distance: number): IntPoint[]
    CleanPolygons(paths: IntPoint[][], distance: number): IntPoint[][]
  }

  export const Clipper: {
    /** 符号付き面積。正なら反時計回り */
    Area(path: IntPoint[]): number
    Orientation(path: IntPoint[]): boolean
    SimplifyPolygons(paths: IntPoint[][], fillType?: number): IntPoint[][]
  }
}
