import type { StoreLocale } from './locale'

/**
 * ストアの画面に出す文言（作品ページ・カート・購入完了・ダウンロード）。
 * ⚠ 日本語の文言は、言語を分ける前に各部品へ直接書いてあったものと一字一句同じ。
 * ⚠ 作品名・出品者名・選択肢の名前と値は出品者が入れた文字なので、ここには無い（訳さずそのまま出す）。
 * ⚠ 'server-only' を付けない。ブラウザ側の部品からも読む。
 */
export interface StoreUiCopy {
  /** 買い方の名前 */
  kind: { data: string; print: string }
  /** 「作品名（買い方・組み合わせ）」の形の名前。カートに入れたときの表示と Stripe の明細に使う */
  lineName: (title: string, kind: 'data' | 'print', variantLabel: string | null) => string
  /** 価格が組み合わせで分かれるときの最安値の表記（¥5,980〜 / from ¥5,980） */
  priceFrom: (price: string) => string
  buy: {
    legend: string
    printOption: string
    dataNote: (validDays: number, maxCount: number) => string
    printNote: (leadTime: string, printSpec: string | null) => string
    quantity: string
    taxNote: string
    addToCart: string
    buyNow: string
    added: string
    viewCart: string
    inCart: (label: string, quantity: number) => string
    dataAlreadyInCart: string
    cappedAt: (max: number, quantity: number) => string
    cartFull: (maxLines: number) => string
    addFailed: string
    secure: string
    secureAddress: string
  }
  variant: {
    current: (axis: string, value: string | undefined) => { label: string; value: string }
    unavailable: (value: string) => string
  }
  like: { label: string; like: string; unlike: string }
  cart: {
    title: string
    loading: string
    empty: string
    browse: string
    loadFailed: string
    checkoutFailed: string
    networkError: string
    /** 「・組み合わせ」「／出品者」の区切り */
    variantSeparator: string
    sellerSeparator: string
    quantity: string
    dataQuantity: string
    remove: string
    subtotal: (count: number) => string
    taxNote: string
    printLeadTime: (leadTime: string) => string
    name: string
    email: string
    emailNote: (hasData: boolean) => string
    blocked: string
    submitting: string
    submit: string
    secure: string
    secureAddress: string
  }
  download: {
    title: string
    checking: string
    reasons: Record<'invalid' | 'not_paid' | 'expired' | 'used_up', string>
    contact: string
    preparing: string
    button: string
    remaining: (count: number) => string
    failed: string
    networkError: string
  }
  thanks: {
    title: string
    both: (leadTime: string) => string
    print: (leadTime: string) => string
    data: (validDays: number) => string
    notFound: string
    noMail: string
    backToTop: string
  }
  product: {
    store: string
    about: string
    printSpec: string
    dataUse: string
    dataUseBody: string
    notFound: string
    sellerWorks: (sellerName: string) => string
  }
}

const SECURE_JA = 'お支払いは Stripe の安全な決済画面で。カード情報は当社に保存されません。'
const SECURE_ADDRESS_JA = ' お届け先も決済画面でご入力いただきます。'

const ja: StoreUiCopy = {
  kind: { data: '3D データ', print: '完成品' },
  lineName: (title, kind, variantLabel) =>
    `${title}（${kind === 'data' ? '3D データ' : variantLabel ? `完成品・${variantLabel}` : '完成品'}）`,
  priceFrom: (price) => `${price}〜`,
  buy: {
    legend: '買い方を選ぶ',
    printOption: '完成品（3DLab が印刷してお届け）',
    dataNote: (validDays, maxCount) =>
      `お支払い後すぐにダウンロードできます（${validDays}日間・${maxCount}回まで）。ご自分の3Dプリンターで印刷できます。`,
    printNote: (leadTime, printSpec) => `${leadTime}・送料無料（全国一律）${printSpec ? `。${printSpec}` : ''}`,
    quantity: '数量',
    taxNote: '税込・送料無料',
    addToCart: 'カートに入れる',
    buyNow: '今すぐ買う',
    added: 'カートに入れました',
    viewCart: 'カートを見る →',
    inCart: (label, quantity) => `${label}（カートに ${quantity} 個）`,
    dataAlreadyInCart: '3D データはすでにカートに入っています（1つで十分です）',
    cappedAt: (max, quantity) => `1つの組み合わせは ${max} 個までのため、カートには ${quantity} 個まで入れています`,
    cartFull: (maxLines) => `カートに入れられるのは ${maxLines} 種類までです`,
    addFailed: 'カートに入れられませんでした',
    secure: SECURE_JA,
    secureAddress: SECURE_ADDRESS_JA,
  },
  variant: {
    current: (axis, value) => ({ label: `${axis}：`, value: value ?? '未選択' }),
    unavailable: (value) => `${value} はいまの組み合わせにはありません（選ぶと他の項目を合わせます）`,
  },
  like: { label: 'いいね', like: 'いいねする', unlike: 'いいねを取り消す' },
  cart: {
    title: 'カート',
    loading: '読み込み中…',
    empty: 'カートは空です',
    browse: '作品を見る',
    loadFailed: '作品の情報を読み込めませんでした。ページを開き直してください。',
    checkoutFailed: '決済の準備に失敗しました',
    networkError: '通信エラーが発生しました。時間をおいて再度お試しください。',
    variantSeparator: ' ・ ',
    sellerSeparator: ' ／ ',
    quantity: '数量',
    dataQuantity: 'ダウンロード（1つ）',
    remove: '削除',
    subtotal: (count) => `小計（${count} 点）`,
    taxNote: '税込・送料無料',
    printLeadTime: (leadTime) => `完成品は${leadTime}します。`,
    name: 'お名前',
    email: 'メールアドレス',
    emailNote: (hasData) => `ご注文の確認${hasData ? 'とデータのダウンロード用リンク' : ''}をこのアドレスにお送りします。`,
    blocked: '買えない作品がカートに入っています。カートから外してください。',
    submitting: '決済画面へ移動しています...',
    submit: 'レジに進む',
    secure: SECURE_JA,
    secureAddress: SECURE_ADDRESS_JA,
  },
  download: {
    title: 'データのダウンロード',
    checking: '確認しています…',
    reasons: {
      invalid: 'リンクが正しくありません。',
      not_paid: 'このご注文はダウンロードできません。',
      expired: 'ダウンロード期限が過ぎています。',
      used_up: 'ダウンロード回数の上限に達しました。',
    },
    contact: ' お手数ですが 3dlab@sunu25.com までお問い合わせください。',
    preparing: '準備しています…',
    button: 'ダウンロードする',
    remaining: (count) => `あと ${count} 回ダウンロードできます。`,
    failed: 'ダウンロードに失敗しました。時間をおいて再度お試しください。',
    networkError: '通信エラーが発生しました。時間をおいて再度お試しください。',
  },
  thanks: {
    title: 'ご購入ありがとうございます',
    both: (leadTime) =>
      `ご注文を承りました。データのダウンロード用リンクと確認のメールを、ご入力のメールアドレスにまもなくお送りします。完成品は 3DLab が印刷して、${leadTime}します。`,
    print: (leadTime) => `ご注文を承りました。3DLab が印刷して、${leadTime}します。確認のメールをまもなくお送りします。`,
    data: (validDays) => `ご入力のメールアドレスに、データのダウンロード用リンクをまもなくお送りします（${validDays}日間有効）。`,
    notFound: 'このご注文は見つかりませんでした。お支払いが済んでいる場合は、3dlab@sunu25.com までお問い合わせください。',
    noMail: '数分たってもメールが届かない場合は、迷惑メールフォルダをご確認のうえ、3dlab@sunu25.com までお問い合わせください。',
    backToTop: 'ストアのトップへ',
  },
  product: {
    store: 'ストア',
    about: '作品について',
    printSpec: '完成品の仕様',
    dataUse: 'データの使い方',
    dataUseBody: '購入したデータは、ご自身で印刷して楽しむためのものです。データそのものの再配布・再販売はできません。',
    notFound: '作品が見つかりません',
    sellerWorks: (sellerName) => `${sellerName} の作品`,
  },
}

const SECURE_EN = 'Payment is made on Stripe’s secure checkout page. We do not store your card details.'
const SECURE_ADDRESS_EN = ' You enter the delivery address on that page too.'

const en: StoreUiCopy = {
  kind: { data: '3D data', print: 'Finished print' },
  lineName: (title, kind, variantLabel) =>
    `${title} (${kind === 'data' ? '3D data' : variantLabel ? `finished print, ${variantLabel}` : 'finished print'})`,
  priceFrom: (price) => `from ${price}`,
  buy: {
    legend: 'Choose how to buy',
    printOption: 'Finished print (printed and shipped by 3DLab)',
    dataNote: (validDays, maxCount) =>
      `A download link is emailed to you after payment (valid for ${validDays} days, up to ${maxCount} downloads). Print it on your own 3D printer.`,
    printNote: (leadTime, printSpec) => `${leadTime}. Free shipping, Japan only.${printSpec ? ` ${printSpec}` : ''}`,
    quantity: 'Quantity',
    taxNote: 'Tax and shipping included',
    addToCart: 'Add to cart',
    buyNow: 'Buy now',
    added: 'Added to your cart',
    viewCart: 'View cart',
    inCart: (label, quantity) => `${label} (${quantity} in your cart)`,
    dataAlreadyInCart: 'This 3D data is already in your cart (one copy is enough).',
    cappedAt: (max, quantity) => `You can buy up to ${max} of one option, so your cart holds ${quantity}.`,
    cartFull: (maxLines) => `Your cart can hold up to ${maxLines} different items.`,
    addFailed: 'Could not add this to your cart.',
    secure: SECURE_EN,
    secureAddress: SECURE_ADDRESS_EN,
  },
  variant: {
    current: (axis, value) => ({ label: `${axis}: `, value: value ?? 'Not selected' }),
    unavailable: (value) => `${value} is not available with the current choices (choosing it changes the other options to match)`,
  },
  like: { label: 'Like', like: 'Like this work', unlike: 'Remove your like' },
  cart: {
    title: 'Cart',
    loading: 'Loading…',
    empty: 'Your cart is empty',
    browse: 'Browse the works',
    loadFailed: 'We could not load the works. Please reload the page.',
    checkoutFailed: 'We could not start the payment.',
    networkError: 'A network error occurred. Please try again in a little while.',
    variantSeparator: ', ',
    sellerSeparator: ' / ',
    quantity: 'Quantity',
    dataQuantity: 'Download (1 copy)',
    remove: 'Remove',
    subtotal: (count) => `Subtotal (${count} ${count === 1 ? 'item' : 'items'})`,
    taxNote: 'Tax and shipping included',
    printLeadTime: (leadTime) => `Finished prints: ${leadTime.charAt(0).toLowerCase()}${leadTime.slice(1)}.`,
    name: 'Name',
    email: 'Email address',
    emailNote: (hasData) =>
      `We send your order confirmation${hasData ? ' and the download link for the data' : ''} to this address.`,
    blocked: 'Your cart contains a work that cannot be bought. Please remove it.',
    submitting: 'Taking you to the payment page...',
    submit: 'Proceed to checkout',
    secure: SECURE_EN,
    secureAddress: SECURE_ADDRESS_EN,
  },
  download: {
    title: 'Download your data',
    checking: 'Checking…',
    reasons: {
      invalid: 'This link is not valid.',
      not_paid: 'This order cannot be downloaded.',
      expired: 'The download period has ended.',
      used_up: 'The download limit has been reached.',
    },
    contact: ' Please contact us at 3dlab@sunu25.com.',
    preparing: 'Preparing…',
    button: 'Download',
    remaining: (count) => `You can download it ${count} more ${count === 1 ? 'time' : 'times'}.`,
    failed: 'The download failed. Please try again in a little while.',
    networkError: 'A network error occurred. Please try again in a little while.',
  },
  thanks: {
    title: 'Thank you for your purchase',
    both: (leadTime) =>
      `We have received your order. The download link for the data and a confirmation will be emailed shortly to the address you entered. Finished prints are printed by 3DLab: ${leadTime.charAt(0).toLowerCase()}${leadTime.slice(1)}.`,
    print: (leadTime) =>
      `We have received your order. 3DLab prints it: ${leadTime.charAt(0).toLowerCase()}${leadTime.slice(1)}. A confirmation will be emailed shortly.`,
    data: (validDays) =>
      `The download link for the data will be emailed shortly to the address you entered (valid for ${validDays} days).`,
    notFound: 'We could not find this order. If you have already paid, please contact us at 3dlab@sunu25.com.',
    noMail:
      'If the email has not arrived after a few minutes, please check your spam folder, then contact us at 3dlab@sunu25.com.',
    backToTop: 'Back to the store',
  },
  product: {
    store: 'Store',
    about: 'About this work',
    printSpec: 'Finished print details',
    dataUse: 'Using the data',
    dataUseBody: 'The data you buy is for printing and enjoying yourself. You may not redistribute or resell the data itself.',
    notFound: 'Work not found',
    sellerWorks: (sellerName) => `Works by ${sellerName}`,
  },
}

export const STORE_UI: Record<StoreLocale, StoreUiCopy> = { ja, en }

/** 発送の目安の英語の文言（日本語は lib/shipping.ts の SHIPPING_LEAD_TIME_TEXT） */
export function shippingLeadTimeText(locale: StoreLocale, japaneseText: string, days: number): string {
  return locale === 'en' ? `Ships within ${days} days of your order` : japaneseText
}
