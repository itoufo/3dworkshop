'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Loader2, RefreshCw, Send, Users } from 'lucide-react'

interface NotificationLog {
  id: string
  kind: string
  title: string
  body: string
  url: string | null
  sent_count: number
  failed_count: number
  created_at: string
}

/**
 * 管理画面の通知タブ。
 *
 * ・通知をオンにしている端末数の確認
 * ・お知らせの手動配信（日程追加の通知は日程を追加した時点で自動送信される）
 * ・直近の配信履歴
 */
export default function PushNotificationPanel() {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(true)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [authError, setAuthError] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/workshops')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/push/status')
      if (response.status === 401) {
        setAuthError(true)
      } else if (response.ok) {
        setAuthError(false)
        const data = await response.json()
        setConfigured(data.configured)
        setSubscriberCount(data.subscriberCount)
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('failed to load push status:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      alert('タイトルと本文を入力してください')
      return
    }
    if (!confirm(`通知をオンにしている ${subscriberCount} 件の端末にお知らせを送ります。よろしいですか？`)) {
      return
    }

    setSending(true)
    setResult(null)
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || '/workshops' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setResult(data.error || '送信に失敗しました')
      } else {
        setResult(`${data.sent} 件に送信しました${data.failed ? `（${data.failed} 件は失敗）` : ''}`)
        setTitle('')
        setBody('')
        loadStatus()
      }
    } catch (error) {
      console.error('send failed:', error)
      setResult('送信に失敗しました（通信エラー）')
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        通知の状態を読み込み中...
      </div>
    )
  }

  if (authError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900">
        <p className="font-semibold mb-1">通知の管理権限を確認できませんでした</p>
        <p className="text-sm">
          ログイン情報が古い可能性があります。右上の「ログアウト」から入り直すと表示できます。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800">
          <p className="font-semibold mb-1">通知が有効になっていません</p>
          <p className="text-sm">
            環境変数 <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> と{' '}
            <code className="bg-red-100 px-1 rounded">VAPID_PRIVATE_KEY</code> を設定して再デプロイしてください。
            設定するまで、日程を追加しても通知は送信されません。
          </p>
        </div>
      )}

      {/* 購読者数 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">通知をオンにしている端末</p>
              <p className="text-3xl font-bold text-gray-900">
                {subscriberCount}
                <span className="text-base font-normal text-gray-500 ml-1">件</span>
              </p>
            </div>
          </div>
          <button
            onClick={loadStatus}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-4 bg-purple-50 border border-purple-200 rounded-xl p-3">
          <BellRing className="w-4 h-4 inline mr-1 text-purple-600" />
          開催日程を追加すると、この端末すべてに「新しい開催日程が追加されました」の通知が自動で届きます。
          手動で送る必要はありません。
        </p>
      </div>

      {/* 手動配信 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">お知らせを手動で送る</h3>
        <p className="text-sm text-gray-500 mb-4">
          残席のお知らせや、開催内容の変更など、日程追加以外の連絡に使います。
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="例: 今週末のワークショップに空きが出ました"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="例: 8/31(日) 14:00 の回にキャンセルが出ました。ご予約はお早めに。"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タップしたときに開くページ
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/workshops"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">サイト内のパスを / から書いてください（例: /workshops）</p>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !configured}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? '送信中...' : `${subscriberCount} 件に送信`}
          </button>

          {result && <p className="text-sm text-purple-700 bg-purple-50 rounded-xl p-3">{result}</p>}
        </div>
      </div>

      {/* 配信履歴 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">最近の通知（最新20件）</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">まだ通知を送信していません。</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{log.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{log.body}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 text-xs rounded ${
                      log.kind === 'workshop_schedule'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {log.kind === 'workshop_schedule' ? '日程追加' : '手動'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(log.created_at).toLocaleString('ja-JP')}／送信 {log.sent_count} 件
                  {log.failed_count > 0 && `／失敗 ${log.failed_count} 件`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
