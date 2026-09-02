/**
 * サーバー側だけで動くクッキー型の処理。
 *
 * ⚠ STL の実ファイルは、決済が終わってからここで初めて作る。
 *   ブラウザで作って「買ったら渡す」形にすると、開発者ツールから無料で取り出せる。
 *   ブラウザ側は同じ計算で見た目のプレビューまでを担当し、ファイルは作らない。
 */
import 'server-only'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildCutterMesh, CutterGeometryError } from './mesh'
import { meshToStl } from './stl'
import { sanitizeParams, type CutterParams } from './params'
import { normalizeContoursToSize, type Point, type Polygon } from './polygon'
import { DOWNLOAD_VALID_DAYS } from './pricing'

/** 生成した STL と元画像を置く非公開バケット */
export const CUTTER_BUCKET = 'cookie-cutter'

/**
 * 輪郭として受け付ける点の数。多すぎるとサーバーが詰まる。
 * ⚠ 下限は3（三角形）。四角は4点、三角は3点になるので、ここを上げると角の少ない形が弾かれる
 */
const MIN_POINTS = 3
const MAX_POINTS = 20000
/** 形の数の上限。文字の型でも数十が上限（1文字1形） */
const MAX_SHAPES = 60
/** 座標の許容範囲（mm）。桁外れの値でメモリを食わせない */
const MAX_COORD = 10000

export class InvalidContourError extends Error {}

/**
 * クライアントから届いた輪郭を検証する。
 *
 * ⚠ JSONB にそのまま入れる値なので、ここを通さずに保存しないこと。
 *
 * 受け付ける形は「輪郭の配列」。文字の型では1文字につき1本入る。
 * 単独の輪郭（点の配列）で来た場合も、1本だけの配列として受け取る。
 */
export function parseContours(input: unknown): Polygon[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new InvalidContourError('輪郭の形式が正しくありません')
  }

  // [[x, y], ...] なのか [[[x, y], ...], ...] なのかを、最初の要素の中身で見分ける
  const first = input[0]
  const isSingleContour = Array.isArray(first) && typeof first[0] === 'number'
  const rawContours: unknown[] = isSingleContour ? [input] : input

  if (rawContours.length > MAX_SHAPES) {
    throw new InvalidContourError('形が多すぎます')
  }

  const contours: Polygon[] = []
  let totalPoints = 0

  for (const raw of rawContours) {
    if (!Array.isArray(raw)) {
      throw new InvalidContourError('輪郭の形式が正しくありません')
    }
    if (raw.length < MIN_POINTS) continue // 点が少なすぎる形は捨てる

    totalPoints += raw.length
    if (totalPoints > MAX_POINTS) {
      throw new InvalidContourError('輪郭の点が多すぎます')
    }

    const contour: Polygon = []
    for (const point of raw) {
      if (!Array.isArray(point) || point.length !== 2) {
        throw new InvalidContourError('輪郭の形式が正しくありません')
      }
      const x = Number(point[0])
      const y = Number(point[1])
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new InvalidContourError('輪郭に数値でない座標が含まれています')
      }
      if (Math.abs(x) > MAX_COORD || Math.abs(y) > MAX_COORD) {
        throw new InvalidContourError('輪郭の座標が範囲外です')
      }
      contour.push([x, y] as Point)
    }
    contours.push(contour)
  }

  if (contours.length === 0) {
    throw new InvalidContourError('輪郭の点が少なすぎます')
  }
  return contours
}

export interface GeneratedStl {
  buffer: Buffer
  triangleCount: number
  size: { width: number; depth: number; height: number }
  volumeCm3: number
}

/**
 * 輪郭と寸法から STL を作る。
 *
 * ⚠ 立体が閉じていなければ必ず失敗させる。閉じていない STL はスライサーが
 *   勝手に穴を塞ごうとして、注文とは違う形が印刷される。
 */
export function generateStl(contours: Polygon[], rawParams: unknown): GeneratedStl {
  const params: CutterParams = sanitizeParams(rawParams)
  const centerlines = normalizeContoursToSize(contours, params.max_size_mm)

  let built
  try {
    built = buildCutterMesh(centerlines, params)
  } catch (err) {
    // ⚠ 組み立てを断った理由（形が離れている等）はそのまま利用者に見せる。
    //   ここで握りつぶすと「保存に失敗しました」としか出ず、直しようがない
    if (err instanceof CutterGeometryError) throw new InvalidContourError(err.message)
    throw err
  }

  if (built.openEdgeCount > 0) {
    throw new InvalidContourError(
      'この形は型として成立しません（立体が閉じていません）。輪郭をなめらかにするか、クッキーの大きさを大きくしてください。'
    )
  }

  return {
    buffer: Buffer.from(meshToStl(built.mesh)),
    triangleCount: built.mesh.triangleCount,
    size: built.size,
    volumeCm3: built.volumeCm3,
  }
}

/** 推測できないダウンロード用の合言葉。ログインを作らないので、これが本人確認を兼ねる */
export function createDownloadToken(): string {
  return randomBytes(32).toString('base64url')
}

export function downloadExpiryDate(): string {
  const expires = new Date()
  expires.setDate(expires.getDate() + DOWNLOAD_VALID_DAYS)
  return expires.toISOString()
}

/**
 * 注文に対する STL を作って非公開バケットに置き、注文行にパスとダウンロード用の
 * 合言葉を書き込む。Webhook から呼ぶ。
 */
export async function fulfillCutterOrder(orderId: string): Promise<{ token: string; fileName: string }> {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available')

  const { data: order, error } = await supabaseAdmin
    .from('cutter_orders')
    .select('id, design_id, download_token, design:cutter_designs(id, title, contour, params)')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error(`cutter order not found: ${orderId}`)

  const design = Array.isArray(order.design) ? order.design[0] : order.design
  if (!design) throw new Error(`cutter design not found for order: ${orderId}`)

  const contours = parseContours(design.contour)
  const stl = generateStl(contours, design.params)

  const safeTitle = String(design.title || 'cookie-cutter')
    .replace(/[^\w\-一-龠ぁ-んァ-ヶー]/g, '_')
    .slice(0, 40)
  const fileName = `${safeTitle || 'cookie-cutter'}.stl`
  const path = `stl/${orderId}.stl`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(CUTTER_BUCKET)
    .upload(path, stl.buffer, { contentType: 'model/stl', upsert: true })

  if (uploadError) throw new Error(`STL upload failed: ${uploadError.message}`)

  // 再送で二重に作られても、最初に配った合言葉を変えない（届いたリンクが死ぬため）
  const token = order.download_token || createDownloadToken()

  const { error: updateError } = await supabaseAdmin
    .from('cutter_orders')
    .update({
      stl_path: path,
      download_token: token,
      download_expires_at: downloadExpiryDate(),
    })
    .eq('id', orderId)

  if (updateError) throw new Error(`cutter order update failed: ${updateError.message}`)

  return { token, fileName }
}
