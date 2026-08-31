'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WorkshopSession } from '@/types'
import { Plus, Trash2, Calendar, Clock, Save, X, BellRing, BellOff, Loader2 } from 'lucide-react'
import { fetchNotifiedScheduleKeys, notifyWorkshopSchedule } from '@/lib/notify-schedule'
import { scheduleDedupeKey } from '@/lib/workshop-notification'

interface Props {
  workshopId: string
}

type DraftSession = {
  event_date: string
  event_time: string
  max_participants: string
  manual_participants: string
  notes: string
  is_family_friendly: boolean
}

const emptyDraft: DraftSession = {
  event_date: '',
  event_time: '',
  max_participants: '',
  manual_participants: '0',
  notes: '',
  is_family_friendly: false,
}

export default function WorkshopSessionsEditor({ workshopId }: Props) {
  const [sessions, setSessions] = useState<WorkshopSession[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<DraftSession>(emptyDraft)
  const [savingId, setSavingId] = useState<string | null>(null)
  // 通知済みの日程キー。日程追加は通知必須なので、送れたかどうかを一覧に出す
  const [notifiedKeys, setNotifiedKeys] = useState<Set<string>>(new Set())
  const [notifyingKey, setNotifyingKey] = useState<string | null>(null)
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workshop_sessions')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true })
    if (error) {
      console.error('fetch sessions failed:', error)
    } else {
      setSessions((data as WorkshopSession[]) || [])
    }
    setLoading(false)
  }, [workshopId])

  const refreshNotified = useCallback(async () => {
    setNotifiedKeys(await fetchNotifiedScheduleKeys(workshopId))
  }, [workshopId])

  useEffect(() => {
    fetchSessions()
    refreshNotified()
  }, [fetchSessions, refreshNotified])

  /**
   * 日程の通知を送る。日程追加の直後に自動で呼ぶほか、
   * 失敗したときや文面を出し直したいときに手動でも呼べる。
   */
  const sendNotification = useCallback(
    async (session: { event_date: string; event_time: string | null }, force: boolean) => {
      const key = scheduleDedupeKey(workshopId, session.event_date, session.event_time)
      setNotifyingKey(key)
      const result = await notifyWorkshopSchedule({
        workshopId,
        eventDate: session.event_date,
        eventTime: session.event_time,
        force,
      })
      setNotifyingKey(null)
      setNotifyMessage(result.message)
      await refreshNotified()
      return result
    },
    [workshopId, refreshNotified]
  )

  async function handleAdd() {
    if (!draft.event_date) {
      alert('開催日を入力してください')
      return
    }
    setSavingId('new')
    const { error } = await supabase.from('workshop_sessions').insert({
      workshop_id: workshopId,
      event_date: draft.event_date,
      event_time: draft.event_time || null,
      max_participants: draft.max_participants ? parseInt(draft.max_participants) : null,
      manual_participants: parseInt(draft.manual_participants) || 0,
      notes: draft.notes || null,
      is_family_friendly: draft.is_family_friendly,
      status: 'scheduled',
    })
    setSavingId(null)
    if (error) {
      console.error('insert session failed:', error)
      alert('追加に失敗しました')
      return
    }
    const added = { event_date: draft.event_date, event_time: draft.event_time || null }
    setDraft(emptyDraft)
    setAdding(false)
    fetchSessions()

    // 日程追加は通知必須。保存できた時点で自動送信し、結果を管理者に見せる
    const result = await sendNotification(added, false)
    if (!result.ok) {
      alert(`日程は追加されましたが、通知に失敗しました。\n${result.message}\n\n一覧の「通知を送る」から再送してください。`)
    }
  }

  async function handleUpdate(s: WorkshopSession, patch: Partial<WorkshopSession>) {
    setSavingId(s.id)
    const { error } = await supabase.from('workshop_sessions').update(patch).eq('id', s.id)
    setSavingId(null)
    if (error) {
      console.error('update session failed:', error)
      alert('更新に失敗しました')
      return
    }
    fetchSessions()
  }

  async function handleCancel(s: WorkshopSession) {
    if (!confirm(`${s.event_date} のセッションをキャンセル状態にしますか？\n(削除ではなく status=cancelled に変更)`)) return
    await handleUpdate(s, { status: 'cancelled' })
  }

  async function handleReactivate(s: WorkshopSession) {
    await handleUpdate(s, { status: 'scheduled' })
  }

  async function handleDelete(s: WorkshopSession) {
    if (!confirm(`${s.event_date} のセッションを完全に削除しますか？\n紐づく予約がある場合は失敗します。`)) return
    setSavingId(s.id)
    const { error } = await supabase.from('workshop_sessions').delete().eq('id', s.id)
    setSavingId(null)
    if (error) {
      console.error('delete session failed:', error)
      alert('削除に失敗しました（予約が紐づいている可能性があります）')
      return
    }
    fetchSessions()
  }

  if (loading) {
    return <p className="text-sm text-gray-500">セッションを読み込み中...</p>
  }

  return (
    <div className="space-y-3">
      {sessions.length === 0 && !adding && (
        <p className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded p-3">
          開催日程が未設定です。このワークショップは「開催リクエスト受付」として表示されます。
        </p>
      )}

      {notifyMessage && (
        <div className="flex items-start gap-2 text-sm bg-purple-50 border border-purple-200 text-purple-800 rounded p-3">
          <BellRing className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{notifyMessage}</span>
          <button
            type="button"
            onClick={() => setNotifyMessage(null)}
            className="text-purple-500 hover:text-purple-700"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {sessions.map((s) => {
        const key = scheduleDedupeKey(workshopId, s.event_date, s.event_time)
        return (
          <SessionRow
            key={s.id}
            session={s}
            saving={savingId === s.id}
            notified={notifiedKeys.has(key)}
            notifying={notifyingKey === key}
            onNotify={(force) => sendNotification({ event_date: s.event_date, event_time: s.event_time }, force)}
            onUpdate={(patch) => handleUpdate(s, patch)}
            onCancel={() => handleCancel(s)}
            onReactivate={() => handleReactivate(s)}
            onDelete={() => handleDelete(s)}
          />
        )
      })}

      {adding ? (
        <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 bg-indigo-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">開催日 *</label>
              <input
                type="date"
                value={draft.event_date}
                onChange={(e) => setDraft({ ...draft, event_date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">開始時刻</label>
              <input
                type="time"
                value={draft.event_time}
                onChange={(e) => setDraft({ ...draft, event_time: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                定員 (上書)
              </label>
              <input
                type="number"
                min={1}
                placeholder="未設定"
                value={draft.max_participants}
                onChange={(e) => setDraft({ ...draft, max_participants: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">手動加算</label>
              <input
                type="number"
                min={0}
                value={draft.manual_participants}
                onChange={(e) => setDraft({ ...draft, manual_participants: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">メモ</label>
            <input
              type="text"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="任意。社内メモなど"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
          <label className="flex items-center mb-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.is_family_friendly}
              onChange={(e) => setDraft({ ...draft, is_family_friendly: e.target.checked })}
              className="w-4 h-4 mr-2 accent-purple-600"
            />
            親子向け（保護者同伴 無料・定員外／「親子におすすめ！」表示）
          </label>
          <p className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1.5 mb-3">
            <BellRing className="w-3.5 h-3.5 flex-shrink-0" />
            追加すると、通知をオンにしている利用者に「新しい開催日程」のお知らせが自動で届きます。
          </p>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={savingId === 'new'}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {savingId === 'new' ? '保存中...' : '追加'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setDraft(emptyDraft)
              }}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          開催日程を追加
        </button>
      )}
    </div>
  )
}

interface RowProps {
  session: WorkshopSession
  saving: boolean
  /** この日程の通知を送信済みか */
  notified: boolean
  notifying: boolean
  onNotify: (force: boolean) => void
  onUpdate: (patch: Partial<WorkshopSession>) => void
  onCancel: () => void
  onReactivate: () => void
  onDelete: () => void
}

function SessionRow({
  session,
  saving,
  notified,
  notifying,
  onNotify,
  onUpdate,
  onCancel,
  onReactivate,
  onDelete,
}: RowProps) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({
    event_date: session.event_date,
    event_time: session.event_time || '',
    max_participants: session.max_participants?.toString() || '',
    manual_participants: session.manual_participants?.toString() || '0',
    notes: session.notes || '',
    is_family_friendly: !!session.is_family_friendly,
  })

  const isCancelled = session.status === 'cancelled'

  function save() {
    onUpdate({
      event_date: local.event_date,
      event_time: local.event_time || null,
      max_participants: local.max_participants ? parseInt(local.max_participants) : null,
      manual_participants: parseInt(local.manual_participants) || 0,
      notes: local.notes || null,
      is_family_friendly: local.is_family_friendly,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="border border-indigo-300 rounded-lg p-3 bg-indigo-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <input
            type="date"
            value={local.event_date}
            onChange={(e) => setLocal({ ...local, event_date: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
          <input
            type="time"
            value={local.event_time}
            onChange={(e) => setLocal({ ...local, event_time: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
          <input
            type="number"
            placeholder="定員(空=workshop側)"
            value={local.max_participants}
            onChange={(e) => setLocal({ ...local, max_participants: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
          <input
            type="number"
            placeholder="手動加算"
            value={local.manual_participants}
            onChange={(e) => setLocal({ ...local, manual_participants: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
        </div>
        <input
          type="text"
          placeholder="メモ"
          value={local.notes}
          onChange={(e) => setLocal({ ...local, notes: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-2"
        />
        <label className="flex items-center mb-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={local.is_family_friendly}
            onChange={(e) => setLocal({ ...local, is_family_friendly: e.target.checked })}
            className="w-4 h-4 mr-2 accent-purple-600"
          />
          親子向け（保護者同伴 無料・定員外）
        </label>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 border border-gray-300 text-xs rounded hover:bg-gray-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 border rounded-lg p-3 ${isCancelled ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
        <div className="flex items-center">
          <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" />
          <span className="font-medium">{session.event_date}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500" />
          {session.event_time?.slice(0, 5) || '時刻未定'}
        </div>
        <div className="text-gray-600">
          定員: {session.max_participants ?? <span className="text-gray-400">workshop側</span>}
          {session.manual_participants > 0 && (
            <span className="ml-1 text-orange-600">+{session.manual_participants}手動</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isCancelled ? (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">キャンセル</span>
          ) : (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">開催予定</span>
          )}
          {session.is_family_friendly && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">親子向け</span>
          )}
          {!isCancelled &&
            (notified ? (
              <span
                className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded flex items-center gap-1"
                title="この日程の通知は送信済みです"
              >
                <BellRing className="w-3 h-3" />
                通知済み
              </span>
            ) : (
              <span
                className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded flex items-center gap-1"
                title="この日程はまだ通知されていません"
              >
                <BellOff className="w-3 h-3" />
                未通知
              </span>
            ))}
        </div>
      </div>
      {session.notes && (
        <span className="text-xs text-gray-500 truncate max-w-[150px]" title={session.notes}>
          {session.notes}
        </span>
      )}
      <div className="flex space-x-1 flex-shrink-0">
        {!isCancelled && (
          <button
            type="button"
            onClick={() => {
              if (notified && !confirm('この日程はすでに通知済みです。同じ内容をもう一度送りますか？')) return
              onNotify(notified)
            }}
            disabled={saving || notifying}
            className={
              notified
                ? 'px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1'
                : 'px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1'
            }
            title={notified ? '同じ内容の通知を再送する' : 'この日程の通知を送る'}
          >
            {notifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
            {notified ? '再送' : '通知を送る'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={saving}
          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          編集
        </button>
        {isCancelled ? (
          <button
            type="button"
            onClick={onReactivate}
            disabled={saving}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
          >
            再開催
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
          title="完全削除"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
