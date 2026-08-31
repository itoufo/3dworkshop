'use client'

// アンケートのブラウザ側の状態。
// ログイン基盤が無いので、端末に置いた匿名 UUID が唯一の identity になる。

const DEVICE_KEY = '3dlab_device_id'
const ANSWERED_KEY = '3dlab_survey_answers'

/** 記憶しておく回答の数。⚠ 上限を持たせる。毎日1問なので、無いと際限なく伸びる */
const MAX_REMEMBERED = 60

/** crypto.randomUUID があればそれを使い、無ければ同じ形の文字列を自前で作る */
function randomUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // 呼べない環境。下のフォールバックへ
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * この端末の匿名 ID。無ければ作って保存する。
 *
 * ⚠ localStorage が使えない場合（プライベートウィンドウの一部・サイトデータ拒否）に
 *   落ちないこと。その場合は毎回違う ID になり「投票済み」を覚えられないが、
 *   投票そのものはできるほうがよい。
 */
export function getDeviceId(): string {
  // ⚠ crypto.randomUUID は安全なコンテキストでないと存在しない（古い Safari も同様）。
  //   try の外で呼ぶと、localStorage を守るための catch に届く前に落ちて、
  //   呼び出し側では「通信エラー」に化けて投票そのものができなくなる
  const fresh = randomUuid()
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    localStorage.setItem(DEVICE_KEY, fresh)
  } catch {
    // 保存できない環境。今回かぎりの ID で進める
  }
  return fresh
}

type AnsweredMap = Record<string, 'a' | 'b'>

function readAnswered(): AnsweredMap {
  try {
    const raw = localStorage.getItem(ANSWERED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as AnsweredMap) : {}
  } catch {
    return {}
  }
}

/** この端末がその設問に投票済みなら、選んだ側を返す */
export function getAnsweredChoice(surveyId: string): 'a' | 'b' | null {
  return readAnswered()[surveyId] || null
}

export function rememberAnswer(surveyId: string, choice: 'a' | 'b'): void {
  try {
    const map = readAnswered()
    map[surveyId] = choice
    const keys = Object.keys(map)
    // ⚠ 挿入順で古いものから捨てる。JSON.parse は元の順序を保つ
    if (keys.length > MAX_REMEMBERED) {
      for (const key of keys.slice(0, keys.length - MAX_REMEMBERED)) delete map[key]
    }
    localStorage.setItem(ANSWERED_KEY, JSON.stringify(map))
  } catch {
    // 保存できなくても表示は続けられる
  }
}
