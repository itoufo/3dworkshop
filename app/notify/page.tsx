import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowDown, CalendarPlus, MessageCircleQuestion, Settings } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import NotifyGuideAction from '@/components/NotifyGuideAction'

export const metadata: Metadata = {
  title: 'iPhoneで3DLabの通知を受け取る方法',
  description:
    'iPhone・iPadで3DLabの通知（新しい開催日程・毎日のアンケート）を受け取る手順を、実際の画面つきで説明します。無料で、いつでもオフにできます。',
  alternates: { canonical: '/notify' },
}

/**
 * iPhone でホーム画面に追加 → 通知を許可するまでの手順ページ。
 *
 * ⚠ 画像は iOS 26 の Safari を Simulator で撮ったもの（public/images/notify-guide/）。
 *   iOS 26 から共有ボタンが「…」の中に移ったので、「画面下部の共有ボタン」と書くと
 *   今の iPhone では見つからない。Safari の画面が変わったら撮り直すこと。
 */

interface SubStep {
  text: React.ReactNode
  image: string
  alt: string
  width: number
  height: number
}

const INSTALL_STEPS: SubStep[] = [
  {
    text: (
      <>
        Safari の右下にある <b>「…」</b> をタップします。
      </>
    ),
    image: '/images/notify-guide/step1-more.webp',
    alt: 'Safari の画面下、アドレス欄の右にある「…」ボタン',
    width: 720,
    height: 164,
  },
  {
    text: (
      <>
        いちばん上の <b>「共有」</b> をタップします。
      </>
    ),
    image: '/images/notify-guide/step2-share.webp',
    alt: '「…」のメニューの先頭にある「共有」',
    width: 720,
    height: 507,
  },
  {
    text: (
      <>
        右下の <b>「表示を増やす」</b> をタップします。
      </>
    ),
    image: '/images/notify-guide/step3-show-more.webp',
    alt: '共有メニューの下の段、右端にある「表示を増やす」',
    width: 720,
    height: 704,
  },
  {
    text: (
      <>
        <b>「ホーム画面に追加」</b> をタップします。
      </>
    ),
    image: '/images/notify-guide/step4-add-to-home.webp',
    alt: '広がったメニューの中の「ホーム画面に追加」',
    width: 720,
    height: 409,
  },
  {
    text: (
      <>
        「Webアプリとして開く」がオンのまま、右上の <b>「追加」</b> をタップします。
      </>
    ),
    image: '/images/notify-guide/step5-add.webp',
    alt: '「ホーム画面に追加」の画面。右上に「追加」ボタン、下に「Webアプリとして開く」のスイッチ',
    width: 720,
    height: 573,
  },
]

function StepCard({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="flex items-center gap-3 text-xl font-bold text-gray-900 sm:text-2xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-lg text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Screenshot({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes="(max-width: 480px) 90vw, 360px"
      className="mx-auto w-full max-w-[360px] rounded-2xl border border-gray-200"
    />
  )
}

function Arrow() {
  return (
    <div className="flex justify-center py-3 text-purple-400" aria-hidden="true">
      <ArrowDown className="h-7 w-7" />
    </div>
  )
}

export default function NotifyGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <main className="mx-auto max-w-2xl px-4 pb-14 pt-24">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-1.5 text-base font-bold text-pink-700">
            無料・3ステップ
          </p>
          <h1 className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl">
            iPhoneで通知を受け取る方法
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-700">
            iPhone・iPad では、3DLab を<b>ホーム画面に追加</b>すると通知が届くようになります。
            アプリのインストールや会員登録はいりません。
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <CalendarPlus className="mt-0.5 h-6 w-6 shrink-0 text-purple-600" aria-hidden="true" />
            <p className="text-base text-gray-800">
              <b>新しい開催日程</b>
              <br />
              体験ワークショップの日程が決まったら
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <MessageCircleQuestion className="mt-0.5 h-6 w-6 shrink-0 text-pink-600" aria-hidden="true" />
            <p className="text-base text-gray-800">
              <b>毎日の2択アンケート</b>
              <br />
              アンケートのページでオンにすると、毎日お昼に1問
            </p>
          </div>
        </div>

        {/* ホーム画面から開いている人には、手順ではなくボタンを出す */}
        <NotifyGuideAction />

        <div className="mt-10">
          <StepCard number={1} title="ホーム画面に追加する">
            <p className="text-base text-gray-600">このページを Safari で開いたまま進めてください。</p>
            <ol className="mt-5">
              {INSTALL_STEPS.map((step, i) => (
                <li key={step.image}>
                  {i > 0 && <Arrow />}
                  <p className="mb-3 text-center text-lg text-gray-900">{step.text}</p>
                  <Screenshot src={step.image} alt={step.alt} width={step.width} height={step.height} />
                </li>
              ))}
            </ol>
          </StepCard>

          <Arrow />

          <StepCard number={2} title="ホーム画面の「3DLab」を開く">
            <p className="mb-3 text-center text-lg text-gray-900">
              ホーム画面に増えた <b>3DLab</b> のアイコンから開きます。
            </p>
            <Screenshot
              src="/images/notify-guide/step6-open.webp"
              alt="ホーム画面に追加された 3DLab のアイコン"
              width={720}
              height={409}
            />
            <p className="mt-3 text-base text-gray-600">
              ⚠ Safari から開いたままだと、通知の設定ができません。
            </p>
          </StepCard>

          <Arrow />

          <StepCard number={3} title="通知を許可する">
            <p className="mb-3 text-center text-lg text-gray-900">
              表示される案内の <b>「通知を受け取る」</b> をタップします。
            </p>
            <Screenshot
              src="/images/notify-guide/step7-prompt.webp"
              alt="「新しい開催日程をお知らせしましょうか？」の案内と「通知を受け取る」ボタン"
              width={720}
              height={343}
            />
            <Arrow />
            <p className="mb-3 text-center text-lg text-gray-900">
              確認が出たら <b>「許可」</b> をタップして完了です。
            </p>
            {/* iOS の許可ダイアログは Simulator で撮れないので形を合わせて描いている */}
            <div
              className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl bg-gray-100 text-center shadow-md"
              role="img"
              aria-label="「“3DLab”は通知を送信します。よろしいですか？」の確認と、「許可しない」「許可」のボタン"
            >
              <div className="px-5 pb-4 pt-5">
                <p className="text-base font-bold text-gray-900">“3DLab”は通知を送信します。よろしいですか？</p>
              </div>
              <div className="grid grid-cols-2 border-t border-gray-300 text-lg text-blue-600">
                <span className="border-r border-gray-300 py-3">許可しない</span>
                <span className="relative py-3 font-semibold">
                  許可
                  <span className="absolute inset-1 rounded-full border-[3px] border-red-600" />
                </span>
              </div>
            </div>
          </StepCard>
        </div>

        <section className="mt-10 rounded-3xl border border-gray-200 bg-white p-5 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Settings className="h-6 w-6 text-gray-500" aria-hidden="true" />
            うまくいかないとき
          </h2>
          <dl className="mt-4 space-y-4 text-base leading-relaxed text-gray-700">
            <div>
              <dt className="font-bold text-gray-900">「ホーム画面に追加」が見つからない</dt>
              <dd>
                Chrome や LINE の中で開いていると出ません。このページを <b>Safari</b> で開き直してください。
              </dd>
            </div>
            <div>
              <dt className="font-bold text-gray-900">「通知を受け取る」の案内が出てこない</dt>
              <dd>ページのいちばん下（フッター）にある「通知をオンにする」からも設定できます。</dd>
            </div>
            <div>
              <dt className="font-bold text-gray-900">通知を止めたい</dt>
              <dd>
                iPhone の「設定」→「通知」→「3DLab」で、いつでもオフにできます。ホーム画面のアイコンを削除しても止まります。
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <Footer />
    </div>
  )
}
