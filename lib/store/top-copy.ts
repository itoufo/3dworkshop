import { SHIPPING_LEAD_TIME_DAYS, SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { STORE_DOWNLOAD_MAX_COUNT, STORE_DOWNLOAD_VALID_DAYS } from './download-limits'
import { SELLER_MIN_ENROLLED_MONTHS } from './urls'

/**
 * ストアのトップページ（/ と /en）の文言。
 * ⚠ 期限・回数・発送の目安・出品に要る在籍期間は、ここに数字を直接書かない。
 *   作品ページ・決済と同じ定数から組み立てる（片方だけ変わって食い違うのを防ぐ）。
 * ⚠ 送料だけは定数から作らない。ストアの完成品は送料無料で固定（StoreBuyForm・StoreCartClient・
 *   app/api/store/cart/checkout が送料を足さない）。lib/shipping.ts の SHIPPING_FEE は本サイトの
 *   物販のもので、ストアの決済には効かない。ストアの送料を変えるときは、それらとここを一緒に直す。
 */
export type StoreLocale = 'ja' | 'en'

export interface StoreTopCopy {
  hero: { title: string; lead: string; browse: string; how: string }
  /** 英語版だけに出す注意書き（作品ページと決済が日本語であること、発送先が日本国内であること） */
  notice: string | null
  ways: {
    title: string
    lead: string
    from: (price: string) => string
    data: { title: string; summary: string; points: string[] }
    print: { title: string; summary: string; points: string[] }
  }
  works: { title: string; empty: string; data: string; print: string; from: (price: string) => string }
  flow: { title: string; steps: { title: string; body: string }[] }
  about: { title: string; body: string[]; workshops: string; school: string; imageAlt: string }
  sell: { title: string; body: string; about: string; school: string }
}

const ja: StoreTopCopy = {
  hero: {
    title: '3Dプリントの作品を、データでも、完成品でも。',
    lead:
      '3DLab Store は、3DLab とスクール生がつくった3D作品のストアです。3Dデータを買って自分のプリンターで印刷する買い方と、3DLab が印刷した完成品を受け取る買い方があります。どちらで買えるかは作品によって異なります。',
    browse: '作品を見る',
    how: '買い方を見る',
  },
  notice: null,
  ways: {
    title: '買い方は2つ',
    lead: '同じ作品でも、買い方によって届くものが変わります。',
    from: (price) => `${price} から`,
    data: {
      title: '3Dデータ',
      summary: '自分の3Dプリンターで印刷する方へ',
      points: [
        'お支払いのあと、ダウンロード用のリンクをメールでお送りします',
        `ダウンロードできるのは${STORE_DOWNLOAD_VALID_DAYS}日間・${STORE_DOWNLOAD_MAX_COUNT}回までです`,
        'ご自分で印刷して楽しむためのデータです。データそのものの再配布・再販売はできません',
      ],
    },
    print: {
      title: '完成品',
      summary: '3DLab が印刷してお届けします',
      points: [`${SHIPPING_LEAD_TIME_TEXT}します`, '送料無料（全国一律）', 'サイズや色を選べる作品もあります'],
    },
  },
  works: {
    title: '作品',
    empty: 'いま出品されている作品はありません。最初の出品を準備しています。',
    data: 'データ',
    print: '完成品',
    from: (price) => `${price}〜`,
  },
  flow: {
    title: '届くまでの流れ',
    steps: [
      { title: '作品と買い方を選ぶ', body: '作品ページで「3Dデータ」か「完成品」を選び、カートに入れます。' },
      {
        title: 'お名前とメールを入れる',
        body: 'カートの画面で、お名前とメールアドレスを入力します。3Dデータのダウンロード用リンクと注文の確認は、このメールアドレスにお送りします。',
      },
      {
        title: 'Stripe で支払う',
        body: 'お支払いは Stripe の決済画面で行います。カード情報は当社に保存されません。完成品のお届け先もこの画面で入力します。',
      },
      {
        title: '受け取る',
        body: '3Dデータは、お支払いのあとメールで届くリンクからダウンロードします。完成品は 3DLab が印刷して発送します。',
      },
    ],
  },
  about: {
    title: 'つくっているのは、湯島の3Dプリンター教室です',
    body: [
      '3DLab は、東京・湯島にある3Dプリンター教室です。体験ワークショップとスクールを開いています。',
      'このストアには、3DLab とスクール生の作品が並びます。出品は 3DLab が審査してから掲載します。',
    ],
    workshops: '体験ワークショップ',
    school: 'スクール',
    imageAlt: '3DLab のワークショップの様子',
  },
  sell: {
    title: 'あなたの作品も出品できます',
    body: `3DLab のスクールに${SELLER_MIN_ENROLLED_MONTHS}ヶ月以上在籍している方は、自分でつくった3Dデータを出品できます。出品は審査のうえ掲載します。`,
    about: '出品について',
    school: 'スクールを見る',
  },
}

const en: StoreTopCopy = {
  hero: {
    title: '3D-printed works, as data or as finished prints.',
    lead:
      '3DLab Store sells 3D works made by 3DLab and by the students of its school in Tokyo. There are two ways to buy: download the 3D data and print it on your own printer, or have 3DLab print it and send you the finished piece. Which of the two is offered depends on the work.',
    browse: 'Browse the works',
    how: 'How buying works',
  },
  notice:
    'Product pages, checkout and the emails we send after purchase are in Japanese. Finished prints ship to addresses in Japan only.',
  ways: {
    title: 'Two ways to buy',
    lead: 'The same work arrives differently depending on how you buy it.',
    from: (price) => `From ${price}`,
    data: {
      title: '3D data',
      summary: 'For people who print on their own 3D printer',
      points: [
        'A download link is emailed to you after payment',
        `Downloads stay available for ${STORE_DOWNLOAD_VALID_DAYS} days, up to ${STORE_DOWNLOAD_MAX_COUNT} times`,
        'The data is for printing and enjoying yourself. You may not redistribute or resell the data itself',
      ],
    },
    print: {
      title: 'Finished print',
      summary: '3DLab prints it and ships it to you',
      points: [
        `Ships within ${SHIPPING_LEAD_TIME_DAYS} days of your order`,
        'Free shipping (Japan only)',
        'Some works come in a choice of sizes or colours',
      ],
    },
  },
  works: {
    title: 'Works',
    empty: 'No works are listed right now. The first listings are being prepared.',
    data: 'Data',
    print: 'Print',
    from: (price) => `from ${price}`,
  },
  flow: {
    title: 'From order to delivery',
    steps: [
      { title: 'Choose a work and how to buy it', body: 'On the product page, pick “3D data” or “finished print” and add it to your cart.' },
      {
        title: 'Enter your name and email',
        body: 'You enter your name and email address on the cart page. The download link for 3D data and the order confirmation are sent to this address.',
      },
      {
        title: 'Pay with Stripe',
        body: 'Payment is made on Stripe’s checkout page. We do not store your card details. For a finished print, you enter the delivery address there too.',
      },
      {
        title: 'Receive it',
        body: 'For 3D data, you download it from the link in the email sent after payment. Finished prints are printed and shipped by 3DLab.',
      },
    ],
  },
  about: {
    title: 'Made at a 3D printing school in Yushima, Tokyo',
    body: [
      '3DLab is a 3D printing school in Yushima, Tokyo. It runs hands-on workshops and a school.',
      'This store lists works by 3DLab and its students. 3DLab reviews every listing before it goes up.',
    ],
    workshops: 'Workshops with English support',
    school: 'School (Japanese)',
    imageAlt: 'A workshop at 3DLab',
  },
  sell: {
    title: 'Students can list their own works',
    body: `Anyone who has been enrolled in the 3DLab school for ${SELLER_MIN_ENROLLED_MONTHS} months or more can list 3D data they made. Listings are reviewed before they are published.`,
    about: 'About selling (Japanese)',
    school: 'See the school (Japanese)',
  },
}

export const STORE_TOP_COPY: Record<StoreLocale, StoreTopCopy> = { ja, en }
