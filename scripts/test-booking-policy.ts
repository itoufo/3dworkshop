import assert from 'node:assert/strict'
import { bookingDeadline, isBookingClosed, validShippingAddress, JAPAN_PREFECTURES } from '../lib/booking-policy'

assert.equal(bookingDeadline('2026-10-10', 5)?.toISOString(), '2026-10-04T15:00:00.000Z')
assert.equal(isBookingClosed('2026-10-10', 5, new Date('2026-10-04T14:59:59.999Z')), false)
assert.equal(isBookingClosed('2026-10-10', 5, new Date('2026-10-04T15:00:00Z')), true)
assert.equal(bookingDeadline('2027-01-03', 5)?.toISOString(), '2026-12-28T15:00:00.000Z')
assert.equal(bookingDeadline('2028-03-03', 5)?.toISOString(), '2028-02-26T15:00:00.000Z')
assert.equal(isBookingClosed('2026-10-10', 0, new Date('2026-10-20')), false)
assert.equal(isBookingClosed(null, 5), true)
assert.equal(JAPAN_PREFECTURES.length, 47)
const address = { shipping_postal_code: '113-0034', shipping_prefecture: '東京都', shipping_address: '文京区湯島3-14-8' }
assert.equal(validShippingAddress(address), true)
assert.equal(validShippingAddress({ ...address, shipping_postal_code: '1130034' }), true)
assert.equal(validShippingAddress({ ...address, shipping_postal_code: '12345' }), false)
assert.equal(validShippingAddress({ ...address, shipping_prefecture: '海外' }), false)
assert.equal(validShippingAddress({ ...address, shipping_address: '  ' }), false)
assert.equal(validShippingAddress({}), false)
console.log('予約締切・国内発送先住所の検証が完了しました')

// 最新mainの「予約0人の締切」と併用しても、発送の締切は人数に依存しない。
import { isSessionBookable } from '../lib/booking-deadline'
for (const totalParticipants of [0, 1, 10]) {
  const workshop = { booking_cutoff_days: 5 }
  const session = { event_date: '2026-10-10', event_time: '13:00' }
  const before = isSessionBookable({ workshop, session, totalParticipants, now: new Date('2026-10-04T14:59:59Z') })
  assert.equal(before.bookable, true)
  assert.equal(before.closesAt.toISOString(), '2026-10-04T15:00:00.000Z')
  const after = isSessionBookable({ workshop, session, totalParticipants, now: new Date('2026-10-04T15:00:00Z') })
  assert.equal(after.bookable, false)
  assert.equal(after.reason, 'shipping_cutoff')
}
