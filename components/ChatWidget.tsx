'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, Send, X } from 'lucide-react'

/**
 * 問い合わせチャット。
 *
 * ⚠ 答えを作るのはサーバー（/api/chat）。ここには知識もAPIキーも持たない。
 * ⚠ 会話はこのサイトには保存しない（リロードで消える）。ただし答えを作るために
 *   入力内容は外部のAIサービス（OpenAI）へ送られる。「保存しない＝どこにも出ない」ではない。
 *   画面下にその旨を出してある。消したらプライバシーの説明が実態とズレる。
 * ⚠ 個人情報を預かる口にしないため、氏名や住所を入れさせる導線はここに作らない（申し込みはフォームへ）。
 * ⚠ モデルの出力は文字列としてそのまま描く。dangerouslySetInnerHTML を使わない。
 *
 * スマホではカテゴリページに追従CTA（MobileCategoryFloatingCta）が出る。重ならないよう、
 * ボタンもパネルもその上に逃がしてある。
 *
 * 大きさはドラッグで変えられる。
 * ⚠ パネルは右下に固定されている。標準の resize は右下につまみが出て、
 *   引っぱると画面の外へ伸びる。つまみは左上に置き、左・上へ引くと大きくなるようにする。
 */

const GREET =
  'ご質問をどうぞ。料金・所要時間・年齢・持ち物・アクセスなど、分かる範囲でお答えします。'

const SUGGESTIONS = [
  '何歳から参加できますか？',
  '作品はその日に持って帰れますか？',
  '料金はいくらですか？',
  '駐車場はありますか？',
]

const FAILED = 'うまく答えられませんでした。お手数ですが 080-9453-0911 までお問い合わせください。'
const BUSY = '少し間をおいてからお試しください。'
const OFF = 'ただいまチャットを準備中です。080-9453-0911 までお問い合わせください。'

/**
 * ⚠ assistant には signature を持たせ、次のリクエストでそのまま送り返す。
 *   サーバーは署名の合わない assistant の発言を捨てる（偽の「半額でお受けします」を
 *   履歴に混ぜられないようにするため）。エラー時の定型文には署名が無いので、
 *   サーバー側では捨てられる＝モデルには渡らない。それで正しい
 */
type Msg = { role: 'user' | 'assistant'; content: string; signature?: string }

export default function ChatWidget() {
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // ---- 大きさの調整 ----
  const MIN_W = 300
  const MIN_H = 320
  const maxW = () => Math.min(window.innerWidth - 28, 760)
  const maxH = () => Math.min(window.innerHeight - 120, 920)
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

  const applySize = useCallback((w: number, h: number) => {
    const el = panelRef.current
    if (!el) return
    el.style.setProperty('--chat-w', clamp(w, MIN_W, maxW()) + 'px')
    el.style.setProperty('--chat-h', clamp(h, MIN_H, maxH()) + 'px')
  }, [])

  // 前回の大きさを覚えておく。⚠ localStorage が使えない設定でも落とさない
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('3dlab-chat-size') || 'null')
      if (saved?.w && saved?.h) applySize(saved.w, saved.h)
    } catch {
      /* 使えないだけ。既定の大きさで動く */
    }
  }, [applySize])

  const remember = useCallback(() => {
    const el = panelRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    try {
      localStorage.setItem(
        '3dlab-chat-size',
        JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) }),
      )
    } catch {
      /* 覚えられないだけ */
    }
  }, [])

  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  // 画面が小さくなったとき、はみ出したままにしない
  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current
      if (!el || !el.style.getPropertyValue('--chat-w')) return
      const r = el.getBoundingClientRect()
      applySize(r.width, r.height)
    }
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [applySize])

  // 新しい発言が入ったら一番下へ
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [history, busy])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return

    const next: Msg[] = [...history, { role: 'user', content: q }]
    setHistory(next)
    setDraft('')
    setBusy(true)

    let reply = FAILED
    let signature: string | undefined
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.status === 429) reply = BUSY
      else if (r.status === 503) reply = OFF
      else if (r.ok && data.reply) {
        reply = data.reply
        signature = typeof data.signature === 'string' ? data.signature : undefined
      }
    } catch {
      // reply は FAILED のまま
    } finally {
      setHistory((h) => [...h, { role: 'assistant', content: reply, signature }])
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  // ⚠ 管理画面には出さない。編集中の画面に問い合わせ窓口が浮いていると誤操作のもと
  if (pathname?.startsWith('/admin')) return null

  return (
    <>
      {/* 開くボタン。スマホでは追従CTAの上に逃がす */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-panel"
        className={`fixed bottom-[86px] right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5 md:bottom-6 md:right-6 ${
          open ? 'hidden' : ''
        }`}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">チャットで質問</span>
      </button>

      {/* パネル */}
      <div
        id="chat-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="3DLabへのご質問"
        aria-hidden={!open}
        style={
          {
            width: 'var(--chat-w, min(calc(100vw - 2rem), 380px))',
            height: 'var(--chat-h, min(70vh, 560px))',
          } as React.CSSProperties
        }
        /* ⚠ hidden 属性で消さない。UA の [hidden]{display:none} と Tailwind の .flex は
           同じ詳細度で、後から効く作者スタイル（flex）が勝つ＝閉じているのに出たままになる。
           表示の切り替えは hidden / flex のクラスでやる。 */
        className={`fixed bottom-[86px] right-4 z-40 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl md:bottom-6 md:right-6 ${
          open ? 'flex' : 'hidden'
        }`}
      >
        {/* 大きさを変えるつまみ。左上に置く（右下だと画面の外へ伸びる） */}
        <button
          type="button"
          aria-label="大きさを変える（ドラッグ／ダブルクリックで元に戻す）"
          title="ドラッグで大きさを変える（ダブルクリックで元に戻す）"
          onPointerDown={(e) => {
            const el = panelRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            drag.current = { x: e.clientX, y: e.clientY, w: r.width, h: r.height }
            e.currentTarget.setPointerCapture(e.pointerId)
            e.preventDefault()
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            // 左・上へ引くと大きくなる
            applySize(d.w - (e.clientX - d.x), d.h - (e.clientY - d.y))
          }}
          onPointerUp={(e) => {
            if (!drag.current) return
            drag.current = null
            e.currentTarget.releasePointerCapture?.(e.pointerId)
            remember()
          }}
          onPointerCancel={() => {
            drag.current = null
          }}
          onDoubleClick={() => {
            const el = panelRef.current
            el?.style.removeProperty('--chat-w')
            el?.style.removeProperty('--chat-h')
            try {
              localStorage.removeItem('3dlab-chat-size')
            } catch {
              /* 消せないだけ */
            }
          }}
          // キーボードでも変えられるようにする
          onKeyDown={(e) => {
            const step = e.shiftKey ? 60 : 20
            const d: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            }
            const v = d[e.key]
            if (!v) return
            e.preventDefault()
            const r = panelRef.current?.getBoundingClientRect()
            if (!r) return
            applySize(r.width + v[0], r.height + v[1])
            remember()
          }}
          className="absolute left-0 top-0 z-10 h-6 w-6 cursor-nwse-resize touch-none rounded-br-lg text-white/70 before:absolute before:left-1.5 before:top-1.5 before:h-2 before:w-2 before:border-l-2 before:border-t-2 before:border-current hover:text-white"
        />

        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-purple-600 to-pink-600 py-3 pl-7 pr-4 text-white">
          <div>
            <p className="text-sm font-bold">ご質問にお答えします</p>
            <p className="text-[11px] text-white/80">AIが自動で回答します。料金・所要時間・アクセスなど。</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
            className="-mr-1 shrink-0 rounded-lg p-1 hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={logRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800">
            {GREET}
          </p>

          {history.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-800 transition-colors hover:bg-purple-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {history.map((m, i) => (
            <p
              key={i}
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-purple-600 px-3.5 py-2.5 text-sm leading-relaxed text-white'
                  : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800'
              }
            >
              {/* モデルの出力は文字列のまま。HTMLとして解釈させない */}
              {m.content}
            </p>
          ))}

          {busy && (
            <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 text-sm text-gray-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">・</span>
                <span className="animate-bounce [animation-delay:150ms]">・</span>
                <span className="animate-bounce [animation-delay:300ms]">・</span>
              </span>
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
          className="flex items-center gap-2 border-t border-gray-200 p-3"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            type="text"
            autoComplete="off"
            maxLength={600}
            placeholder="質問を入力…"
            aria-label="質問を入力"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="送信"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors disabled:bg-gray-300"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <p className="border-t border-gray-100 px-3 py-2 text-[11px] leading-tight text-gray-500">
          AIの回答です。日程・空席・最終的な金額は予約ページとお電話でご確認ください。
          <br />
          入力内容は回答の生成のため外部のAIサービス（OpenAI）へ送信されます。氏名・住所・電話番号などは入力しないでください（
          <a href="/privacy" className="underline hover:text-gray-700">
            プライバシーポリシー
          </a>
          ）。
        </p>
      </div>
    </>
  )
}
