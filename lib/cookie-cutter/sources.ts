/**
 * 型の元になる形を「画像」に落とす層。ブラウザ専用。
 *
 * SVG・文字・アイコンのどれも、いったん透明な下地に描いてから
 * 既存の輪郭抽出（trace.ts）に通す。入口ごとに別の幾何処理を書くより、
 * しきい値・すき間埋め・なめらかさの操作が1つで済む。
 *
 * 下地を透明にしておくと、塗りの色が白でも黒でも「描かれた部分＝形」として拾える。
 */
import type { Polygon } from './polygon'

/** 描き込む解像度。60mmの型に対して0.06mm/画素で、刃の厚み0.8mmより十分細かい */
const RENDER_SIZE = 1024

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas を使えませんでした')
  return [canvas, ctx]
}

// ---- SVG ----

export class SvgParseError extends Error {}

/**
 * SVG の文字列から、描画に使える安全な SVG を組み立て直す。
 *
 * ⚠ 受け取った SVG を innerHTML でページに差し込まないこと。
 *   SVG は <script> を持てるので、差し込んだ時点で他人のコードがこのサイトで動く。
 *   ここでは DOMParser で読む（構文解析だけで実行されない）→ 危ない要素を落とす →
 *   Blob にして <img> で描く、の順で扱う。<img> 経由なら script も外部読み込みも動かない。
 */
function sanitizeSvg(svgText: string, size: number): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new SvgParseError('SVGとして読み取れませんでした。ファイルが壊れていないかご確認ください。')
  }

  const svg = doc.documentElement
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') {
    throw new SvgParseError('SVGファイルではないようです。')
  }

  // 実行されうるもの・外部を読みに行くものを落とす
  for (const el of Array.from(doc.querySelectorAll('script, foreignObject, use[*|href^="http"], image[*|href^="http"]'))) {
    el.remove()
  }
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith('on')) el.removeAttribute(attr.name)
    }
  }

  // 表示する大きさを決める。
  // viewBox が無く width/height も無い SVG は <img> で 0×0 になることがあるので、必ず入れる
  const viewBox = svg.getAttribute('viewBox')
  if (!viewBox) {
    const w = parseFloat(svg.getAttribute('width') || '') || RENDER_SIZE
    const h = parseFloat(svg.getAttribute('height') || '') || RENDER_SIZE
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }

  const box = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number)
  const boxW = box[2] || RENDER_SIZE
  const boxH = box[3] || RENDER_SIZE
  const scale = size / Math.max(boxW, boxH)

  svg.setAttribute('width', String(Math.round(boxW * scale)))
  svg.setAttribute('height', String(Math.round(boxH * scale)))
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  return new XMLSerializer().serializeToString(svg)
}

/** SVG の文字列を透明な下地に描いて ImageData にする */
export async function svgTextToImageData(svgText: string, size = RENDER_SIZE): Promise<ImageData> {
  const safe = sanitizeSvg(svgText, size)
  const blob = new Blob([safe], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await loadImage(url)
    const w = img.naturalWidth || size
    const h = img.naturalHeight || size
    const [, ctx] = makeCanvas(w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return ctx.getImageData(0, 0, w, h)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new SvgParseError('画像として描けませんでした。'))
    img.src = url
  })
}

// ---- アイコン（Font Awesome など、1本のパスで表された形）----

/**
 * パスの実際の広がりを測る。
 *
 * ⚠ アイコンの座標は viewBox に収まっているとは限らない
 *   （Font Awesome 7 の星は y が負から始まる）。
 *   決め打ちの viewBox で描くと端が切れるので、必ず測ってから枠を決める。
 */
function measurePath(pathData: string): { x: number; y: number; width: number; height: number } {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  // getBBox は画面に載っていないと 0 を返すブラウザがあるので、見えない形で一度置く
  svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden;overflow:hidden')
  const path = document.createElementNS(ns, 'path')
  // ⚠ setAttribute で入れる。innerHTML で組み立てない
  path.setAttribute('d', pathData)
  svg.appendChild(path)
  document.body.appendChild(svg)
  try {
    const box = path.getBBox()
    if (!box.width || !box.height) throw new SvgParseError('アイコンの形を読み取れませんでした。')
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  } finally {
    svg.remove()
  }
}

export interface PathBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 複数のパスの広がりをまとめて測る。一覧の見本を描くときに使う。
 * 1つずつ測るより速く、DOM への出し入れも1回で済む。
 */
export function measurePaths(pathDataList: string[]): PathBox[] {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden;overflow:hidden')
  const nodes = pathDataList.map((d) => {
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
    return path
  })
  document.body.appendChild(svg)
  try {
    return nodes.map((node) => {
      const box = node.getBBox()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    })
  } finally {
    svg.remove()
  }
}

/** アイコンのパスを透明な下地に描いて ImageData にする */
export async function iconPathToImageData(pathData: string, size = RENDER_SIZE): Promise<ImageData> {
  const box = measurePath(pathData)
  // ぴったりだと端が欠けるので少しだけ余白を取る
  const margin = Math.max(box.width, box.height) * 0.02
  const viewBox = `${box.x - margin} ${box.y - margin} ${box.width + margin * 2} ${box.height + margin * 2}`
  const svgText =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
    `<path d="${pathData.replace(/"/g, '')}" fill="#000"/></svg>`
  return svgTextToImageData(svgText, size)
}

// ---- 文字 ----

export interface CutterFont {
  /** CSS の font-family に入れる名前 */
  family: string
  /** 画面に出す名前 */
  label: string
  weight: number
  /** Google Fonts から読み込むときの指定 */
  googleFontsQuery: string
  /** 細くて型に向かない書体には注意を出す */
  thin?: boolean
}

/**
 * 使える書体。
 * ⚠ 細い書体は刃どうしがくっついて型にならない。太いものを既定にしてある。
 */
export const CUTTER_FONTS: CutterFont[] = [
  { family: 'Dela Gothic One', label: '極太ゴシック', weight: 400, googleFontsQuery: 'Dela+Gothic+One' },
  { family: 'M PLUS Rounded 1c', label: '丸ゴシック', weight: 800, googleFontsQuery: 'M+PLUS+Rounded+1c:wght@800' },
  { family: 'Noto Sans JP', label: 'ゴシック', weight: 900, googleFontsQuery: 'Noto+Sans+JP:wght@900' },
  { family: 'RocknRoll One', label: 'やわらかゴシック', weight: 400, googleFontsQuery: 'RocknRoll+One' },
  { family: 'Yusei Magic', label: '手書き風', weight: 400, googleFontsQuery: 'Yusei+Magic' },
  { family: 'Noto Serif JP', label: '明朝', weight: 900, googleFontsQuery: 'Noto+Serif+JP:wght@900', thin: true },
]

const loadedFonts = new Set<string>()

/** 書体を読み込む。読み終わるまで待たないと、下書き用の書体で描いてしまう */
export async function loadCutterFont(font: CutterFont, sample: string): Promise<void> {
  if (!loadedFonts.has(font.family)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontsQuery}&display=swap`
    document.head.appendChild(link)
    loadedFonts.add(font.family)
  }
  try {
    // 使う文字だけを指定して読み込む（日本語の書体は文字ごとに分割配信されている）
    await document.fonts.load(`${font.weight} 100px "${font.family}"`, sample || 'あ')
    await document.fonts.ready
  } catch {
    // 読めなくても既定の書体で描く。形は作れる
  }
}

export interface TextRenderOptions {
  text: string
  font: CutterFont
  /** 字間。em単位。負の値で詰めて、字どうしをつなげる */
  letterSpacing: number
}

/**
 * 文字を透明な下地に描いて ImageData にする。
 *
 * ⚠ 1文字ずつ位置を決めて描く。canvas の letterSpacing は対応していないブラウザがあり、
 *   字間を詰められないと1文字ごとに刃が離れて「ひとつの型」にならない。
 */
export function textToImageData(options: TextRenderOptions, size = RENDER_SIZE): ImageData {
  const chars = [...options.text].filter((c) => c.trim().length > 0 || c === ' ')
  if (chars.length === 0) throw new Error('文字を入力してください')

  const fontSize = 200
  const spacing = options.letterSpacing * fontSize
  const [, measureCtx] = makeCanvas(8, 8)
  const fontSpec = `${options.font.weight} ${fontSize}px "${options.font.family}", sans-serif`
  measureCtx.font = fontSpec

  const widths = chars.map((c) => measureCtx.measureText(c).width)
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + spacing * (chars.length - 1)

  // 字の上下がどこまで伸びるかは書体によって違うので、実測して枠を決める
  const metrics = measureCtx.measureText(options.text)
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.88
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.24
  const totalHeight = ascent + descent

  const pad = fontSize * 0.15
  const scale = size / Math.max(totalWidth + pad * 2, totalHeight + pad * 2)

  const [, ctx] = makeCanvas((totalWidth + pad * 2) * scale, (totalHeight + pad * 2) * scale)
  ctx.scale(scale, scale)
  ctx.font = fontSpec
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#000'

  let x = pad
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, pad + ascent)
    x += widths[i] + spacing
  }

  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
}

/** 輪郭が何本あるかを画面に出すときの言い回し */
export function shapeCountLabel(contours: Polygon[]): string {
  return contours.length === 1 ? '1つの形' : `${contours.length}つの形`
}
