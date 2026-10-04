export const JAPAN_PREFECTURES = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']

export function bookingDeadline(eventDate: string | null | undefined, days = 0): Date | null {
  if (!eventDate || days <= 0) return null
  const date = new Date(`${eventDate}T00:00:00+09:00`)
  date.setUTCDate(date.getUTCDate() - days)
  return date
}

export function isBookingClosed(eventDate: string | null | undefined, days = 0, now = new Date()): boolean {
  const deadline = bookingDeadline(eventDate, days)
  return days > 0 && (!deadline || !Number.isFinite(deadline.getTime()) || now >= deadline)
}

export function validShippingAddress(booking: { shipping_postal_code?: string | null; shipping_prefecture?: string | null; shipping_address?: string | null }): boolean {
  return /^\d{3}-?\d{4}$/.test(booking.shipping_postal_code ?? '') && JAPAN_PREFECTURES.includes(booking.shipping_prefecture ?? '') && !!booking.shipping_address?.trim()
}
