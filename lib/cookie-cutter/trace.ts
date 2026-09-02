/**
 * 画像から「型にしたい形」の輪郭を1本取り出す。ブラウザ専用（ImageData を受け取る）。
 *
 * 手順:
 *   1. 明るさ（または透明度）で白黒に分ける
 *   2. 線の途切れを埋める（膨張→収縮）
 *   3. いちばん大きな塊だけ残す
 *   4. 塊の内側の穴を埋める（クッキー型は外形だけを使う）
 *   5. 塊の外周をたどって点列にする
 */
import type { Point, Polygon } from './polygon'
import { simplifyPolygon, smoothPolygon } from './polygon'

export interface TraceOptions {
  /** 明るさのしきい値(0〜255)。これより暗い画素を「形」とみなす */
  threshold: number
  /** 透過画像のときに、明るさではなく透明度で判定する */
  useAlpha: boolean
  /** 線の途切れを埋める強さ（画素）。手描きの線をつなぐのに使う */
  closeGaps: number
  /** 輪郭のなめらかさ。大きいほど点を間引いてなだらかにする（mm換算前の相対値） */
  smoothness: number
}

/** いちどに拾う形の数の上限。文字を並べても足りる数 */
const MAX_SHAPES = 40
/**
 * いちばん大きい形に対して、この割合より小さい塊は捨てる。
 * 紙のシミや鉛筆の擦れを別の型として拾わないため。
 */
const MIN_SHAPE_RATIO = 0.02

export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  threshold: 128,
  useAlpha: true,
  closeGaps: 2,
  smoothness: 1,
}

export interface TraceResult {
  /**
   * 画素座標の輪郭。Y は下向き（画像と同じ向き）。
   * 離れた塊はそれぞれ別の輪郭になる（文字を並べれば1文字につき1本）。
   */
  contours: Polygon[]
  /** 見つかった塊の数（小さすぎて捨てたものも含む） */
  componentCount: number
  /** 形とみなした画素の割合。0に近いとしきい値が合っていない */
  coverage: number
}

/** 画像を長辺 maxSide 画素まで縮める。大きい画像をそのまま走査すると重い */
export function downscaleImageData(image: ImageData, maxSide = 512): ImageData {
  const longest = Math.max(image.width, image.height)
  if (longest <= maxSide) return image

  const scale = maxSide / longest
  const w = Math.max(1, Math.round(image.width * scale))
  const h = Math.max(1, Math.round(image.height * scale))

  const source = document.createElement('canvas')
  source.width = image.width
  source.height = image.height
  source.getContext('2d')!.putImageData(image, 0, 0)

  const target = document.createElement('canvas')
  target.width = w
  target.height = h
  const ctx = target.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/** 画像に透明な部分があるか。あるなら明るさではなく透明度で形を判定する */
export function hasTransparency(image: ImageData): boolean {
  const data = image.data
  for (let i = 3; i < data.length; i += 4 * 16) {
    if (data[i] < 250) return true
  }
  return false
}

/**
 * 大津の方法でしきい値を自動で決める。
 * 白黒2つの山に分かれるとみなして、山のあいだが最も離れる位置を探す。
 */
export function autoThreshold(image: ImageData): number {
  const histogram = new Array<number>(256).fill(0)
  const data = image.data
  let total = 0
  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
    histogram[Math.round(luminance)]++
    total++
  }

  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * histogram[t]

  let sumBackground = 0
  let weightBackground = 0
  let best = 128
  let bestVariance = -1

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t]
    if (weightBackground === 0) continue
    const weightForeground = total - weightBackground
    if (weightForeground === 0) break

    sumBackground += t * histogram[t]
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2
    if (variance > bestVariance) {
      bestVariance = variance
      best = t
    }
  }
  return best
}

// ---- 白黒に分ける ----

function buildMask(image: ImageData, options: TraceOptions): Uint8Array {
  const { width, height, data } = image
  const mask = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (options.useAlpha) {
      mask[p] = data[i + 3] > 128 ? 1 : 0
    } else {
      const luminance = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
      mask[p] = luminance < options.threshold ? 1 : 0
    }
  }
  return mask
}

/** 正方形の窓で膨らませる／痩せさせる */
function morph(mask: Uint8Array, w: number, h: number, radius: number, dilate: boolean): Uint8Array {
  if (radius <= 0) return mask
  const out = new Uint8Array(w * h)
  const hit = dilate ? 1 : 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let found = false
      for (let dy = -radius; dy <= radius && !found; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= h) {
          // 画像の外は背景として扱う
          if (!dilate) { found = true }
          continue
        }
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= w) {
            if (!dilate) { found = true; break }
            continue
          }
          if (mask[ny * w + nx] === hit) { found = true; break }
        }
      }
      out[y * w + x] = dilate ? (found ? 1 : 0) : (found ? 0 : 1)
    }
  }
  return out
}

/**
 * つながっている塊ごとにマスクを分ける。
 * 小さすぎる塊（ゴミ）は捨て、大きい順に MAX_SHAPES 個まで返す。
 * 戻り値は [塊ごとのマスク, 見つかった塊の総数]。
 */
function splitComponents(mask: Uint8Array, w: number, h: number): [Uint8Array[], number] {
  const labels = new Int32Array(w * h).fill(-1)
  const sizes: number[] = []
  const stack: number[] = []

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || labels[start] !== -1) continue
    const label = sizes.length
    let size = 0
    stack.push(start)
    labels[start] = label

    while (stack.length > 0) {
      const p = stack.pop()!
      size++
      const x = p % w
      const y = (p - x) / w
      // 4近傍。斜めでつながっただけの点をひとつの塊にしない
      if (x > 0 && mask[p - 1] && labels[p - 1] === -1) { labels[p - 1] = label; stack.push(p - 1) }
      if (x < w - 1 && mask[p + 1] && labels[p + 1] === -1) { labels[p + 1] = label; stack.push(p + 1) }
      if (y > 0 && mask[p - w] && labels[p - w] === -1) { labels[p - w] = label; stack.push(p - w) }
      if (y < h - 1 && mask[p + w] && labels[p + w] === -1) { labels[p + w] = label; stack.push(p + w) }
    }
    sizes.push(size)
  }

  if (sizes.length === 0) return [[], 0]

  const biggest = Math.max(...sizes)
  const kept = sizes
    .map((size, label) => ({ size, label }))
    .filter((c) => c.size >= Math.max(30, biggest * MIN_SHAPE_RATIO))
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_SHAPES)

  const masks = kept.map(({ label }) => {
    const out = new Uint8Array(w * h)
    for (let p = 0; p < out.length; p++) out[p] = labels[p] === label ? 1 : 0
    return out
  })

  return [masks, sizes.length]
}

/** 塊の内側にある穴を埋める。クッキー型は外形だけを使うため */
function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(w * h)
  const stack: number[] = []

  const push = (p: number) => {
    if (mask[p] === 0 && outside[p] === 0) { outside[p] = 1; stack.push(p) }
  }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }

  while (stack.length > 0) {
    const p = stack.pop()!
    const x = p % w
    const y = (p - x) / w
    if (x > 0) push(p - 1)
    if (x < w - 1) push(p + 1)
    if (y > 0) push(p - w)
    if (y < h - 1) push(p + w)
  }

  const out = new Uint8Array(w * h)
  for (let p = 0; p < out.length; p++) out[p] = outside[p] === 1 ? 0 : 1
  return out
}

/**
 * 塊の外周をたどる（Moore 近傍追跡）。
 * 塗りつぶし済みの1つの塊が前提。戻り値は画素中心の座標列。
 */
function traceBoundary(mask: Uint8Array, w: number, h: number): Polygon {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x])

  let startX = -1
  let startY = -1
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) { startX = x; startY = y; break outer }
    }
  }
  if (startX < 0) return []

  // 時計回りに並べた8近傍
  const NEIGHBORS: [number, number][] = [
    [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0],
  ]

  const contour: Polygon = [[startX, startY]]
  let bx = startX
  let by = startY
  // 直前に通った背景の画素。走査の都合上、開始点の左は必ず背景
  let px = startX - 1
  let py = startY
  const maxSteps = w * h * 4

  for (let step = 0; step < maxSteps; step++) {
    const from = NEIGHBORS.findIndex(([dx, dy]) => bx + dx === px && by + dy === py)
    let moved = false
    for (let i = 1; i <= 8; i++) {
      const idx = (from + i) % 8
      const nx = bx + NEIGHBORS[idx][0]
      const ny = by + NEIGHBORS[idx][1]
      if (at(nx, ny)) {
        // ひとつ手前に調べた（背景だった）画素が、次の「直前の背景」になる
        const backIdx = (idx + 7) % 8
        px = bx + NEIGHBORS[backIdx][0]
        py = by + NEIGHBORS[backIdx][1]
        bx = nx
        by = ny
        moved = true
        break
      }
    }
    if (!moved) break // 孤立した1画素
    if (bx === startX && by === startY) break
    contour.push([bx, by])
  }
  return contour
}

/**
 * 画像から輪郭を取り出す。離れた塊はそれぞれ別の輪郭になる。
 * 戻り値の座標は画素単位・Y下向き。ミリへの換算は normalizeContoursToSize で行う。
 */
export function traceImage(image: ImageData, options: TraceOptions): TraceResult | null {
  const { width: w, height: h } = image

  let mask = buildMask(image, options)
  let filledPixels = 0
  for (const v of mask) filledPixels += v
  const coverage = filledPixels / (w * h)
  if (filledPixels < 16) return null

  // 線の途切れを埋める（膨らませてから同じだけ痩せさせる）
  if (options.closeGaps > 0) {
    mask = morph(mask, w, h, options.closeGaps, true)
    mask = morph(mask, w, h, options.closeGaps, false)
  }

  const [componentMasks, componentCount] = splitComponents(mask, w, h)
  if (componentMasks.length === 0) return null

  const tolerance = Math.max(0.2, options.smoothness * (Math.max(w, h) / 400))
  const contours: Polygon[] = []

  for (const componentMask of componentMasks) {
    const solid = fillHoles(componentMask, w, h)
    const raw = traceBoundary(solid, w, h)
    // 画素をたどった段階で点が少なすぎるのは、数画素のゴミ
    if (raw.length < 8) continue

    // 画素をたどった輪郭は階段状になっているので、角を丸めてから点を間引く。
    // ⚠ 間引いたあとの下限は3点。四角や三角は間引くと4点・3点になるので、
    //   ここを8点にすると「四角いクッキー型が作れない」ことになる
    const contour = simplifyPolygon(smoothPolygon(raw, 2), tolerance)
    if (contour.length >= 3) contours.push(contour)
  }

  if (contours.length === 0) return null
  return { contours, componentCount, coverage }
}

/** 画像のY下向き座標を、ミリの世界（Y上向き）に反転する */
export function flipY(contours: Polygon[]): Polygon[] {
  return contours.map((contour) => contour.map(([x, y]): Point => [x, -y]))
}
