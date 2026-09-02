/**
 * よくある形の見本。
 *
 * 画像を経由せず、計算でそのまま輪郭を作る。
 * 写真や絵と違って階段状のギザギザが無いので、しきい値や「なめらかさ」の調整も要らない。
 *
 * 座標はおおよそ -1〜1 の範囲。実際の寸法は normalizeContoursToSize が決める。
 */
import type { Point, Polygon } from './polygon'
import { offsetContours } from './offset'

export interface CutterPreset {
  key: string
  label: string
  /** 検索・読み上げ用 */
  keywords: string
  build: () => Polygon
}

/** 円・楕円。n は多角形として近似するときの点の数 */
function ellipse(rx: number, ry: number, n = 120): Polygon {
  return Array.from({ length: n }, (_, i): Point => {
    const t = (i / n) * Math.PI * 2
    return [Math.cos(t) * rx, Math.sin(t) * ry]
  })
}

/**
 * 正多角形。
 * 辺の数が偶数のときは上を平らに、奇数のときは頂点を上に向ける
 * （四角を頂点上にするとひし形に見えてしまうため）
 */
function regularPolygon(sides: number, radius = 1): Polygon {
  const flatTop = sides % 2 === 0
  const offset = Math.PI / 2 + (flatTop ? Math.PI / sides : 0)
  return Array.from({ length: sides }, (_, i): Point => {
    const t = offset + (i / sides) * Math.PI * 2
    return [Math.cos(t) * radius, Math.sin(t) * radius]
  })
}

/** 角を丸めた四角。丸めは円弧を点で近似する */
function roundedRectangle(width: number, height: number, radius: number, arcSteps = 10): Polygon {
  const hw = width / 2 - radius
  const hh = height / 2 - radius
  const corners: [number, number, number][] = [
    [hw, hh, 0], // 右上
    [-hw, hh, Math.PI / 2], // 左上
    [-hw, -hh, Math.PI], // 左下
    [hw, -hh, Math.PI * 1.5], // 右下
  ]
  const points: Polygon = []
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= arcSteps; i++) {
      const t = start + (i / arcSteps) * (Math.PI / 2)
      points.push([cx + Math.cos(t) * radius, cy + Math.sin(t) * radius])
    }
  }
  return points
}

/** 星。points は稜の数、innerRatio は谷の深さ（小さいほど鋭い） */
function star(points: number, innerRatio: number, n = 240): Polygon {
  // 頂点と谷を直線で結ぶと角がはっきり出るので、頂点・谷を交互に並べるだけにする
  const result: Polygon = []
  for (let i = 0; i < points * 2; i++) {
    const t = Math.PI / 2 + (i / (points * 2)) * Math.PI * 2
    const r = i % 2 === 0 ? 1 : innerRatio
    result.push([Math.cos(t) * r, Math.sin(t) * r])
  }
  void n
  return result
}

/** ハート */
function heart(n = 160): Polygon {
  return Array.from({ length: n }, (_, i): Point => {
    const t = (i / n) * Math.PI * 2
    return [
      (16 * Math.sin(t) ** 3) / 17,
      (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17,
    ]
  })
}

/** 花。petals は花びらの数 */
function flower(petals: number, depth = 0.32, n = 240): Polygon {
  return Array.from({ length: n }, (_, i): Point => {
    const t = (i / n) * Math.PI * 2
    const r = 1 - depth + depth * Math.cos(petals * t)
    return [Math.cos(t) * r, Math.sin(t) * r]
  })
}

/** たまご。下がふくらんだ楕円 */
function egg(n = 140): Polygon {
  return Array.from({ length: n }, (_, i): Point => {
    const t = (i / n) * Math.PI * 2
    const y = Math.sin(t)
    // 上へ行くほど細くする
    const width = 0.78 * (1 - 0.22 * y)
    return [Math.cos(t) * width, y]
  })
}

/**
 * 雲。下は平らで、上に大きさの違うふくらみが3つ。
 *
 * 角度ごとに半径を決める式では作れない形（中心から見て輪郭が2回横切る）なので、
 * 円と土台の四角を重ねて、その外周を取る。
 */
function cloud(): Polygon {
  const circle = (cx: number, cy: number, r: number, n = 64): Polygon =>
    Array.from({ length: n }, (_, i): Point => {
      const t = (i / n) * Math.PI * 2
      return [cx + Math.cos(t) * r, cy + Math.sin(t) * r]
    })

  const base: Polygon = [
    [-0.86, -0.36],
    [0.9, -0.36],
    [0.9, 0.1],
    [-0.86, 0.1],
  ]
  const parts = [circle(-0.5, 0.0, 0.4), circle(0.02, 0.22, 0.55), circle(0.55, -0.02, 0.38), base]

  // ごくわずかに太らせて重なりを1つにまとめ、その外周を使う
  const merged = offsetContours(parts, 0.005).outers[0]
  return merged ?? parts[1]
}

/**
 * 選べる形。
 * ⚠ 細すぎる形（三日月など）はここに入れない。刃どうしがくっついて生地が抜けない。
 */
export const CUTTER_PRESETS: CutterPreset[] = [
  { key: 'circle', label: '丸', keywords: 'まる 円 サークル', build: () => ellipse(1, 1) },
  { key: 'ellipse', label: '楕円', keywords: 'だえん 長丸', build: () => ellipse(1, 0.66) },
  { key: 'square', label: '四角', keywords: 'しかく 正方形', build: () => regularPolygon(4) },
  {
    key: 'rounded-square',
    label: '角丸四角',
    keywords: 'かどまる しかく',
    build: () => roundedRectangle(2, 2, 0.42),
  },
  {
    key: 'rectangle',
    label: '長方形',
    keywords: 'ながしかく カード',
    build: () => roundedRectangle(2, 1.3, 0.2),
  },
  { key: 'triangle', label: '三角', keywords: 'さんかく 三角形', build: () => regularPolygon(3) },
  { key: 'pentagon', label: '五角形', keywords: 'ごかっけい 5角形', build: () => regularPolygon(5) },
  { key: 'hexagon', label: '六角形', keywords: 'ろっかっけい 6角形 ハチの巣', build: () => regularPolygon(6) },
  { key: 'octagon', label: '八角形', keywords: 'はっかっけい 8角形', build: () => regularPolygon(8) },
  { key: 'star5', label: '星（5稜）', keywords: 'ほし スター 五芒星', build: () => star(5, 0.46) },
  { key: 'star6', label: '星（6稜）', keywords: 'ほし スター 六芒星 雪', build: () => star(6, 0.56) },
  { key: 'heart', label: 'ハート', keywords: 'はーと 恋 バレンタイン', build: () => heart() },
  { key: 'flower', label: '花', keywords: 'はな フラワー 桜', build: () => flower(5) },
  { key: 'egg', label: 'たまご', keywords: 'たまご 卵 イースター', build: () => egg() },
  { key: 'cloud', label: '雲', keywords: 'くも 雲 そら', build: () => cloud() },
]

/** 見本を SVG のパスにする（一覧のボタンに描く用） */
export function presetToSvgPath(polygon: Polygon): string {
  // SVG は Y が下向きなので上下を反転する
  return (
    polygon.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(3)},${(-y).toFixed(3)}`).join(' ') +
    ' Z'
  )
}
