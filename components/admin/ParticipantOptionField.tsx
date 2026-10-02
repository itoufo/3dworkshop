'use client'

import { ListChecks, Plus, Trash2 } from 'lucide-react'
import { parseParticipantOption, isValidChoicePrice, MAX_CHOICE_PRICE, type ParticipantOption } from '@/lib/participant-option'

/** フォーム上の1行。金額は入力途中の文字列のまま持つ */
interface ChoiceRow {
  id: string
  label: string
  price: string
}

export interface ParticipantOptionValue {
  enabled: boolean
  label: string
  choices: ChoiceRow[]
}

export const EMPTY_PARTICIPANT_OPTION: ParticipantOptionValue = {
  enabled: false,
  label: '',
  choices: [],
}

/**
 * 選択肢の id。予約に残る控えと決済の確認がこの id で照合するので、
 * 一度付けたら名前や金額を直しても変えない（行を消して足し直すと別の id になる）。
 */
function newChoiceId(): string {
  return `c_${Math.random().toString(36).slice(2, 10)}`
}

function newChoiceRow(): ChoiceRow {
  return { id: newChoiceId(), label: '', price: '0' }
}

/**
 * DB に値が入っているのに、選択肢として読めないか（DB を直接書き換えて形が壊れた場合）。
 * ⚠ このとき欄は OFF で出る。そのまま保存すると壊れた値を null で上書きして消してしまうので、
 *   編集画面は欄を触るまでこの列を保存の対象から外す
 */
export function isUnreadableParticipantOption(w: { participant_option?: unknown }): boolean {
  return w.participant_option != null && parseParticipantOption(w.participant_option) === null
}

/** DB の値 → フォームの値 */
export function participantOptionFromWorkshop(w: { participant_option?: unknown }): ParticipantOptionValue {
  const option = parseParticipantOption(w.participant_option)
  if (!option) return EMPTY_PARTICIPANT_OPTION
  return {
    enabled: true,
    label: option.label,
    choices: option.choices.map((c) => ({ id: c.id, label: c.label, price: String(c.price) })),
  }
}

function parsePrice(price: string): number | null {
  if (!/^\d+$/.test(price.trim())) return null
  const n = Number(price.trim())
  return isValidChoicePrice(n) ? n : null
}

/** ON なのに値が不正なときのエラー文。正しければ null。⚠ 保存前に必ず確かめる（黙って OFF で保存しない） */
export function participantOptionError(v: ParticipantOptionValue): string | null {
  if (!v.enabled) return null
  if (v.label.trim() === '') return '参加者ごとの選択肢: 何を選ぶのか（例: フィギュア）を入力してください'
  if (v.choices.length === 0) return '参加者ごとの選択肢: 選べるものを1つ以上入れてください'
  for (const c of v.choices) {
    if (c.label.trim() === '') return '参加者ごとの選択肢: 名前が空の行があります'
    if (parsePrice(c.price) === null) {
      return `参加者ごとの選択肢: 「${c.label}」の金額は 0 か、50〜${MAX_CHOICE_PRICE.toLocaleString()} の整数（円）で入力してください`
    }
  }
  return null
}

/** フォームの値 → DB の値（OFF なら null）。呼ぶ前に participantOptionError で確かめること */
export function participantOptionToColumns(v: ParticipantOptionValue): { participant_option: ParticipantOption | null } {
  if (!v.enabled || participantOptionError(v)) return { participant_option: null }
  return {
    participant_option: {
      label: v.label.trim(),
      choices: v.choices.map((c) => ({ id: c.id, label: c.label.trim(), price: parsePrice(c.price) ?? 0 })),
    },
  }
}

export default function ParticipantOptionField({
  value,
  onChange,
}: {
  value: ParticipantOptionValue
  onChange: (v: ParticipantOptionValue) => void
}) {
  const error = participantOptionError(value)

  const updateChoice = (id: string, patch: Partial<ChoiceRow>) =>
    onChange({ ...value, choices: value.choices.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-md space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <ListChecks className="w-4 h-4 mr-1 text-purple-600" />
            参加者ごとの選択肢
          </label>
          <p className="text-xs text-gray-500 mt-1">
            予約のとき、参加者1人につき1つ選んでもらいます（例: 塗るフィギュアを 持参 / 7cm / 10cm から選ぶ）。
            選んだものの金額が、参加費に加わって決済されます。クーポンと早割は参加費にだけ効きます。
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              enabled: !value.enabled,
              // ON にした直後に何も無いと保存できないので、1行だけ用意する
              choices: !value.enabled && value.choices.length === 0 ? [newChoiceRow()] : value.choices,
            })
          }
          aria-pressed={value.enabled}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
            value.enabled ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {value.enabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">何を選ぶのか</label>
            <input
              type="text"
              value={value.label}
              onChange={(e) => onChange({ ...value, label: e.target.value })}
              placeholder="フィギュア"
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_8rem_2.5rem] gap-2 text-xs font-medium text-gray-700">
              <span>選べるもの</span>
              <span>加える金額（円）</span>
              <span />
            </div>
            {value.choices.map((c) => (
              <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_8rem_2.5rem] gap-2">
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) => updateChoice(c.id, { label: e.target.value })}
                  placeholder="持参する"
                  className="min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={c.price}
                  onChange={(e) => updateChoice(c.id, { price: e.target.value })}
                  className="min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...value, choices: value.choices.filter((x) => x.id !== c.id) })}
                  aria-label={`「${c.label || '名前なし'}」を消す`}
                  className="flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...value, choices: [...value.choices, newChoiceRow()] })}
              className="inline-flex items-center text-sm text-purple-700 hover:text-purple-900"
            >
              <Plus className="w-4 h-4 mr-1" />
              選べるものを足す
            </button>
          </div>

          <p className="text-xs text-gray-500">
            金額を 0 にすると「追加料金なし」と出ます（1〜49円は入れられません）。ここを直しても、すでに入っている予約の内容と金額は変わりません。
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
