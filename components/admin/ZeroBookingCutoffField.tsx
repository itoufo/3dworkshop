'use client'

import { Clock } from 'lucide-react'
import { formatCutoffJst, zeroBookingCutoffJst } from '@/lib/booking-deadline'

export interface ZeroBookingCutoffValue {
  enabled: boolean
  daysBefore: string
  time: string
}

/** 既定は「前日 24:00」（= 開催日 0:00） */
export const DEFAULT_ZERO_BOOKING_CUTOFF: ZeroBookingCutoffValue = {
  enabled: true,
  daysBefore: '0',
  time: '00:00',
}

/** DB の値 → フォームの値 */
export function zeroBookingCutoffFromWorkshop(w: {
  zero_booking_cutoff_days_before?: number | null
  zero_booking_cutoff_time?: string | null
}): ZeroBookingCutoffValue {
  if (w.zero_booking_cutoff_days_before == null || !w.zero_booking_cutoff_time) {
    return { ...DEFAULT_ZERO_BOOKING_CUTOFF, enabled: false }
  }
  return {
    enabled: true,
    daysBefore: String(w.zero_booking_cutoff_days_before),
    time: w.zero_booking_cutoff_time.slice(0, 5),
  }
}

/** フォームの値 → DB の値（OFF なら両方 null） */
export function zeroBookingCutoffToColumns(v: ZeroBookingCutoffValue) {
  const days = parseInt(v.daysBefore)
  if (!v.enabled || Number.isNaN(days) || !v.time) {
    return { zero_booking_cutoff_days_before: null, zero_booking_cutoff_time: null }
  }
  return { zero_booking_cutoff_days_before: days, zero_booking_cutoff_time: v.time }
}

// 設定の読み違いを防ぐための例示（土曜 14:00 開始の回）
const EXAMPLE_SESSION = { event_date: '2026-10-10', event_time: '14:00' }

export default function ZeroBookingCutoffField({
  value,
  onChange,
}: {
  value: ZeroBookingCutoffValue
  onChange: (v: ZeroBookingCutoffValue) => void
}) {
  const columns = zeroBookingCutoffToColumns(value)
  const example = zeroBookingCutoffJst(columns, EXAMPLE_SESSION)

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Clock className="w-4 h-4 mr-1 text-blue-600" />
            予約0人のときの締切
          </label>
          <p className="text-xs text-gray-500 mt-1">
            締切の時点で参加者が0人（サイト予約＋他媒体の手入力人数）の回は受付を終了します。
            1人以上いれば開始時刻まで受け付けます。オフにすると開始時刻まで受け付けます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
            value.enabled ? 'bg-blue-600' : 'bg-gray-300'
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
        <div className="pt-2 border-t border-blue-200 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span>開催の</span>
            <input
              type="number"
              min="0"
              max="30"
              value={value.daysBefore}
              onChange={(e) => onChange({ ...value, daysBefore: e.target.value })}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <span>日前の</span>
            <input
              type="time"
              value={value.time}
              onChange={(e) => onChange({ ...value, time: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500">
            「0日前の 00:00」が前日 24:00 です。
            {example && (
              <>
                {' '}例: 10月10日 14:00 開始の回 → <span className="font-semibold">{formatCutoffJst(example)}</span> に0人なら受付終了
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
