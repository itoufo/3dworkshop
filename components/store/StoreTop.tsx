import Image from 'next/image'
import Link from 'next/link'
import { M_PLUS_Rounded_1c } from 'next/font/google'
import { Check, Download, Package } from 'lucide-react'
import { STORE_TOP_COPY, type StoreLocale } from '@/lib/store/top-copy'
import { MAIN_SITE_URL } from '@/lib/store/urls'
import styles from './StoreTop.module.css'

// 見出し用の丸ゴシック。押し出した樹脂のような丸い端を、題材（3Dプリント）に合わせて選んだ
const display = M_PLUS_Rounded_1c({
  weight: ['800'],
  subsets: ['latin'],
  variable: '--font-store-display',
  display: 'swap',
  preload: false,
})

export interface StoreTopProduct {
  id: string
  title: string
  image_urls: string[]
  sell_data: boolean
  data_price: number | null
  sell_print: boolean
  print_price: number | null
  /** 完成品の選択肢。print_price は最安値なので、価格が分かれていれば「〜」を付ける */
  print_variants: { price: number }[]
  store_sellers: { display_name: string; slug: string } | null
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

const dataPriceOf = (p: StoreTopProduct) => (p.sell_data && p.data_price != null ? p.data_price : null)
const printPriceOf = (p: StoreTopProduct) => (p.sell_print && p.print_price != null ? p.print_price : null)
const printPriceVaries = (p: StoreTopProduct) =>
  p.print_variants.length > 1 && new Set(p.print_variants.map((v) => v.price)).size > 1

/**
 * 最初の画面の写真の置き方（左に大きく1枚、右に2枚を積む枠）。
 * 1点だけなら枠いっぱい、2点なら右の1枚も縦いっぱいにして、空いたマスを作らない。
 */
function heroTileShape(index: number, count: number): string {
  if (count === 1) return `${styles.tileMain} ${styles.tileOnly}`
  if (index === 0) return styles.tileMain
  return count === 2 ? styles.tileTall : ''
}

const minOf = (values: (number | null)[]) => {
  const numbers = values.filter((v): v is number => v != null)
  return numbers.length > 0 ? Math.min(...numbers) : null
}

/**
 * ストアのトップページ本体（日本語 / と英語 /en で共通）。
 * ⚠ 作品へのリンクは言語に関係なく /p/<id>。英語の作品ページは無い。
 * ⚠ 作品名・出品者名は出品者が日本語で入れたものなので、英語版でも訳さず lang="ja" を付けて出す。
 */
export default function StoreTop({ locale, products }: { locale: StoreLocale; products: StoreTopProduct[] }) {
  const t = STORE_TOP_COPY[locale]
  const userText = locale === 'en' ? { lang: 'ja' } : {}
  const heroProducts = products.filter((p) => p.image_urls[0]).slice(0, 3)
  const minDataPrice = minOf(products.map(dataPriceOf))
  const minPrintPrice = minOf(products.map(printPriceOf))

  const ways = [
    { key: 'data', icon: Download, tone: styles.wayData, copy: t.ways.data, minPrice: minDataPrice },
    { key: 'print', icon: Package, tone: styles.wayPrint, copy: t.ways.print, minPrice: minPrintPrice },
  ]

  return (
    <div className={`${styles.top} ${display.variable}`}>
      <section className={styles.plate}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20 grid gap-10 md:grid-cols-[6fr_5fr] items-center">
          <div>
            <h1 className={`${styles.display} ${styles.layered} text-3xl sm:text-4xl md:text-5xl leading-tight md:leading-[1.25]`}>
              {t.hero.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/85 max-w-xl">{t.hero.lead}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href="#works" className={`${styles.primary} px-7 py-3 rounded-full text-base font-bold`}>
                {t.hero.browse}
              </a>
              <a
                href="#ways"
                className="text-base font-medium text-white underline decoration-white/50 underline-offset-8 hover:decoration-white"
              >
                {t.hero.how}
              </a>
            </div>
            {t.notice && (
              <p className="mt-8 max-w-xl rounded-lg border border-white/25 bg-white/5 px-4 py-3 text-base text-white/85">
                {t.notice}
              </p>
            )}
          </div>

          {heroProducts.length > 0 && (
            <div className={styles.bed}>
              {heroProducts.map((p, index) => (
                <Link
                  key={p.id}
                  href={`/p/${p.id}`}
                  className={`${styles.tile} ${styles.printing} ${heroTileShape(index, heroProducts.length)}`}
                  style={{ '--delay': `${index * 0.25}s` } as React.CSSProperties}
                >
                  {/* 作品名はすぐ下に文字で出るので、画像の alt は空にする（同じ名前を2回読み上げさせない） */}
                  <Image
                    src={p.image_urls[0]}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes={
                      heroProducts.length === 1
                        ? '(min-width: 768px) 500px, 100vw'
                        : index === 0
                          ? '(min-width: 768px) 320px, 60vw'
                          : '(min-width: 768px) 210px, 40vw'
                    }
                    className="object-cover"
                  />
                  {/* 右の2枚は幅が狭いので、スマホでは作品名を1行に切り詰める */}
                  <span
                    className={`${styles.caption} font-bold text-white ${index === 0 ? 'text-base' : 'text-sm sm:text-base line-clamp-1 sm:line-clamp-2'}`}
                    {...userText}
                  >
                    {p.title}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="ways" className="scroll-mt-6" style={{ background: 'var(--paper)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <h2 className={`${styles.display} text-3xl md:text-4xl`}>{t.ways.title}</h2>
          <p className="mt-3 text-base" style={{ color: 'var(--muted)' }}>{t.ways.lead}</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {ways.map(({ key, icon: Icon, tone, copy, minPrice }) => (
              <div key={key} className={`${tone} rounded-2xl p-6 md:p-8 flex flex-col`}>
                {/* スマホでは「〜から」の価格を見出しの下に回す（横に並べると見出しが折れる） */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <h3 className={`${styles.display} text-2xl flex items-center gap-2.5`}>
                      <Icon className="w-6 h-6 shrink-0" style={{ color: 'var(--brand)' }} aria-hidden />
                      {copy.title}
                    </h3>
                    <p className="mt-1.5 text-base" style={{ color: 'var(--muted)' }}>{copy.summary}</p>
                  </div>
                  {minPrice != null && (
                    <p className="shrink-0 text-xl font-bold whitespace-nowrap">{t.ways.from(yen(minPrice))}</p>
                  )}
                </div>
                <ul className="mt-6 space-y-3 text-base leading-relaxed">
                  {copy.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <Check className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--brand)' }} aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="works" className="scroll-mt-6 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <h2 className={`${styles.display} text-3xl md:text-4xl`}>{t.works.title}</h2>
          {products.length === 0 ? (
            <p className="mt-8 text-base" style={{ color: 'var(--muted)' }}>{t.works.empty}</p>
          ) : (
            <ul className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {products.map((p) => {
                const dataPrice = dataPriceOf(p)
                const printPrice = printPriceOf(p)
                return (
                  <li key={p.id}>
                    <Link href={`/p/${p.id}`} className="group block">
                      <div className="relative aspect-square rounded-lg overflow-hidden" style={{ background: 'var(--paper)' }}>
                        {p.image_urls[0] && (
                          <Image
                            src={p.image_urls[0]}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <p
                        className="mt-3 text-base font-bold leading-snug line-clamp-2 underline-offset-4 group-hover:underline"
                        {...userText}
                      >
                        {p.title}
                      </p>
                      {p.store_sellers && (
                        <p className="text-base" style={{ color: 'var(--muted)' }} {...userText}>
                          {p.store_sellers.display_name}
                        </p>
                      )}
                      <dl className="mt-2 text-base">
                        {dataPrice != null && (
                          <div className="flex items-baseline justify-between gap-3">
                            <dt style={{ color: 'var(--muted)' }}>{t.works.data}</dt>
                            <dd className="font-bold">{yen(dataPrice)}</dd>
                          </div>
                        )}
                        {printPrice != null && (
                          <div className="flex items-baseline justify-between gap-3">
                            <dt style={{ color: 'var(--muted)' }}>{t.works.print}</dt>
                            <dd className="font-bold">
                              {printPriceVaries(p) ? t.works.from(yen(printPrice)) : yen(printPrice)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <section style={{ background: 'var(--paper)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <h2 className={`${styles.display} text-3xl md:text-4xl`}>{t.flow.title}</h2>
          <ol className={`${styles.steps} mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4`}>
            {t.flow.steps.map((step) => (
              <li key={step.title} className={styles.step}>
                <h3 className={`${styles.display} text-xl`}>{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20 grid gap-10 md:grid-cols-2 items-center">
          <div className="relative aspect-[3/2] rounded-2xl overflow-hidden">
            <Image
              src="/staff-workshop-scene.jpg"
              alt={t.about.imageAlt}
              fill
              sizes="(min-width: 768px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <h2 className={`${styles.display} text-3xl md:text-4xl`}>{t.about.title}</h2>
            {t.about.body.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-base leading-loose">{paragraph}</p>
            ))}
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`${MAIN_SITE_URL}${locale === 'en' ? '/en/workshops' : '/workshops'}`}
                className="px-6 py-3 rounded-full border text-base font-bold"
                style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
              >
                {t.about.workshops}
              </a>
              <a
                href={`${MAIN_SITE_URL}/school`}
                hrefLang="ja"
                className="px-6 py-3 rounded-full border text-base font-bold"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              >
                {t.about.school}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.plate}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20 grid gap-8 md:grid-cols-[3fr_2fr] items-center">
          <div>
            <h2 className={`${styles.display} text-3xl md:text-4xl`}>{t.sell.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/85 max-w-2xl">{t.sell.body}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/sell" hrefLang="ja" className={`${styles.primary} px-7 py-3 rounded-full text-base font-bold`}>
              {t.sell.about}
            </Link>
            <a
              href={`${MAIN_SITE_URL}/school`}
              hrefLang="ja"
              className="px-7 py-3 rounded-full border border-white/50 text-base font-bold text-white hover:border-white"
            >
              {t.sell.school}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
