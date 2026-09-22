'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { LifeBuoy, MessageSquare, RefreshCw } from 'lucide-react'

/**
 * チャットの履歴。見るための画面で、ここから返信や編集はしない。
 *
 * 2種類ある。混ぜない:
 *   - 会話ログ … AIとのやりとり。誰が書いたかは分からない（連絡先を預かっていない）
 *   - 問い合わせ … 「担当者にメールで問い合わせる」から送られたもの。連絡先がある＝返信できる
 *
 * ⚠ 会話ログは90日で消える（/api/cron/purge-chat-logs）。残したいものは別に控える。
 */

type Conversation = {
  id: string
  page_path: string | null
  first_question: string | null
  message_count: number
  started_at: string
  last_message_at: string
}

type Message = {
  id: number
  role: 'user' | 'assistant'
  content: string
  retrieval: string | null
  created_at: string
}

type TranscriptLine = { role: 'user' | 'assistant'; content: string }

type Ticket = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  transcript: TranscriptLine[] | null
  page_path: string | null
  source: string
  status: string
  created_at: string
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminChatLogsPage() {
  const [tab, setTab] = useState<'conversations' | 'tickets'>('conversations')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** 開いている会話の中身。id をキーに覚えて、開き直すたびに取りに行かない */
  const [openId, setOpenId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [convRes, ticketRes] = await Promise.all([
        fetch('/api/admin/chat-logs'),
        fetch('/api/admin/support-tickets'),
      ])
      const convData = await convRes.json().catch(() => ({}))
      const ticketData = await ticketRes.json().catch(() => ({}))

      if (!convRes.ok) setError(convData.message || convData.error || '会話ログの取得に失敗しました')
      else setConversations(convData.conversations ?? [])

      if (!ticketRes.ok && convRes.ok) {
        setError(ticketData.message || ticketData.error || '問い合わせの取得に失敗しました')
      } else if (ticketRes.ok) {
        setTickets(ticketData.tickets ?? [])
      }
    } catch {
      setError('通信エラーが発生しました')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    if (messages[id]) return

    setLoadingId(id)
    try {
      const res = await fetch(`/api/admin/chat-logs/${id}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) setMessages((m) => ({ ...m, [id]: data.messages ?? [] }))
      else setError(data.message || data.error || 'やりとりの取得に失敗しました')
    } catch {
      setError('通信エラーが発生しました')
    }
    setLoadingId(null)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            チャットの履歴
          </h1>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-base hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
        <p className="text-base text-gray-500 mb-6">
          会話ログは90日で自動的に消えます。残したいものは控えを取ってください。
        </p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('conversations')}
            className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
              tab === 'conversations'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-purple-50'
            }`}
          >
            会話ログ（{conversations.length}）
          </button>
          <button
            onClick={() => setTab('tickets')}
            className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
              tab === 'tickets'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-purple-50'
            }`}
          >
            メール問い合わせ（{tickets.length}）
          </button>
        </div>

        {error && <p className="mb-4 text-base text-red-600">{error}</p>}
        {loading && <p className="text-base text-gray-500">読み込み中…</p>}

        {!loading && tab === 'conversations' && (
          <section className="space-y-3">
            {conversations.length === 0 && !error && (
              <p className="text-base text-gray-500">
                まだ会話はありません。チャットで質問されると、ここに残ります。
              </p>
            )}
            {conversations.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <button
                  onClick={() => toggle(c.id)}
                  className="w-full text-left p-4 hover:bg-purple-50 rounded-xl transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-base font-medium text-gray-900">
                      {c.first_question || '（質問なし）'}
                    </p>
                    <span className="shrink-0 text-base text-gray-500">
                      {formatDateTime(c.last_message_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-base text-gray-500">
                    {Math.floor(c.message_count / 2)}往復
                    {c.page_path ? ` ・ ${c.page_path}` : ''}
                  </p>
                </button>

                {openId === c.id && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {loadingId === c.id && <p className="text-base text-gray-500">読み込み中…</p>}
                    {(messages[c.id] ?? []).map((m) => (
                      <div
                        key={m.id}
                        className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-base whitespace-pre-wrap ${
                            m.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {m.content}
                          {m.role === 'assistant' && m.retrieval === 'fallback' && (
                            <span
                              className="ml-2 align-middle text-xs text-amber-700"
                              title="知識の類似検索が当たらず、公開中の知識をまとめて渡して答えています"
                            >
                              知識が当たっていません
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {!loading && tab === 'tickets' && (
          <section className="space-y-4">
            {tickets.length === 0 && !error && (
              <p className="text-base text-gray-500">まだ問い合わせはありません。</p>
            )}
            {tickets.map((t) => (
              <article key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <LifeBuoy className="w-5 h-5 text-purple-600" />
                      {t.name}
                    </p>
                    <p className="text-base text-gray-600">
                      <a href={`mailto:${t.email}`} className="text-purple-700 underline">
                        {t.email}
                      </a>
                      {t.phone ? ` ・ ${t.phone}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-base text-gray-500">{formatDateTime(t.created_at)}</span>
                </div>

                <p className="whitespace-pre-wrap text-base text-gray-900 bg-gray-50 rounded-lg p-4">
                  {t.message}
                </p>

                <p className="mt-2 text-base text-gray-500">
                  {t.page_path ? `送信元: ${t.page_path}` : ''}
                </p>

                {t.transcript && t.transcript.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-base text-purple-700">
                      ここまでのチャット（{t.transcript.length}件）
                    </summary>
                    <div className="mt-3 space-y-2">
                      {t.transcript.map((line, i) => (
                        <div
                          key={i}
                          className={line.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 text-base whitespace-pre-wrap ${
                              line.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {line.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
