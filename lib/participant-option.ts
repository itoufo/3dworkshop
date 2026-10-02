/**
 * 参加者ごとの選択肢（純粋関数のみ。サーバー・ブラウザ両方から使う）
 *
 * 例: ポーリングアートで「塗るフィギュア」を 持参 / 7cm / 10cm から選ぶ。
 *
 * ルール:
 * - ワークショップが持てるのは1組だけ（workshops.participant_option）
 * - 予約では参加者1人につき1つ選ぶ。選んだものの代金が参加費に加わる
 * - 金額を決めるのはサーバー（/api/create-checkout-session）。ブラウザが送るのは選んだ id だけ
 * - 予約行には、その時点の名前と金額を控えとして残す（bookings.participant_choices）。
 *   あとでワークショップ側の選択肢や価格を変えても、過去の予約の内容は変わらない
 */

export interface ParticipantOptionChoice {
  id: string
  label: string
  /** 参加費に加える金額（円）。0 なら追加料金なし */
  price: number
}

export interface ParticipantOption {
  /** 何を選ぶのか（例: 「フィギュア」） */
  label: string
  choices: ParticipantOptionChoice[]
}

/** 1つの選択肢に付けられる金額の上限（円）。桁の打ち間違いで Stripe の上限を超え、予約が通らなくなるのを防ぐ */
export const MAX_CHOICE_PRICE = 1_000_000

/**
 * 選択肢の金額として受け付ける値か。0（追加料金なし）か、50円以上・上限以下の整数。
 * ⚠ 1〜49円は受け付けない。割引で残額がその範囲に入ると Stripe の最低額（¥50）に切り上がり、
 *   フォームの合計と請求額がずれる
 */
export function isValidChoicePrice(price: unknown): price is number {
  return (
    typeof price === 'number' && Number.isInteger(price) &&
    (price === 0 || (price >= 50 && price <= MAX_CHOICE_PRICE))
  )
}

function isChoice(raw: unknown): raw is ParticipantOptionChoice {
  if (!raw || typeof raw !== 'object') return false
  const c = raw as Record<string, unknown>
  return (
    typeof c.id === 'string' && c.id !== '' &&
    typeof c.label === 'string' && c.label.trim() !== '' &&
    isValidChoicePrice(c.price)
  )
}

/**
 * DB の値（jsonb）を選択肢として読む。未設定・形が壊れている・選べるものが無いときは null。
 * ⚠ 形が壊れていたら「選択肢なし」に倒す。壊れた金額で請求するより、追加料金なしで予約を受けるほうが害が小さい
 */
export function parseParticipantOption(raw: unknown): ParticipantOption | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.label !== 'string' || o.label.trim() === '' || !Array.isArray(o.choices)) return null
  if (o.choices.length === 0 || !o.choices.every(isChoice)) return null
  const ids = new Set(o.choices.map((c) => c.id))
  if (ids.size !== o.choices.length) return null
  return { label: o.label, choices: o.choices }
}

/** 予約行の控え（bookings.participant_choices）を読む。無ければ空配列 */
export function parseParticipantChoices(raw: unknown): ParticipantOptionChoice[] {
  return Array.isArray(raw) && raw.every(isChoice) ? raw : []
}

/**
 * ブラウザが送ってきた id の並びを、参加者1人ずつの選択に直す。
 * 人数と数が合わない・知らない id が混じっているときは null（予約を進めない）。
 */
export function resolveParticipantChoices(
  option: ParticipantOption,
  ids: unknown,
  participants: number
): ParticipantOptionChoice[] | null {
  if (!Array.isArray(ids) || ids.length !== participants) return null
  const byId = new Map(option.choices.map((c) => [c.id, c]))
  const resolved: ParticipantOptionChoice[] = []
  for (const id of ids) {
    const choice = typeof id === 'string' ? byId.get(id) : undefined
    if (!choice) return null
    resolved.push({ id: choice.id, label: choice.label, price: choice.price })
  }
  return resolved
}

/** 選んだものの代金の合計（円） */
export function participantChoicesTotal(choices: ParticipantOptionChoice[]): number {
  return choices.reduce((sum, c) => sum + c.price, 0)
}

/**
 * 同じものをまとめて数える（選択肢の並び順のまま）。
 * 例: [7cm, 持参, 7cm] → [{7cm ×2}, {持参 ×1}]
 */
export function groupParticipantChoices(
  choices: ParticipantOptionChoice[]
): { choice: ParticipantOptionChoice; count: number }[] {
  const groups = new Map<string, { choice: ParticipantOptionChoice; count: number }>()
  for (const c of choices) {
    // 控えの金額が違えば別物として数える（途中で価格を変えた場合に備える）
    const key = `${c.id}:${c.price}`
    const g = groups.get(key)
    if (g) g.count += 1
    else groups.set(key, { choice: c, count: 1 })
  }
  return [...groups.values()]
}

/** メール・管理画面に出す1行。例: 「ぬりっこアニマル 高さ約7cm ×2、持参する ×1」。選択が無ければ空文字 */
export function summarizeParticipantChoices(choices: ParticipantOptionChoice[]): string {
  return groupParticipantChoices(choices)
    .map(({ choice, count }) => `${choice.label} ×${count}`)
    .join('、')
}
