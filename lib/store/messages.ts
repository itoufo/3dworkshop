import type { StoreLocale } from './locale'

/**
 * ストアの API が返す文言（カートの確認・決済）。
 * ⚠ 日本語の文言は、言語を分ける前に各所へ直接書いてあったものと一字一句同じ。変えるときは
 *   カートの画面・作品ページに出る文言として読み直すこと。
 */
export interface StoreMessages {
  badRequest: string
  nameRequired: string
  emailInvalid: string
  cartEmpty: string
  cartTooManyLines: (max: number) => string
  cartInvalid: string
  /** いまは販売していない作品の、カートでの表示名 */
  notForSaleTitle: string
  notForSale: string
  variantNotFound: string
  dataNotSold: string
  printNotSold: string
  /** 買い方・組み合わせが今の作品に合わないとき。reason は上の3つのどれか */
  offerProblem: (reason: string) => string
  /** 決済のときに見つかった、ある明細の問題 */
  lineProblem: (title: string, problem: string) => string
  lineUnavailable: (title: string) => string
  orderCreateFailed: string
  checkoutFailed: string
  previewFailed: string
}

const ja: StoreMessages = {
  badRequest: '不正なリクエストです',
  nameRequired: 'お名前を入力してください',
  emailInvalid: 'メールアドレスを正しく入力してください',
  cartEmpty: 'カートが空です',
  cartTooManyLines: (max) => `一度に購入できるのは ${max} 種類までです`,
  cartInvalid: 'カートの内容が正しくありません',
  notForSaleTitle: '（いまは販売していない作品）',
  notForSale: 'いまは販売していません。カートから外してください',
  variantNotFound: '選んだ組み合わせが見つかりません。ページを読み込み直してください',
  dataNotSold: 'この作品はデータでは販売していません',
  printNotSold: 'この作品は完成品では販売していません',
  offerProblem: (reason) => `${reason}。カートから外して選び直してください`,
  lineProblem: (title, problem) => `「${title}」: ${problem}`,
  lineUnavailable: (title) => `「${title}」はいま購入できません。カートから外してください`,
  orderCreateFailed: '注文の作成に失敗しました',
  checkoutFailed: '決済の準備に失敗しました',
  previewFailed: '作品の情報を読み込めませんでした。時間をおいて開き直してください。',
}

const en: StoreMessages = {
  badRequest: 'This request is not allowed.',
  nameRequired: 'Please enter your name.',
  emailInvalid: 'Please enter a valid email address.',
  cartEmpty: 'Your cart is empty.',
  cartTooManyLines: (max) => `You can buy up to ${max} different items at once.`,
  cartInvalid: 'The contents of the cart are not valid.',
  notForSaleTitle: '(A work that is no longer for sale)',
  notForSale: 'This is no longer for sale. Please remove it from your cart.',
  variantNotFound: 'The option you chose was not found. Please reload the page.',
  dataNotSold: 'This work is not sold as 3D data.',
  printNotSold: 'This work is not sold as a finished print.',
  offerProblem: (reason) => `${reason} Please remove it from your cart and choose again.`,
  lineProblem: (title, problem) => `“${title}”: ${problem}`,
  lineUnavailable: (title) => `“${title}” cannot be bought right now. Please remove it from your cart.`,
  orderCreateFailed: 'We could not create your order.',
  checkoutFailed: 'We could not start the payment.',
  previewFailed: 'We could not load the works. Please try again in a little while.',
}

export const STORE_MESSAGES: Record<StoreLocale, StoreMessages> = { ja, en }
