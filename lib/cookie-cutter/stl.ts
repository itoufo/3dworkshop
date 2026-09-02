/**
 * 三角形メッシュを STL（バイナリ形式）に書き出す。
 * バイナリ形式は 80バイトのヘッダ ＋ 三角形数(4バイト) ＋ 三角形1枚あたり50バイト。
 */
import type { Mesh } from './mesh'

export function meshToStl(mesh: Mesh, header = '3dworkshop cookie cutter'): ArrayBuffer {
  const count = mesh.triangleCount
  const buffer = new ArrayBuffer(84 + count * 50)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // ヘッダ80バイト。先頭が "solid" だとアスキー形式と誤認されるので避ける
  const headerText = header.slice(0, 79)
  for (let i = 0; i < headerText.length; i++) {
    bytes[i] = headerText.charCodeAt(i) & 0x7f
  }

  view.setUint32(80, count, true)

  let offset = 84
  const p = mesh.positions
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i], ay = p[i + 1], az = p[i + 2]
    const bx = p[i + 3], by = p[i + 4], bz = p[i + 5]
    const cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]

    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const len = Math.hypot(nx, ny, nz)
    if (len > 1e-12) {
      nx /= len; ny /= len; nz /= len
    } else {
      // つぶれた三角形。STL では法線 (0,0,0) が「頂点の並びから求めよ」の意味になる
      nx = 0; ny = 0; nz = 0
    }

    view.setFloat32(offset, nx, true); offset += 4
    view.setFloat32(offset, ny, true); offset += 4
    view.setFloat32(offset, nz, true); offset += 4
    for (const v of [ax, ay, az, bx, by, bz, cx, cy, cz]) {
      view.setFloat32(offset, v, true)
      offset += 4
    }
    view.setUint16(offset, 0, true); offset += 2
  }

  return buffer
}
