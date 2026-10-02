/**
 * 1回の予約で申し込める人数の上限。
 * 予約フォームの人数の選択肢（components/WorkshopBookingSection.tsx）と、
 * 仮予約を作る API（app/api/create-booking/route.ts）の両方がここから取る。
 * ⚠ 片方だけ変えない。画面で選べる人数を API が断ることになる。
 */
export const MAX_PARTICIPANTS_PER_BOOKING = 5
