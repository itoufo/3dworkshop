/**
 * 「印刷はできるが、クッキー型として使えない」形を出荷前に見つける。
 *
 * 一番多い失敗は、輪郭がくびれていて刃の壁どうしがくっついてしまう箇所。
 * ここを事前に赤く表示して、輪郭を単純にしてもらう。
 */
import type { CutterParams } from './params'
import type { Point, Polygon } from './polygon'
import { perimeter, boundingBoxOf } from './polygon'
import { offsetPolygonAll } from './offset'

export interface CutterWarning {
  kind: 'narrow' | 'blade_split' | 'self_intersect' | 'too_small' | 'too_few_points'
  message: string
  /** 問題のある位置（mm座標）。UI で赤い点として重ねる */
  points: Point[]
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const sign = (p: Point, q: Point, r: Point) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]))
  const d1 = sign(a, b, c)
  const d2 = sign(a, b, d)
  const d3 = sign(c, d, a)
  const d4 = sign(c, d, b)
  return d1 !== d2 && d3 !== d4
}

/**
 * 輪郭を検査する。centerlines はミリ単位で、等間隔に点が打たれていること。
 * 文字の型のように形が複数あるときは、細さの判定は形ごとに行う
 * （隣の文字との隙間は、ふちが埋めるので問題にならない）。
 */
export function validateContours(centerlines: Polygon[], params: CutterParams): CutterWarning[] {
  const warnings: CutterWarning[] = []
  // ⚠ 3点（三角形）から受け付ける。8点にすると四角や三角が弾かれる
  const usable = centerlines.filter((c) => c.length >= 3)

  if (usable.length === 0) {
    return [
      {
        kind: 'too_few_points',
        message: '輪郭の点が少なすぎます。画像のしきい値を調整して、形がはっきり出るようにしてください。',
        points: [],
      },
    ]
  }

  const { minX, minY, maxX, maxY } = boundingBoxOf(usable)
  if (maxX - minX < 15 || maxY - minY < 15) {
    warnings.push({
      kind: 'too_small',
      message: '型が小さすぎます。サイズを大きくするか、細長すぎない形にしてください。',
      points: [],
    })
  }

  // 刃の壁どうしが接近しすぎている箇所を探す。
  // 中心線どうしの距離が「刃の厚み ＋ 1.0mm」を下回ると、生地の通り道が1mm未満になり抜けない
  const minGap = params.blade_thickness_mm + 1.0
  const narrowPoints: Point[] = []
  const crossPoints: Point[] = []
  let solidShapes = 0
  let splitShapes = 0

  for (const centerline of usable) {
    const n = centerline.length
    // 輪郭に沿って近いだけの点（曲線の隣同士）を誤検出しないよう、一定の弧長ぶんは無視する
    const spacing = perimeter(centerline) / n
    const skip = Math.max(3, Math.ceil((minGap * 2) / spacing))

    for (let i = 0; i < n; i++) {
      let worst = Infinity
      for (let j = 0; j < n; j++) {
        const along = Math.min(Math.abs(i - j), n - Math.abs(i - j))
        if (along <= skip) continue

        const dist = distanceToSegment(centerline[i], centerline[j], centerline[(j + 1) % n])
        if (dist < worst) worst = dist

        if (
          segmentsCross(
            centerline[i],
            centerline[(i + 1) % n],
            centerline[j],
            centerline[(j + 1) % n]
          )
        ) {
          crossPoints.push(centerline[i])
        }
      }
      if (worst < minGap) narrowPoints.push(centerline[i])
    }

    // 刃の内側の輪郭が残るかを直接調べる。
    // 消えると中身の詰まった塊になり、分断されるとその区間で生地が抜けない
    const innerRings = offsetPolygonAll(centerline, -params.blade_thickness_mm / 2)
    if (innerRings.length === 0) solidShapes++
    else if (innerRings.length > 1) splitShapes++
  }

  if (solidShapes > 0) {
    warnings.push({
      kind: 'blade_split',
      message:
        usable.length === 1
          ? '形が細すぎて刃を作れません。クッキーの大きさを大きくしてください。'
          : `${solidShapes} つの形が細すぎて、刃ではなく中身の詰まった塊になります。太い書体にするか、クッキーの大きさを大きくしてください。`,
      points: [],
    })
  } else if (splitShapes > 0) {
    warnings.push({
      kind: 'blade_split',
      message: `くびれが強く、${splitShapes} つの形で刃が分断されます。このままでは生地が抜けません。「なめらかさ」を上げるか、クッキーの大きさを大きくしてください。`,
      points: [],
    })
  }

  if (narrowPoints.length > 0) {
    warnings.push({
      kind: 'narrow',
      message: `くびれている箇所が ${narrowPoints.length} か所あります。ここは刃どうしがくっつき、生地が抜けません。「なめらかさ」を上げるか、型を大きくしてください。`,
      points: narrowPoints,
    })
  }

  if (crossPoints.length > 0) {
    warnings.push({
      kind: 'self_intersect',
      message: '輪郭が自分自身と交差しています。元の絵の線が重なっているか、しきい値が合っていません。',
      points: crossPoints.slice(0, 50),
    })
  }

  return warnings
}

/** 出荷を止めるべき警告か（交差した輪郭は必ず印刷に失敗する） */
export function isBlocking(warnings: CutterWarning[]): boolean {
  return warnings.some(
    (w) => w.kind === 'self_intersect' || w.kind === 'too_few_points' || w.kind === 'blade_split'
  )
}
