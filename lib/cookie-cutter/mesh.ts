/**
 * 輪郭（2Dの閉じた線）と寸法から、クッキー型の三角形メッシュを組み立てる。
 *
 * 出来上がる立体は「筒」。上下に穴が空いていて、そこを生地が通る。
 * 面の構成は次のとおり（z=0 が造形プレート）:
 *
 *   z = blade_height       刃の上端の輪っか（刃の外側→内側）
 *   z = flange_thickness   フランジの上面（フランジ外周→刃の外側）
 *   z = 0                  底面（フランジ外周→刃の内側）※フランジと刃の底は一枚の面
 *   側面                    フランジ外周(0〜ft) / 刃の外側(ft〜h) / 刃の内側(0〜h)
 *
 * 刃の内外の輪郭は、法線方向に頂点をずらす方式ではなく clipper で作る。
 * ハートの谷やギザギザの内角では、頂点をずらす方式は輪郭が折り返して交差するため。
 */
import earcut from 'earcut'
import type { CutterParams } from './params'
import type { Polygon } from './polygon'
import { resamplePolygon, toCounterClockwise, boundingBoxOf, pointInPolygon, signedArea } from './polygon'
import { offsetContours } from './offset'

export interface Mesh {
  /** 三角形1枚につき9個（頂点3つ × xyz）の座標が並ぶ */
  positions: number[]
  triangleCount: number
}

export interface BuiltCutter {
  mesh: Mesh
  /** フランジまで含めた外形寸法（mm） */
  size: { width: number; depth: number; height: number }
  /** 体積（立方センチメートル）。フィラメント量の目安に使う */
  volumeCm3: number
  /** プレビュー用の輪郭 */
  rings: {
    /** ふちの外周 */
    flangeOuter: Polygon
    /** ふちに空いた抜け（形どうしが離れていて埋まらなかった部分） */
    flangeHoles: Polygon[]
    /**
     * 刃ごとの外側・内側・窪み。
     * inners が空の刃は「細すぎて中身が詰まっている」。
     * pockets は、形どうしが触れ合ったときに刃と刃のあいだにできる小さな窪み
     * （底はふちの上面、そこから刃の高さまで空いている）。
     */
    blades: { outer: Polygon; inners: Polygon[]; pockets: Polygon[] }[]
  }
  /**
   * 閉じていない辺の数。0 でなければ立体として破綻していて、
   * スライサーが穴を勝手に塞ごうとして意図しない形が印刷される。
   *
   * ⚠ 0 でないものは売らない・ダウンロードさせないこと。
   *   刃の内側と外側の輪郭が接触するほど細い形（尖った谷など）で起きる。
   */
  openEdgeCount: number
}

/**
 * 立体が閉じているかを数える。
 * 閉じた立体なら、どの辺もちょうど2回、互いに逆向きに現れる。
 * 片側しか現れない辺が1本でもあれば、そこに穴が空いている。
 */
export function countOpenEdges(mesh: Mesh): number {
  const p = mesh.positions
  const key = (i: number) => `${p[i].toFixed(4)},${p[i + 1].toFixed(4)},${p[i + 2].toFixed(4)}`
  const open = new Map<string, number>()

  for (let i = 0; i < p.length; i += 9) {
    const v = [key(i), key(i + 3), key(i + 6)]
    for (let e = 0; e < 3; e++) {
      const a = v[e]
      const b = v[(e + 1) % 3]
      if (a === b) continue // つぶれた三角形の辺は数えない
      const backward = `${b}|${a}`
      const pending = open.get(backward)
      if (pending) {
        if (pending === 1) open.delete(backward)
        else open.set(backward, pending - 1)
      } else {
        const forward = `${a}|${b}`
        open.set(forward, (open.get(forward) ?? 0) + 1)
      }
    }
  }

  let total = 0
  for (const count of open.values()) total += count
  return total
}

export class CutterGeometryError extends Error {}

type Vec3 = [number, number, number]

class MeshBuilder {
  positions: number[] = []

  /**
   * 三角形を1枚足す。want は「この面が向いてほしい向き」。
   * 頂点の順序が want と食い違えば自動で入れ替えるので、面の裏表を数え上げなくて済む。
   *
   * ⚠ つぶれた三角形も捨てずに残す。捨てると辺の対応が崩れて立体に穴が空く。
   *   面積0なので体積には影響せず、STL 側では法線を (0,0,0) にして書き出す。
   */
  addTriangle(a: Vec3, b: Vec3, c: Vec3, want: Vec3) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx

    if (nx * want[0] + ny * want[1] + nz * want[2] < 0) {
      this.positions.push(...a, ...c, ...b)
    } else {
      this.positions.push(...a, ...b, ...c)
    }
  }

  /** 1本の輪郭を2つの高さのあいだで垂直な壁にする */
  addWall(ring: Polygon, zBottom: number, zTop: number, outward: boolean) {
    const n = ring.length
    const sign = outward ? 1 : -1
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const dx = ring[j][0] - ring[i][0]
      const dy = ring[j][1] - ring[i][1]
      const len = Math.hypot(dx, dy) || 1
      // 反時計回りの輪郭では、進行方向を右に90度回した向きが外側
      const want: Vec3 = [(dy / len) * sign, (-dx / len) * sign, 0]
      const a: Vec3 = [ring[i][0], ring[i][1], zBottom]
      const b: Vec3 = [ring[j][0], ring[j][1], zBottom]
      const c: Vec3 = [ring[j][0], ring[j][1], zTop]
      const d: Vec3 = [ring[i][0], ring[i][1], zTop]
      this.addTriangle(a, b, c, want)
      this.addTriangle(a, c, d, want)
    }
  }

  /**
   * 平らな面を張る。outer の内側から holes を抜いた形になる。
   * 外周と穴で点の数が違ってよいので、clipper が作った輪郭同士をそのまま繋げられる。
   */
  addFlatFace(outer: Polygon, holes: Polygon[], z: number, facingUp: boolean) {
    const flat: number[] = []
    const holeIndices: number[] = []
    for (const [x, y] of outer) flat.push(x, y)
    let cursor = outer.length
    for (const hole of holes) {
      holeIndices.push(cursor)
      for (const [x, y] of hole) flat.push(x, y)
      cursor += hole.length
    }

    const indices = earcut(flat, holeIndices, 2)
    const want: Vec3 = [0, 0, facingUp ? 1 : -1]
    const all: Polygon = [outer, ...holes].flat()
    for (let i = 0; i < indices.length; i += 3) {
      const a = all[indices[i]]
      const b = all[indices[i + 1]]
      const c = all[indices[i + 2]]
      this.addTriangle([a[0], a[1], z], [b[0], b[1], z], [c[0], c[1], z], want)
    }
  }
}

/** 三角形の集まりから体積を求める（発散定理）。閉じた立体であることが前提 */
function meshVolumeMm3(positions: number[]): number {
  let volume = 0
  for (let i = 0; i < positions.length; i += 9) {
    const ax = positions[i], ay = positions[i + 1], az = positions[i + 2]
    const bx = positions[i + 3], by = positions[i + 4], bz = positions[i + 5]
    const cx = positions[i + 6], cy = positions[i + 7], cz = positions[i + 8]
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
  }
  return Math.abs(volume)
}

/**
 * 輪郭からクッキー型を組み立てる。
 *
 * centerlines は「刃の厚みの中心を通る線」の集まり。すでにミリ単位に拡大縮小されていること。
 * 複数渡せる（文字の型なら1文字につき1本）。近い形どうしはふちが1枚につながり、
 * 離れすぎているとバラバラの部品になるので、そのときは組み立てを断る。
 */
export function buildCutterMesh(centerlines: Polygon[], params: CutterParams): BuiltCutter {
  const halfThickness = params.blade_thickness_mm / 2

  // 点の間隔を揃えておく。粗すぎると輪郭がカクつき、細かすぎると三角形が無駄に増える
  const bases = centerlines
    .filter((c) => c.length >= 3)
    .map((c) => toCounterClockwise(resamplePolygon(c, 0.5)))

  if (bases.length === 0) {
    throw new CutterGeometryError('輪郭がありません')
  }

  // 刃の内外の輪郭。
  //
  // ⚠ 形ごとに別々に作らないこと。形が近い（あるいは重なっている）と輪郭どうしが交差し、
  //   面を張るときに三角形分割が破綻して立体に穴が空く。
  //   まとめて太らせて union させると、くっつく刃は1本にまとまる。
  const outerSet = offsetContours(bases, halfThickness)
  if (outerSet.outers.length === 0) {
    throw new CutterGeometryError(
      '輪郭から型を作れませんでした。形が細すぎるか、線が閉じていない可能性があります。'
    )
  }
  // 内側は細い形だと分裂したり消えたりする（そこは中身の詰まった塊になる）
  const innerRings = offsetContours(bases, -halfThickness).outers

  // どの輪郭がどの刃の中にあるかを対応づける。
  // 刃の上端の面を張るのに、その刃が持つ穴だけを渡す必要がある
  const blades: { outer: Polygon; inners: Polygon[]; pockets: Polygon[] }[] = outerSet.outers.map(
    (outer) => ({ outer, inners: [] as Polygon[], pockets: [] as Polygon[] })
  )

  /** 内側にある輪郭を、それを含むいちばん小さい刃に割り当てる */
  const assign = (ring: Polygon, key: 'inners' | 'pockets') => {
    let best = -1
    let bestArea = Infinity
    for (let i = 0; i < blades.length; i++) {
      if (!pointInPolygon(ring[0], blades[i].outer)) continue
      const area = Math.abs(signedArea(blades[i].outer))
      if (area < bestArea) {
        best = i
        bestArea = area
      }
    }
    if (best >= 0) blades[best][key].push(ring)
  }

  for (const inner of innerRings) assign(inner, 'inners')
  // 形どうしが触れ合うと、刃と刃のあいだに小さな窪みができる。
  // 文字を詰めて並べたときにふつうに起きるので、弾かずに窪みとして作る
  for (const pocket of outerSet.holes) assign(pocket, 'pockets')

  // ふちは全部まとめて太らせる。近い形どうしはここで1枚につながる
  const flange = offsetContours(bases, halfThickness + params.flange_width_mm)
  if (flange.outers.length === 0) {
    throw new CutterGeometryError('ふちを作れませんでした。クッキーの大きさを大きくしてください。')
  }
  if (flange.outers.length > 1) {
    throw new CutterGeometryError(
      `形が ${flange.outers.length} つに離れていて、ひとつの型になりません。` +
        '形どうしを近づけるか、「ふちの幅」を広げてつなげてください。'
    )
  }

  const flangeOuter = flange.outers[0]
  const flangeHoles = flange.holes
  const allInners = blades.flatMap((b) => b.inners)
  const allOuters = blades.map((b) => b.outer)
  const allPockets = blades.flatMap((b) => b.pockets)

  const ft = params.flange_thickness_mm
  const h = params.blade_height_mm
  const builder = new MeshBuilder()

  // 底面（ふちと刃の底を一枚の面としてまとめて塞ぐ）
  builder.addFlatFace(flangeOuter, [...flangeHoles, ...allInners], 0, false)
  // ふちの外周の壁
  builder.addWall(flangeOuter, 0, ft, true)
  // ふちに空いた抜けの壁。材料が無い側へ法線を向ける
  for (const hole of flangeHoles) {
    builder.addWall(hole, 0, ft, false)
  }
  // ふちの上面
  builder.addFlatFace(flangeOuter, [...flangeHoles, ...allOuters], ft, true)
  // 窪みの底。ふちの上面と同じ高さだが、刃の内側にあるので別に張る
  for (const pocket of allPockets) {
    builder.addFlatFace(pocket, [], ft, true)
  }

  for (const blade of blades) {
    // 刃の外側の壁（ふちに埋まる高さから上だけ）
    builder.addWall(blade.outer, ft, h, true)
    // 刃の内側の壁（底から上端まで）
    for (const inner of blade.inners) {
      builder.addWall(inner, 0, h, false)
    }
    // 窪みの壁（ふちの上面から刃の上端まで）
    for (const pocket of blade.pockets) {
      builder.addWall(pocket, ft, h, false)
    }
    // 刃の上端
    builder.addFlatFace(blade.outer, [...blade.pockets, ...blade.inners], h, true)
  }

  const positions = builder.positions
  const mesh: Mesh = { positions, triangleCount: positions.length / 9 }
  const { minX, minY, maxX, maxY } = boundingBoxOf([flangeOuter])

  return {
    mesh,
    size: {
      width: Math.round((maxX - minX) * 10) / 10,
      depth: Math.round((maxY - minY) * 10) / 10,
      height: h,
    },
    volumeCm3: Math.round((meshVolumeMm3(positions) / 1000) * 100) / 100,
    rings: { flangeOuter, flangeHoles, blades },
    openEdgeCount: countOpenEdges(mesh),
  }
}
