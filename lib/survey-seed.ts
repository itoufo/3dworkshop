// 受付を始める設問に、最初から入れておく回答（ダミー）。
//
// 0票から始めると「まだ誰も答えていない」が見えてしまい、最初の数人が押しにくい。
// そこで受付開始の時点で作り物の回答を入れておく。
//
// ⚠ ここで入れた票は survey_answers には行を作らない（カウンタだけを動かす）。
//   つまり「実際に押された数 = survey_answers の行数」「表示される数 = カウンタ」で、
//   実数はいつでも survey_answers から取り出せる。schema 側にあった
//   「カウンタと survey_answers の行数は常に一致する」という前提はこの機能で崩れる。

/** 初期の合計票数。この範囲から毎回ランダムに選ぶ */
export const SEED_TOTAL_MIN = 10
export const SEED_TOTAL_MAX = 20

/**
 * A 側の取り分の下限・上限。
 *
 * ⚠ 0〜100% の全域で振らないこと。18対0 のような配分は作り物だと分かるうえ、
 *   先に極端な多数派を見せると、あとから来た本物の回答がそちらに引っ張られる（同調バイアス）。
 */
const SEED_MIN_SHARE_A = 0.3
const SEED_MAX_SHARE_A = 0.7

/** min 以上 max 以下の整数 */
function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/**
 * 受付開始時に入れる初期票。合計も A/B の配分も毎回変わる。
 *
 * 使うのは status を 'live' にする瞬間だけ。⚠ すでに live の設問に足さないこと。
 * 同じ設問の票数が途中で跳ね、その場で結果を見た人の画面と食い違う。
 */
export function dummyInitialVotes(): { count_a: number; count_b: number } {
  const total = randomInt(SEED_TOTAL_MIN, SEED_TOTAL_MAX)
  const shareA = SEED_MIN_SHARE_A + Math.random() * (SEED_MAX_SHARE_A - SEED_MIN_SHARE_A)
  const countA = Math.round(total * shareA)
  return { count_a: countA, count_b: total - countA }
}
