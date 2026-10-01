import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPublicProducts } from './catalog'
import { resolveOffer } from './variants'
import { STORE_CART_MAX_LINES, STORE_CART_MAX_QUANTITY } from './cart-limits'

/**
 * カートの明細を、作品の今の値で確かめて価格を決める。カートの表示（preview）と決済の両方がここを通る。
 * ⚠ ブラウザから来るのは「作品・買い方・組み合わせ・数量」だけ。価格・名前・出品者はここで作品から取る。
 */

export interface ResolvedLine {
  key: string
  productId: string
  kind: 'data' | 'print'
  variantId: string | null
  variantLabel: string | null
  quantity: number
  unitPrice: number
  title: string
  imageUrl: string | null
  sellerId: string
  sellerName: string
  /** 買えない理由。null なら買える */
  problem: string | null
}

export type CartInput = { productId?: unknown; kind?: unknown; variantId?: unknown; quantity?: unknown }

export async function resolveCart(
  items: unknown,
): Promise<{ lines: ResolvedLine[] } | { error: string }> {
  if (!Array.isArray(items) || items.length === 0) return { error: 'カートが空です' }
  if (items.length > STORE_CART_MAX_LINES) return { error: `一度に購入できるのは ${STORE_CART_MAX_LINES} 種類までです` }

  // 同じ明細が2行に分かれて届いても1行にまとめる
  const wanted = new Map<string, { productId: string; kind: 'data' | 'print'; variantId: string | null; quantity: number }>()
  for (const raw of items as CartInput[]) {
    const productId = typeof raw?.productId === 'string' ? raw.productId : ''
    const kind = raw?.kind === 'data' || raw?.kind === 'print' ? raw.kind : null
    const variantId = typeof raw?.variantId === 'string' ? raw.variantId.slice(0, 32) : null
    if (!/^[0-9a-f-]{36}$/i.test(productId) || !kind) return { error: 'カートの内容が正しくありません' }
    const q = Math.floor(Number(raw?.quantity) || 0)
    if (q < 1) continue
    const key = `${productId}:${kind}:${kind === 'print' ? (variantId ?? '') : ''}`
    const prev = wanted.get(key)?.quantity ?? 0
    const quantity = kind === 'data' ? 1 : Math.min(STORE_CART_MAX_QUANTITY, prev + q)
    wanted.set(key, { productId, kind, variantId: kind === 'print' ? variantId : null, quantity })
  }
  if (wanted.size === 0) return { error: 'カートが空です' }

  const products = await getPublicProducts([...new Set([...wanted.values()].map((w) => w.productId))])
  const lines: ResolvedLine[] = []
  for (const [key, w] of wanted) {
    const product = products.find((p) => p.id === w.productId)
    if (!product) {
      lines.push({
        key, ...w, variantLabel: null, unitPrice: 0, title: '（いまは販売していない作品）', imageUrl: null,
        sellerId: '', sellerName: '', problem: 'いまは販売していません。カートから外してください',
      })
      continue
    }
    const offer = resolveOffer(product, w.kind, w.variantId)
    lines.push({
      key,
      productId: product.id,
      kind: w.kind,
      variantId: 'error' in offer ? w.variantId : offer.variantId,
      variantLabel: 'error' in offer ? null : offer.variantLabel,
      quantity: w.quantity,
      unitPrice: 'error' in offer ? 0 : offer.price,
      title: product.title,
      imageUrl: product.image_urls[0] ?? null,
      sellerId: product.seller.id,
      sellerName: product.seller.display_name,
      problem: 'error' in offer ? `${offer.error}。カートから外して選び直してください` : null,
    })
  }
  return { lines }
}

/**
 * 決済する作品の、いまの出品データ（注文に写す）。
 * ⚠ 公開中に絞って読む。確かめたあとに出品者が差し替えると、審査前のファイルが注文に写るため
 */
export async function publishedDataFiles(productIds: string[]): Promise<Map<string, { path: string; name: string | null }>> {
  const map = new Map<string, { path: string; name: string | null }>()
  if (!supabaseAdmin || productIds.length === 0) return map
  const { data, error } = await supabaseAdmin
    .from('store_products')
    .select('id, data_file_path, data_file_name')
    .in('id', productIds)
    .eq('status', 'published')
  if (error) throw new Error(`[store] data files: ${error.message}`)
  for (const row of data ?? []) {
    if (row.data_file_path) map.set(row.id, { path: row.data_file_path, name: row.data_file_name })
  }
  return map
}
