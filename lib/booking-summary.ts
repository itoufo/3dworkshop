/**
 * 予約完了画面（components/BookingSuccess.tsx）へ返す予約の列。
 *
 * ⚠ `*` や `customers(*)` で返さない。予約の id を知っていれば呼べるルートなので、
 *   顧客行のログイン用の列や、ワークショップ行の限定公開パスワードまで返すことになる。
 *   完了画面に項目を足すときは、ここに必要な列だけを足す。
 */
export const BOOKING_SUMMARY_COLUMNS =
  'id, workshop_id, customer_id, booking_date, booking_time, participants, companion_count, ' +
  'participant_choices, total_amount, discount_amount, status, ' +
  'workshop:workshops(title, price, participant_option), customer:customers(name, email)'
