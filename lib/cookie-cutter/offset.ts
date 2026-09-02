/**
 * 輪郭を一定距離だけ外側/内側にずらす処理。
 *
 * 大きくずらすと、へこんだ部分で輪郭同士がぶつかって形が分裂したり穴が消えたりする。
 * そこの処理を自前で書くと壊れやすいので、clipper-lib に任せる。
 *
 * 複数の輪郭をまとめて渡せる。近い形どうしは太らせると1枚につながり、
 * 離れていれば別々のまま返る。文字の型（1文字ずつが別の刃）で使う。
 */
import { ClipperOffset, JoinType, EndType, JS, type IntPoint } from 'clipper-lib'
import type { Polygon } from './polygon'
import { signedArea, toCounterClockwise, removeCollinear } from './polygon'

/** clipper は整数座標で計算する。1mm を 1000 単位として扱う（0.001mm 刻み） */
const SCALE = 1000

function toClipper(poly: Polygon): IntPoint[] {
  return poly.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }))
}

function fromClipper(path: IntPoint[]): Polygon {
  return path.map((p): [number, number] => [p.X / SCALE, p.Y / SCALE])
}

/**
 * ずらした結果。
 * outers = 外周（この内側が材料）／ holes = 材料が無い抜けた部分。
 * どちらも反時計回りに揃えて返す。「穴かどうか」は配列の別で表す。
 */
export interface OffsetResult {
  outers: Polygon[]
  holes: Polygon[]
}

/**
 * 複数の輪郭をまとめて distance ミリずらす（負の値で内側）。
 *
 * ⚠ 戻り値の穴と外周を取り違えないこと。clipper は穴を逆回りで返してくるので、
 *   全部を反時計回りに揃えてしまうと区別が付かなくなる。ここで分けてから揃えている。
 */
export function offsetContours(polys: Polygon[], distance: number, rounded = true): OffsetResult {
  const usable = polys.filter((p) => p.length >= 3)
  if (usable.length === 0) return { outers: [], holes: [] }

  const offsetter = new ClipperOffset(2.0, 0.25 * SCALE)
  offsetter.AddPaths(
    // 向きを揃えてから渡す。混ざっていると片方が穴として扱われることがある
    usable.map((p) => toClipper(toCounterClockwise(p))),
    rounded ? JoinType.jtRound : JoinType.jtMiter,
    EndType.etClosedPolygon
  )

  const solution: IntPoint[][] = []
  offsetter.Execute(solution, distance * SCALE)

  const outers: Polygon[] = []
  const holes: Polygon[] = []

  for (const path of solution) {
    // 重複点とほぼ直線上の点を落とす（0.02mm 未満のずれは印刷では見えない）
    const cleaned = JS.Clean(path, 0.02 * SCALE)
    if (cleaned.length < 3) continue

    const poly = fromClipper(cleaned)
    // 面積の符号で外周と穴を見分ける。負なら穴
    const isHole = signedArea(poly) < 0

    // 面を張る前に、一直線に並んだ点を落とす。
    // 残すと面積ゼロの三角形ができ、その長辺だけ噛み合わない継ぎ目になる
    const normalized = removeCollinear(toCounterClockwise(poly))
    if (normalized.length < 3) continue
    ;(isHole ? holes : outers).push(normalized)
  }

  const byAreaDesc = (a: Polygon, b: Polygon) => Math.abs(signedArea(b)) - Math.abs(signedArea(a))
  outers.sort(byAreaDesc)
  holes.sort(byAreaDesc)
  return { outers, holes }
}

/** 1つの輪郭をずらして、外周だけを返す（穴は捨てる） */
export function offsetPolygonAll(poly: Polygon, distance: number, rounded = true): Polygon[] {
  return offsetContours([poly], distance, rounded).outers
}

/**
 * 面積が最大の外周だけを返す。
 * 分裂したかどうかを知りたい場合は offsetPolygonAll を使う。
 */
export function offsetPolygon(poly: Polygon, distance: number, rounded = true): Polygon | null {
  const all = offsetPolygonAll(poly, distance, rounded)
  return all.length > 0 ? all[0] : null
}
