'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  Pin,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

/**
 * チャットボットの知識の編集画面。
 *
 * ⚠ ここで直した内容は、次の質問からすぐボットに反映される（デプロイは要らない）。
 *   公開サイトの発言が変わるということなので、保存前に本文を読み直すこと。
 *
 * ⚠ 「固定」を増やしすぎない。固定した項目は毎回 system に入るので、
 *   増やすほど1問あたりの費用が上がり、関係ない話題にも混ざる。
 *   料金・受け渡しのように「抜けると間違った案内になる」ものだけに付ける。
 */

type Item = {
  id: string
  title: string
  body: string
  tags: string[]
  is_published: boolean
  is_pinned: boolean
  sort_order: number
  embedding_source: string | null
  updated_at: string
}

type Draft = {
  title: string
  body: string
  tags: string
  is_published: boolean
  is_pinned: boolean
  sort_order: number
}

const EMPTY: Draft = {
  title: '',
  body: '',
  tags: '',
  is_published: true,
  is_pinned: false,
  sort_order: 0,
}

function toDraft(item: Item): Draft {
  return {
    title: item.title,
    body: item.body,
    tags: item.tags.join(', '),
    is_published: item.is_published,
    is_pinned: item.is_pinned,
    sort_order: item.sort_order,
  }
}

function toPayload(draft: Draft) {
  return {
    title: draft.title,
    body: draft.body,
    tags: draft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    is_published: draft.is_published,
    is_pinned: draft.is_pinned,
    sort_order: draft.sort_order,
  }
}

/** 本文と埋め込みがズレているか。API 側の needsReembedding と同じ判定 */
function needsReembed(item: Item): boolean {
  return item.embedding_source !== `${item.title}\n${item.body}`.trim()
}

export default function ChatKnowledgePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [creating, setCreating] = useState(false)

  const [reembedding, setReembedding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ reply: string; used: string[]; retrieval: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/chat-knowledge')
      if (r.status === 401) {
        setError('セッションが切れています。一度ログアウトして、パスワードを入れ直してください。')
        return
      }
      const data = await r.json()
      if (!r.ok) {
        setError(data.message || '読み込みに失敗しました。migration を適用済みか確認してください。')
        return
      }
      setItems(data.items)
    } catch {
      setError('読み込みに失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(id: string | null) {
    const payload = toPayload(draft)
    if (!payload.title.trim() || !payload.body.trim()) {
      setNotice('タイトルと本文は必須です。')
      return
    }
    setBusyId(id ?? 'new')
    setNotice(null)
    try {
      const r = await fetch(id ? `/api/admin/chat-knowledge/${id}` : '/api/admin/chat-knowledge', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json()
      if (!r.ok) {
        setNotice(data.messages?.join(' / ') || data.message || '保存に失敗しました。')
        return
      }
      if (data.embedded === false) {
        setNotice('保存しました。ただし OPENAI_API_KEY が無いためベクトルは作られていません（検索は全件渡しで動きます）。')
      } else {
        setNotice('保存しました。')
      }
      setEditingId(null)
      setCreating(false)
      setDraft(EMPTY)
      await load()
    } catch {
      setNotice('保存に失敗しました。')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: Item) {
    if (!confirm(`「${item.title}」を削除します。よろしいですか？`)) return
    setBusyId(item.id)
    try {
      const r = await fetch(`/api/admin/chat-knowledge/${item.id}`, { method: 'DELETE' })
      if (!r.ok) {
        setNotice('削除に失敗しました。')
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function reembed() {
    setReembedding(true)
    setNotice(null)
    try {
      const r = await fetch('/api/admin/chat-knowledge/reembed', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) {
        setNotice(data.message || 'ベクトルの作成に失敗しました。')
        return
      }
      setNotice(
        data.total === 0
          ? 'すべて最新です。作り直す項目はありませんでした。'
          : `${data.updated}/${data.total} 件のベクトルを作り直しました。${
              data.failed?.length ? `失敗: ${data.failed.join('、')}` : ''
            }`,
      )
      await load()
    } finally {
      setReembedding(false)
    }
  }

  async function test() {
    if (!question.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch('/api/admin/chat-knowledge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await r.json()
      if (!r.ok) {
        setNotice(data.message || 'テストに失敗しました。')
        return
      }
      setTestResult(data)
    } catch {
      setNotice('テストに失敗しました。')
    } finally {
      setTesting(false)
    }
  }

  const stale = items.filter(needsReembed).length

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">チャットボットの知識</h1>
          <p className="text-sm text-gray-600 mt-1">
            サイト右下のチャットが答える内容です。保存すると次の質問からすぐ反映されます。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reembed}
            disabled={reembedding}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
          >
            {reembedding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            ベクトルを作り直す
          </button>
          <button
            onClick={() => {
              setCreating(true)
              setEditingId(null)
              setDraft({ ...EMPTY, sort_order: (items.at(-1)?.sort_order ?? 0) + 10 })
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            項目を追加
          </button>
        </div>
      </div>

      {stale > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            {stale} 件のベクトルが本文とズレています。この状態でも回答はできますが、検索が効かず全件を渡す動作になります。
            「ベクトルを作り直す」を押してください。
          </p>
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="閉じる">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {/* 動作テスト */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
          <Sparkles className="w-4 h-4 text-purple-600" />
          動作テスト
        </h2>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') test()
            }}
            placeholder="例: 作品はその日に持って帰れますか？"
            className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={test}
            disabled={testing || !question.trim()}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-xl bg-gray-900 disabled:bg-gray-300"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : '試す'}
          </button>
        </div>
        {testResult && (
          <div className="mt-4 space-y-3">
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-800">
              {testResult.reply}
            </p>
            <p className="text-xs text-gray-500">
              使われた項目: {testResult.used.join(' / ') || 'なし'}
              {testResult.retrieval === 'fallback' && '（検索が使えないため全件を渡しています）'}
            </p>
          </div>
        )}
      </div>

      {/* 新規作成 */}
      {creating && (
        <Editor
          draft={draft}
          setDraft={setDraft}
          onSave={() => save(null)}
          onCancel={() => {
            setCreating(false)
            setDraft(EMPTY)
          }}
          busy={busyId === 'new'}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <Editor
                key={item.id}
                draft={draft}
                setDraft={setDraft}
                onSave={() => save(item.id)}
                onCancel={() => setEditingId(null)}
                busy={busyId === item.id}
              />
            ) : (
              <div key={item.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                          <Pin className="w-3 h-3" />
                          常に渡す
                        </span>
                      )}
                      {!item.is_published && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          非公開
                        </span>
                      )}
                      {needsReembed(item) && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          未ベクトル化
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{item.body}</p>
                    {item.tags.length > 0 && (
                      <p className="mt-2 text-xs text-gray-400">{item.tags.map((t) => `#${t}`).join(' ')}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditingId(item.id)
                        setCreating(false)
                        setDraft(toDraft(item))
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-50"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => remove(item)}
                      disabled={busyId === item.id}
                      aria-label={`${item.title} を削除`}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}

          {items.length === 0 && !error && (
            <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-gray-500 shadow-sm">
              知識がまだありません。「項目を追加」から登録してください。
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Editor({
  draft,
  setDraft,
  onSave,
  onCancel,
  busy,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
  onSave: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div className="mb-3 rounded-2xl border-2 border-purple-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">タイトル</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="例: 完成品の受け渡し"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            質問と照らし合わせる手がかりになります。「料金」「アクセス」のように、聞かれ方に近い言葉を入れてください。
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">本文</label>
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={8}
            placeholder={'ボットに答えさせたい事実をそのまま書きます。\n答えてほしくないことは「〜と言わない」と書けば守ります。'}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            ⚠ ここに書いていないことはボットも答えません（「分かりかねます」と返します）。曖昧に書くと曖昧に答えます。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">タグ（カンマ区切り・任意）</label>
            <input
              value={draft.tags}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              placeholder="料金, ワークショップ"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">並び順</label>
            <input
              type="number"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.is_published}
              onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-purple-600"
            />
            公開する（外すとボットに渡りません。裏取り前の数字はここで止めてください）
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.is_pinned}
              onChange={(e) => setDraft({ ...draft, is_pinned: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-purple-600"
            />
            常に渡す（検索に関係なく毎回入れる。料金・受け渡しなど、抜けると間違った案内になるものだけ）
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            キャンセル
          </button>
          <button
            onClick={onSave}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </button>
        </div>
      </div>
    </div>
  )
}
