/**
 * 閉じた多角形の基本操作。ブラウザとサーバーの両方で動く純粋な計算だけを置く。
 * 座標系は「ミリメートル、XY平面、Yは上向き」。
 */

/** [x, y]。JSONB に入れるので配列にしている（{x,y} よりデータ量が小さい） */
export type Point = [number, number]

/** 閉じた輪郭。始点と終点は重複させない（最後の点から先頭の点へ自動的に閉じる） */
export type Polygon = Point[]

export function signedArea(poly: Polygon): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

/** 反時計回りに揃える。以降の法線計算がすべてこの向きを前提にしている */
export function toCounterClockwise(poly: Polygon): Polygon {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly
}

export function perimeter(poly: Polygon): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    sum += Math.hypot(x2 - x1, y2 - y1)
  }
  return sum
}

export function boundingBox(poly: Polygon): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

/** 複数の輪郭をまとめて囲む枠 */
export function boundingBoxOf(polys: Polygon[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const poly of polys) {
    for (const [x, y] of poly) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  return { minX, minY, maxX, maxY }
}

/**
 * 複数の輪郭を、全体の長辺が targetSize になるよう拡大縮小し、全体の中心を原点に置く。
 * ⚠ 1つずつ正規化しないこと。文字の型では字ごとの大きさと位置の関係が壊れる。
 */
export function normalizeContoursToSize(polys: Polygon[], targetSize: number): Polygon[] {
  const { minX, minY, maxX, maxY } = boundingBoxOf(polys)
  const longest = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(longest) || longest <= 0) return polys

  const scale = targetSize / longest
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return polys.map((poly) => poly.map(([x, y]): Point => [(x - cx) * scale, (y - cy) * scale]))
}

/** 長辺が targetSize になるよう拡大縮小し、重心が原点に来るよう平行移動する */
export function normalizeToSize(poly: Polygon, targetSize: number): Polygon {
  const { minX, minY, maxX, maxY } = boundingBox(poly)
  const width = maxX - minX
  const height = maxY - minY
  const longest = Math.max(width, height)
  if (longest <= 0) return poly

  const scale = targetSize / longest
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return poly.map(([x, y]): Point => [(x - cx) * scale, (y - cy) * scale])
}

// ---- 点の間引きと平滑化 ----

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  // 線分 ab 上で p に一番近い位置を 0〜1 で求める
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/**
 * Douglas-Peucker 法で点を間引く。tolerance はミリメートル。
 * 手描きの線のギザギザを落とし、印刷できないほど細かい凹凸を消す。
 */
export function simplifyPolygon(poly: Polygon, tolerance: number): Polygon {
  if (poly.length < 4 || tolerance <= 0) return poly

  const keep = new Array<boolean>(poly.length).fill(false)
  keep[0] = true
  keep[poly.length - 1] = true

  const stack: [number, number][] = [[0, poly.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let maxDist = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const dist = perpendicularDistance(poly[i], poly[first], poly[last])
      if (dist > maxDist) {
        maxDist = dist
        index = i
      }
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = true
      stack.push([first, index], [index, last])
    }
  }

  const result = poly.filter((_, i) => keep[i])
  return result.length >= 3 ? result : poly
}

/** Chaikin 法の角丸め。手描きの階段状の輪郭をなめらかにする */
export function smoothPolygon(poly: Polygon, passes = 1): Polygon {
  let current = poly
  for (let pass = 0; pass < passes; pass++) {
    if (current.length < 4) break
    const next: Polygon = []
    for (let i = 0; i < current.length; i++) {
      const [x1, y1] = current[i]
      const [x2, y2] = current[(i + 1) % current.length]
      next.push([x1 + (x2 - x1) * 0.25, y1 + (y2 - y1) * 0.25])
      next.push([x1 + (x2 - x1) * 0.75, y1 + (y2 - y1) * 0.75])
    }
    current = next
  }
  return current
}

/**
 * 輪郭上に等間隔の点を打ち直す。
 * 隣り合う点の間隔を揃えておくと、法線をずらして厚みを作るときに形が崩れにくい。
 */
export function resamplePolygon(poly: Polygon, spacing: number): Polygon {
  if (poly.length < 3 || spacing <= 0) return poly

  const n = poly.length
  const edgeLengths: number[] = []
  let total = 0
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % n]
    const len = Math.hypot(x2 - x1, y2 - y1)
    edgeLengths.push(len)
    total += len
  }
  if (total === 0) return poly

  const count = Math.max(3, Math.round(total / spacing))
  const step = total / count

  const result: Polygon = []
  let edge = 0
  /** いま見ている辺の始点から進んだ距離 */
  let consumed = 0

  for (let i = 0; i < count; i++) {
    // 1点目は始点そのもの。2点目以降は step だけ輪郭に沿って進む
    let remaining = i === 0 ? 0 : step
    while (remaining > 0) {
      const leftInEdge = edgeLengths[edge] - consumed
      if (leftInEdge > remaining) {
        consumed += remaining
        remaining = 0
      } else {
        // 長さ0の辺もここで読み飛ばされる（remaining は減らないが edge は進む）
        remaining -= leftInEdge
        edge = (edge + 1) % n
        consumed = 0
      }
    }
    const [x1, y1] = poly[edge]
    const [x2, y2] = poly[(edge + 1) % n]
    const t = edgeLengths[edge] === 0 ? 0 : consumed / edgeLengths[edge]
    result.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
  }
  return result
}

/**
 * 一直線に並んだ点を落とす。
 *
 * 直線上の3点は面積ゼロの三角形を生み、その三角形の長い辺だけが
 * 隣の面と噛み合わない「T字の継ぎ目」になる。立体に穴が空いたのと同じ扱いになるので、
 * 面を張る前に必ず通す。
 *
 * ⚠ 既定値を 0.002mm より小さくしないこと。
 *   clipper は座標を 0.001mm 刻みに丸めるので、まっすぐな辺の上の点でも
 *   最大 0.0007mm ほど線から外れる。これより厳しい閾値にすると
 *   「まっすぐなのに直線と判定されない」点が数百個残り、
 *   面の三角形分割が細長い三角形だらけになって立体に穴が空く
 *   （八角形が閉じなかった原因。2026-09-03）。
 *   0.002mm は積層ピッチ 0.2mm の 100分の1 で、形には影響しない。
 */
export function removeCollinear(poly: Polygon, epsilon = 0.002): Polygon {
  if (poly.length < 4) return poly

  const result: Polygon = []
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const prev = result.length > 0 ? result[result.length - 1] : poly[(i - 1 + n) % n]
    const current = poly[i]
    const next = poly[(i + 1) % n]

    // 直前の点と重なっている点も落とす
    if (Math.hypot(current[0] - prev[0], current[1] - prev[1]) < epsilon) continue
    if (perpendicularDistance(current, prev, next) < epsilon) continue

    result.push(current)
  }

  // 先頭と末尾がつながる箇所も同じ判定をする
  while (result.length >= 3) {
    const last = result[result.length - 1]
    if (perpendicularDistance(last, result[result.length - 2], result[0]) >= epsilon) break
    result.pop()
  }

  return result.length >= 3 ? result : poly
}

/** 点が多角形の内側にあるか（交差回数で判定） */
export function pointInPolygon(point: Point, poly: Polygon): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// ---- 法線 ----

/**
 * 各頂点の外向き法線。反時計回りの多角形が前提。
 *
 * 角の部分では隣り合う2辺の法線を平均し、「ずらした距離が指定どおりになる」よう
 * 長さを伸ばす（マイター）。鋭角では伸びが無限大になるので上限で頭打ちにする。
 */
export function outwardNormals(poly: Polygon, miterLimit = 2.5): Point[] {
  const n = poly.length
  const edgeNormals: Point[] = []
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % n]
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    // 反時計回りのとき、進行方向を右に90度回すと外側を向く
    edgeNormals.push([dy / len, -dx / len])
  }

  const normals: Point[] = []
  for (let i = 0; i < n; i++) {
    const prev = edgeNormals[(i - 1 + n) % n]
    const next = edgeNormals[i]
    let nx = prev[0] + next[0]
    let ny = prev[1] + next[1]
    const len = Math.hypot(nx, ny)
    if (len < 1e-9) {
      // 180度折り返している場合は直前の辺の法線をそのまま使う
      normals.push([prev[0], prev[1]])
      continue
    }
    nx /= len
    ny /= len
    const cos = nx * next[0] + ny * next[1]
    const scale = Math.min(miterLimit, 1 / Math.max(cos, 1e-3))
    normals.push([nx * scale, ny * scale])
  }
  return normals
}

/** 法線方向に distance だけずらした多角形（正で外側、負で内側） */
export function offsetAlongNormals(poly: Polygon, normals: Point[], distance: number): Polygon {
  return poly.map(([x, y], i): Point => [x + normals[i][0] * distance, y + normals[i][1] * distance])
}
