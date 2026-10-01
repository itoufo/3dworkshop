import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isOwnDataPath, isOwnMediaUrl, STORE_FILES_BUCKET, STORE_MEDIA_BUCKET, storeMediaPublicBase } from './storage'
import {
  PRICE_MAX,
  PRICE_MIN,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_IMAGES_MAX,
  PRODUCT_PRINT_SPEC_MAX,
  PRODUCT_TITLE_MAX,
} from './product-rules'

export type ProductValues = {
  title: string
  description: string | null
  image_urls: string[]
  data_file_path: string | null
  data_file_name: string | null
  sell_data: boolean
  data_price: number | null
  sell_print: boolean
  print_price: number | null
  print_spec: string | null
}

function priceOf(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n) || n < PRICE_MIN || n > PRICE_MAX) return null
  return n
}

/**
 * 出品者が送ってきた商品の入力を確かめて、保存する値にする。
 * ⚠ 画像・データは本人の置き場所（sellers/<ID>/）のものしか受け付けない。
 *   他人のファイルのパスを書いて、その人のデータを自分の作品として売るのを防ぐ。
 */
export function parseProductInput(sellerId: string, body: Record<string, unknown>): { values: ProductValues } | { error: string } {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title || title.length > PRODUCT_TITLE_MAX) return { error: `作品名は1〜${PRODUCT_TITLE_MAX}文字で入れてください` }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length > PRODUCT_DESCRIPTION_MAX) return { error: `説明は${PRODUCT_DESCRIPTION_MAX}文字までです` }

  const printSpec = typeof body.print_spec === 'string' ? body.print_spec.trim() : ''
  if (printSpec.length > PRODUCT_PRINT_SPEC_MAX) return { error: `印刷の仕様は${PRODUCT_PRINT_SPEC_MAX}文字までです` }

  const images = Array.isArray(body.image_urls) ? body.image_urls : []
  if (images.length > PRODUCT_IMAGES_MAX) return { error: `画像は${PRODUCT_IMAGES_MAX}枚までです` }
  if (!images.every((u) => isOwnMediaUrl(sellerId, u))) return { error: '画像が不正です。アップロードし直してください' }

  const dataPath = body.data_file_path ?? null
  if (dataPath !== null && !isOwnDataPath(sellerId, dataPath)) return { error: 'データが不正です。アップロードし直してください' }
  const dataName =
    typeof body.data_file_name === 'string' ? body.data_file_name.trim().slice(0, 200) || null : null

  const sellData = body.sell_data === true
  const sellPrint = body.sell_print === true
  if (!sellData && !sellPrint) return { error: '「データ販売」か「印刷して販売」の少なくとも一方を選んでください' }

  const dataPrice = sellData ? priceOf(body.data_price) : null
  if (sellData && dataPrice === null) {
    return { error: `データの価格は ${PRICE_MIN}〜${PRICE_MAX.toLocaleString()} 円の整数で入れてください` }
  }
  const printPrice = sellPrint ? priceOf(body.print_price) : null
  if (sellPrint && printPrice === null) {
    return { error: `完成品の価格は ${PRICE_MIN}〜${PRICE_MAX.toLocaleString()} 円の整数で入れてください` }
  }

  return {
    values: {
      title,
      description: description || null,
      image_urls: images as string[],
      data_file_path: dataPath as string | null,
      data_file_name: dataPath ? dataName : null,
      sell_data: sellData,
      data_price: dataPrice,
      sell_print: sellPrint,
      print_price: printPrice,
      print_spec: printSpec || null,
    },
  }
}

async function objectExists(bucket: string, path: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const slash = path.lastIndexOf('/')
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 })
  return !error && !!data?.some((o) => o.name === path.slice(slash + 1))
}

/**
 * 審査に出せる状態か。データと画像が実際に置かれていることまで確かめる
 * （署名付き URL を出しただけでアップロードを途中でやめた場合に、中身の無い作品が審査に来ないように）。
 */
export async function submitProblem(values: ProductValues): Promise<string | null> {
  if (!values.data_file_path) return '3D データをアップロードしてください'
  if (values.image_urls.length === 0) return '作品の画像を1枚以上アップロードしてください'
  if (!(await objectExists(STORE_FILES_BUCKET, values.data_file_path))) {
    return '3D データが見つかりません。アップロードし直してください'
  }
  const base = storeMediaPublicBase()
  for (const url of values.image_urls) {
    if (!(await objectExists(STORE_MEDIA_BUCKET, url.slice(base.length)))) {
      return '見つからない画像があります。アップロードし直してください'
    }
  }
  return null
}
