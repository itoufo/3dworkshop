/**
 * クッキー型の立体が「閉じているか」を確かめる自己診断。
 *
 * 立体が閉じていない STL はスライサーが勝手に穴を塞ごうとして形が崩れる。
 * 目で見て分かる不具合ではないので、代表的な輪郭を機械的に検査する。
 *
 *   npx tsx scripts/test-cookie-cutter.ts
 */
import { writeFileSync } from 'fs'
import { buildCutterMesh } from '../lib/cookie-cutter/mesh'
import { meshToStl } from '../lib/cookie-cutter/stl'
import { validateContours, isBlocking } from '../lib/cookie-cutter/validate'
import { DEFAULT_PARAMS, sanitizeParams } from '../lib/cookie-cutter/params'
import { normalizeContoursToSize, type Polygon } from '../lib/cookie-cutter/polygon'
import { CUTTER_PRESETS } from '../lib/cookie-cutter/presets'
import { traceImage, flipY, DEFAULT_TRACE_OPTIONS } from '../lib/cookie-cutter/trace'

function circle(n = 200): Polygon {
  return Array.from({ length: n }, (_, i): [number, number] => {
    const t = (i / n) * Math.PI * 2
    return [Math.cos(t), Math.sin(t)]
  })
}

/** ハート。上の谷が鋭く、輪郭を外側にずらすと折り返しやすい */
function heart(n = 300): Polygon {
  return Array.from({ length: n }, (_, i): [number, number] => {
    const t = (i / n) * Math.PI * 2
    return [
      16 * Math.sin(t) ** 3,
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    ]
  })
}

/** 星。鋭い角が10か所ある */
function star(points = 5, n = 400): Polygon {
  return Array.from({ length: n }, (_, i): [number, number] => {
    const t = (i / n) * Math.PI * 2
    const r = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(points * t)) ** 3
    return [Math.cos(t) * r, Math.sin(t) * r]
  })
}

/** 手描きの線を模した、細かく震える輪郭 */
function wobbly(n = 500): Polygon {
  return Array.from({ length: n }, (_, i): [number, number] => {
    const t = (i / n) * Math.PI * 2
    const r = 1 + 0.08 * Math.sin(t * 17) + 0.05 * Math.sin(t * 29 + 1)
    return [Math.cos(t) * r, Math.sin(t) * r * 0.8]
  })
}

/**
 * 画像を経由した経路も確かめる。
 * 多角形を白黒のビットマップに焼いてから輪郭を取り出し直し、
 * 「アップロードされた絵」と同じ道筋で型が作れるかを見る。
 */
function rasterizeAndTrace(poly: Polygon, side = 400): Polygon | null {
  const data = new Uint8ClampedArray(side * side * 4)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const scale = (side * 0.8) / Math.max(maxX - minX, maxY - minY)
  const toPixel = ([x, y]: [number, number]): [number, number] => [
    (x - (minX + maxX) / 2) * scale + side / 2,
    (y - (minY + maxY) / 2) * scale + side / 2,
  ]
  const pixels = poly.map(toPixel)

  // 各画素の中心が多角形の内側かを、交差回数で判定して塗る
  for (let py = 0; py < side; py++) {
    for (let px = 0; px < side; px++) {
      let inside = false
      for (let i = 0, j = pixels.length - 1; i < pixels.length; j = i++) {
        const [xi, yi] = pixels[i]
        const [xj, yj] = pixels[j]
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
      }
      const o = (py * side + px) * 4
      const value = inside ? 0 : 255
      data[o] = data[o + 1] = data[o + 2] = value
      data[o + 3] = 255
    }
  }

  const result = traceImage({ width: side, height: side, data } as ImageData, {
    ...DEFAULT_TRACE_OPTIONS,
    useAlpha: false,
    threshold: 128,
  })
  return result ? flipY(result.contours)[0] : null
}

/** 角の少ない形。間引くと4点・3点になるので、下限を上げると丸ごと捨てられる */
function rectangle(): Polygon {
  return [[-1, -0.7], [1, -0.7], [1, 0.7], [-1, 0.7]]
}
function triangle(): Polygon {
  return [[0, 1], [-0.9, -0.6], [0.9, -0.6]]
}

const shapes: [string, Polygon][] = [
  ['circle', circle()],
  ['rectangle', rectangle()],
  ['triangle', triangle()],
  ['heart', heart()],
  ['star', star()],
  ['wobbly', wobbly()],
]

const tracedHeart = rasterizeAndTrace(heart())
if (tracedHeart) shapes.push(['heart(画像経由)', tracedHeart])
else console.error('  NG  画像から輪郭を取り出せなかった')

const writeStl = process.argv.includes('--write-stl')
let failed = 0

for (const [name, raw] of shapes) {
  const params = sanitizeParams(DEFAULT_PARAMS)
  const centerlines = normalizeContoursToSize([raw], params.max_size_mm)
  const built = buildCutterMesh(centerlines, params)
  const open = built.openEdgeCount
  const warnings = validateContours(centerlines, params)

  if (writeStl) {
    writeFileSync(`/tmp/cutter-${name}.stl`, Buffer.from(meshToStl(built.mesh)))
  }

  const ok = open === 0
  if (!ok) failed++
  console.log(
    [
      ok ? '  OK ' : '  NG ',
      name.padEnd(14),
      `三角形 ${String(built.mesh.triangleCount).padStart(6)}`,
      `外形 ${built.size.width}×${built.size.depth}×${built.size.height}mm`,
      `体積 ${built.volumeCm3}cm3`,
      `閉じてない辺 ${open}`,
      warnings.length ? `警告 ${warnings.map((w) => w.kind).join(',')}` : '',
    ].join('  ')
  )
}

// 形が複数あるとき（文字の型）を確かめる
function disc(cx: number, cy: number, r: number, n = 90): Polygon {
  return Array.from({ length: n }, (_, i): [number, number] => {
    const t = (i / n) * Math.PI * 2
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r]
  })
}

const multiCases: [string, Polygon[], 'ok' | 'error'][] = [
  // 近い3つ。ふちが1枚につながるので型として成立する
  ['近い3つ', [disc(-14, 0, 10), disc(0, 0, 10), disc(14, 0, 10)], 'ok'],
  // ぎりぎり離れている。ふちの幅3mmでは届かず、バラバラの部品になるので断るのが正しい
  ['離れた2つ', [disc(-40, 0, 10), disc(40, 0, 10)], 'error'],
  // 輪に並べると、真ん中にふちの抜けができる（穴あきのふち）。
  // 隙間はふちが埋めきる程度に近く、真ん中の空きはふちで埋まらない程度に広い配置
  ['輪に並べた3つ', [disc(0.0, 13.0, 10.5), disc(-11.26, -6.5, 10.5), disc(11.26, -6.5, 10.5)], 'ok'],
  // 触れ合うほど近い3つ。刃が1本につながり、真ん中に窪み（底はふちの上面）ができる。
  // 文字を詰めて並べたときに起きるのと同じ形
  ['触れ合う3つ', [disc(0.0, 13.0, 11.4), disc(-11.26, -6.5, 11.4), disc(11.26, -6.5, 11.4)], 'ok'],
]

let multiFailed = 0
for (const [name, polys, expect] of multiCases) {
  const params = sanitizeParams(DEFAULT_PARAMS)
  const centerlines = normalizeContoursToSize(polys, 90)
  try {
    const built = buildCutterMesh(centerlines, params)
    const ok = expect === 'ok' && built.openEdgeCount === 0
    if (!ok) multiFailed++
    console.log(
      [
        ok ? '  OK ' : '  NG ',
        name.padEnd(14),
        `三角形 ${String(built.mesh.triangleCount).padStart(6)}`,
        `刃 ${built.rings.blades.length}本`,
        `ふちの抜け ${built.rings.flangeHoles.length}`,
        `窪み ${built.rings.blades.reduce((n, b) => n + b.pockets.length, 0)}`,
        `閉じてない辺 ${built.openEdgeCount}`,
        expect === 'error' ? '← 断るべきなのに通った' : '',
      ].join('  ')
    )
  } catch (err) {
    const ok = expect === 'error'
    if (!ok) multiFailed++
    console.log(`  ${ok ? 'OK ' : 'NG '} ${name.padEnd(14)} 断った: ${(err as Error).message.slice(0, 44)}`)
  }
}
failed += multiFailed
console.log('')

// 画面から選べる「よくある形」。全部が型になることを確かめる
let presetFailed = 0
for (const preset of CUTTER_PRESETS) {
  const params = sanitizeParams(DEFAULT_PARAMS)
  const centerlines = normalizeContoursToSize([preset.build()], params.max_size_mm)
  try {
    const built = buildCutterMesh(centerlines, params)
    if (built.openEdgeCount !== 0 || isBlocking(validateContours(centerlines, params))) {
      presetFailed++
      console.log(`  NG  見本「${preset.label}」 閉じてない辺 ${built.openEdgeCount}`)
    }
  } catch (err) {
    presetFailed++
    console.log(`  NG  見本「${preset.label}」 例外: ${(err as Error).message}`)
  }
}
console.log(`見本の形 ${CUTTER_PRESETS.length} 件: ${CUTTER_PRESETS.length - presetFailed} 件が型になる\n`)
failed += presetFailed

// 無作為な形をまとめて通し、たまたま動いているだけでないことを確かめる
let stressFailed = 0
const stressCount = 40
for (let seed = 0; seed < stressCount; seed++) {
  // 疑似乱数（毎回同じ結果になるようにする）
  let state = seed * 2654435761 + 1
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
  const lobes = 2 + Math.floor(random() * 8)
  const amplitude = 0.1 + random() * 0.45
  const phase = random() * Math.PI
  const poly: Polygon = Array.from({ length: 360 }, (_, i): [number, number] => {
    const t = (i / 360) * Math.PI * 2
    const r = 1 + amplitude * Math.sin(lobes * t + phase) + amplitude * 0.4 * Math.sin(lobes * 2.3 * t)
    return [Math.cos(t) * Math.max(0.15, r), Math.sin(t) * Math.max(0.15, r)]
  })
  const params = sanitizeParams(DEFAULT_PARAMS)
  try {
    const built = buildCutterMesh(normalizeContoursToSize([poly], params.max_size_mm), params)
    if (built.openEdgeCount !== 0) {
      stressFailed++
      console.log(`  NG  乱数形 seed=${seed} 山の数=${lobes} 起伏=${amplitude.toFixed(2)} 閉じてない辺 ${built.openEdgeCount}`)
    }
  } catch (err) {
    stressFailed++
    console.log(`  NG  乱数形 seed=${seed} で例外: ${(err as Error).message}`)
  }
}
console.log(`\n無作為な形 ${stressCount} 件: ${stressCount - stressFailed} 件が閉じている`)
failed += stressFailed

if (failed > 0) {
  console.error(`\n${failed} 件の形で立体が閉じていない。STL として出荷できない`)
  process.exit(1)
}
console.log('\nすべての形で立体が閉じている')
