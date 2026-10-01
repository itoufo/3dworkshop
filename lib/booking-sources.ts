/**
 * 予約の流入経路（bookings.source / customers.acquisition_source）。
 *
 * ⚠ 値の一覧は DB の CHECK 制約（supabase/migrations/20261001_add_booking_source_and_commission.sql）
 *   と揃える。ここに足すときはマイグレーションも足す。
 */
export const BOOKING_SOURCES = ['website', 'booking_site', 'email', 'phone', 'referral', 'other'] as const

export type BookingSource = (typeof BOOKING_SOURCES)[number]

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  website: '自社サイト',
  booking_site: '予約サイト',
  email: 'メール',
  phone: '電話',
  referral: '紹介',
  other: 'その他',
}

/** 補足欄の入力例。予約サイトなら媒体名、紹介なら紹介者 */
export const BOOKING_SOURCE_DETAIL_HINTS: Partial<Record<BookingSource, string>> = {
  booking_site: 'ストアカ / aini / じゃらん など',
  referral: '紹介者のお名前など',
  other: '経路の説明',
}

export function isBookingSource(value: unknown): value is BookingSource {
  return typeof value === 'string' && (BOOKING_SOURCES as readonly string[]).includes(value)
}

/** 古い行や想定外の値は「自社サイト」として扱う（列の既定値と同じ） */
export function bookingSourceLabel(value: string | null | undefined): string {
  return isBookingSource(value) ? BOOKING_SOURCE_LABELS[value] : BOOKING_SOURCE_LABELS.website
}
