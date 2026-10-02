/**
 * 条件に合う行を全部読む。
 *
 * PostgREST は1回の取得を1000行で黙って打ち切る（エラーにならない）。
 * 予約や顧客の一覧は売上・人数の集計に使うので、打ち切られると合計が合わなくなる。
 * 1000行ずつ繰って集める。
 *
 * ⚠ page に渡すクエリは並び順を一意にしておくこと（同じ値の行があると、ページの境目で
 *   行が重複したり抜けたりする）。created_at の後に id を足すなどする。
 * ⚠ 増えていく表は「古い順」で読むこと。新しい順だと、読んでいる最中に1行増えたとき
 *   全行が1つ後ろへずれて、ページの境目の行が2回入る。新しい順で欲しければ、集めた後に並べ替える。
 */

const PAGE_SIZE = 1000
/** 繰る回数の上限（＝10万行）。条件の間違いで延々と読み続けないための歯止め */
const MAX_PAGES = 100

type PageResult<T> = { data: T[] | null; error: { code?: string; message: string } | null }

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: { code?: string; message: string } | null }> {
  const rows: T[] = []
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE_SIZE
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) return { data: rows, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return { data: rows, error: null }
}
