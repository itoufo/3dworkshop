/**
 * 英語ページ（/en）用の文言と日付表記。
 *
 * 対象は予約フォームなど、日本語ページと英語ページで同じ部品を使う箇所だけ。
 * ⚠ 'ja' の文言は既存の日本語ページの表示と1文字も変えないこと（ここを直すと日本語ページが変わる）。
 *   ページ固有の英文（/en のトップ・FAQ 等）はそれぞれのページに直接書く。
 */

export type Locale = 'ja' | 'en'

export function toLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'ja'
}

/** 日本語ページのパス → 英語ページのパス（英語版があるものだけ）。なければ null */
export function englishPathFor(pathname: string, englishWorkshopIds?: ReadonlySet<string>): string | null {
  if (pathname === '/') return '/en'
  if (pathname === '/workshops') return '/en/workshops'
  if (pathname === '/faq') return '/en/faq'
  const m = pathname.match(/^\/workshops\/([0-9a-f-]{36})$/)
  if (m && (!englishWorkshopIds || englishWorkshopIds.has(m[1]))) return `/en/workshops/${m[1]}`
  return null
}

/** 英語ページのパス → 日本語ページのパス */
export function japanesePathFor(pathname: string): string {
  if (pathname === '/en' || pathname === '/en/') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice(3)
  return pathname
}

// ============ 日付（JST の 'YYYY-MM-DD' 文字列から作る） ============

const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EN_WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const EN_MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parts(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return { y, m, d, wd }
}

/** 'Sat, Oct 10' */
export function enDateShort(date: string): string {
  const { m, d, wd } = parts(date)
  return `${EN_WEEKDAYS[wd]}, ${EN_MONTHS[m - 1]} ${d}`
}

/** 'Saturday, October 10, 2026' */
export function enDateLong(date: string): string {
  const { y, m, d, wd } = parts(date)
  return `${EN_WEEKDAYS_LONG[wd]}, ${EN_MONTHS_LONG[m - 1]} ${d}, ${y}`
}

/** 'Sat, Oct 10, 2026' */
export function enDateMedium(date: string): string {
  const { y, m, d, wd } = parts(date)
  return `${EN_WEEKDAYS[wd]}, ${EN_MONTHS[m - 1]} ${d}, ${y}`
}

export function enWeekday(date: string): string {
  return EN_WEEKDAYS[parts(date).wd]
}

// ============ 予約フォームの文言 ============

/** 学年の英語表記。値（DB に入る文字列）は日本語のまま変えない */
export const GRADE_LABELS_EN: Record<string, string> = {
  小1: 'Elementary, grade 1', 小2: 'Elementary, grade 2', 小3: 'Elementary, grade 3',
  小4: 'Elementary, grade 4', 小5: 'Elementary, grade 5', 小6: 'Elementary, grade 6',
  中1: 'Junior high, year 1', 中2: 'Junior high, year 2', 中3: 'Junior high, year 3',
  高1: 'High school, year 1', 高2: 'High school, year 2', 高3: 'High school, year 3',
}

export const BOOKING_TEXT = {
  ja: {
    couponCheckError: 'クーポンの検証中にエラーが発生しました',
    closedAlert: (serverMessage: string) => `${serverMessage}。ほかの日程をお選びください。`,
    seatsUnavailable: (serverMessage?: string) =>
      `${serverMessage || '満席のためお申し込みいただけません'}。ページを再読み込みしますので、空席をご確認ください。`,
    freeConfirmFailed: '予約の確定に失敗しました。お手数ですが、少し時間をおいて再度お試しください。',
    checkoutCreateFailed: '決済ページの作成に失敗しました',
    stripeLoadFailed: '決済モジュールの読み込みに失敗しました',
    bookingFailed: '予約の作成中にエラーが発生しました。お手数ですが、少し時間をおいて再度お試しください。',
    useServerError: true,
    requestBadge: '開催リクエスト受付中',
    requestTitle: '開催日程をリクエスト',
    requestBody: '現在受付中の日程はありません。ご希望の日程や条件をお送りください。開催可能になりましたらメールでお知らせします。',
    confirmingOverlay: '予約を確定しています...',
    redirectingOverlay: '決済画面へ移動しています...',
    pricePerPerson: '参加費（1名あたり）',
    closed: '受付終了',
    full: '満席',
    spotsLeft: (n: number) => `残り${n}名`,
    earlyBirdBanner: (slots: number, discount: number) => `🎉 早割 先着${slots}組・1名¥${discount.toLocaleString()}引き`,
    earlyBirdRemaining: (n: number) => `残り${n}組`,
    eventInfo: '開催情報',
    chooseDate: '開催日程を選択',
    sessionDate: (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }),
    sessionStartTime: (hhmm: string) => `${hhmm} 開始`,
    fullDate: (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    workshopDate: (date: string) =>
      new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    startTimeWithDuration: (hhmm: string, duration: number | null | undefined) =>
      `${hhmm} 開始${duration ? `（${duration}分間）` : ''}`,
    familyTitle: '親子におすすめの回です',
    familyBody: { before: '保護者1名の同伴が', strong: '無料', after: '・定員に含みません。お子様の人数だけでご予約ください。' },
    capacity: (n: number) => `定員 ${n}名`,
    capacityState: (state: string) => `（${state}）`,
    capacityLeft: (n: number) => `（残り${n}名）`,
    cutoff: (label: string) => `申込締切 ${label}`,
    manualParticipants: (n: number) => `※ 他媒体からの予約: ${n}名`,
    closedTitle: 'この回の受付は終了しました',
    closedOther: 'ほかの日程をお選びください。',
    closedNext: '次回の開催をお待ちください。',
    fullTitle: 'このワークショップは満席です',
    fullBody: 'キャンセル待ちをご希望の場合は、お問い合わせください。',
    book: '予約する',
    noPayment: '参加費はかかりません（お支払いなし）',
    stripeSecure: '安全な決済はStripeで処理されます',
    threeMinutes: 'ご予約は約3分で完了します',
    formLabel: '予約フォーム',
    modalDate: (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
    modalTime: (hhmm: string) => ` ${hhmm}〜`,
    close: '閉じる',
    duration: (n: number) => `所要 ${n}分`,
    earlyBirdChip: (discount: number) => `早割 1名¥${discount.toLocaleString()}引き`,
    companionFreeChip: '👨‍👩‍👧 保護者同伴 無料',
    introFree: '下記フォームにご入力のうえ、そのままご予約を確定してください（所要1〜2分・お支払いはありません）。',
    introPaid: '下記フォームにご入力のうえ、決済へお進みください（所要1〜2分）。',
    participants: '参加人数',
    people: (n: number) => `${n}名`,
    participantsHelpFamily: '制作にご参加される方の人数です。付き添いのみの保護者は含めず、下の「同伴者（付き添い）」でご指定ください（1名まで無料）。',
    participantsHelp: '付き添いの保護者も参加される場合は、この参加人数に含めてください（1名につき1席分の料金がかかります）。',
    name: 'お名前',
    namePlaceholder: '山田 太郎',
    email: 'メールアドレス',
    phone: '電話番号',
    phonePlaceholder: '090-1234-5678',
    hasMinors: '高校生以下の参加者が含まれる',
    minorCount: '高校生以下の人数',
    grade: '学年',
    nthPerson: (n: number) => `${n}人目`,
    selectPlaceholder: '選択してください',
    gradeLabel: (g: string) => g,
    minorsNote: '※参加対象は小学生以上です。未就学のお子様はご参加いただけません。',
    elementaryFamily: '小学生の参加者がいる場合、保護者1名の付き添いが必要です。この日程は親子向けのため、付き添いの保護者1名は無料・定員外です（下の「同伴者（付き添い）」でご指定ください）。',
    elementary: '小学生の参加者がいる場合、保護者の付き添いが必要です。付き添いの保護者も上の「参加人数」に含めてください（1名につき1席分の料金がかかります）。',
    companion: '同伴者（付き添いの保護者）',
    companionTag: '親子向け日程・無料',
    none: 'なし',
    onePerson: '1名',
    companionHelp: 'ご自身は制作せず、付き添いのみの保護者の方です。1名まで無料で、上の「参加人数」（料金・残席）には含めません。2名以上で付き添われる場合は、2人目以降を「参加人数」に含めてください。',
    age: '年齢',
    gender: '性別',
    genderNone: '選択しない',
    genderMale: '男性',
    genderFemale: '女性',
    genderOther: 'その他',
    genderNoAnswer: '回答しない',
    couponToggle: 'クーポンコードをお持ちの方',
    couponApplied: (code: string) => `✓ ${code} 適用中`,
    couponChecking: '検証中...',
    couponApply: '適用',
    couponDefaultDescription: 'クーポンが適用されました',
    couponPercent: (v: number) => `${v}%割引`,
    couponFixed: (v: number) => `¥${v.toLocaleString()}割引`,
    priceTimes: (n: number) => `参加費 × ${n}名`,
    // 参加者ごとの選択肢（例: 塗るフィギュア）。label は管理画面で入れた名前
    choiceLabel: (label: string, n: number, total: number) => (total > 1 ? `${label}（${n}人目）` : label),
    choicePlaceholder: '選択してください',
    choiceNoExtra: '追加料金なし',
    choiceOption: (label: string, price: string) => `${label}（${price}）`,
    choicesChanged: '選べる内容が更新されました。ページを再読み込みしますので、お手数ですがもう一度お申し込みください。',
    choiceLine: (label: string, n: number) => `${label} × ${n}`,
    companionLine: (n: number) => `同伴者（付き添い）× ${n}名`,
    free: '無料',
    earlyBirdLine: (discount: number, n: number) => `早割（1名¥${discount.toLocaleString()}引き × ${n}名）`,
    couponLine: 'クーポン割引',
    total: '合計金額',
    noteFreeIncluded: '※ 参加費・材料費ともに無料です。当日のお支払いはありません',
    noteIncluded: '※ 料金には材料費・設備使用料が含まれています',
    noteFreeCancel: '※ ご都合が悪くなった場合は、席をお譲りできるようお早めにご連絡ください',
    noteCancel: '※ 開催日の前日まで無料でキャンセル・全額返金いたします',
    consentTitle: '参加同意書',
    consentAgree: '参加同意書の内容を確認し、同意します',
    processing: '処理中...',
    confirmBooking: '予約を確定する',
    proceedToPayment: '決済画面へ進む',
    consentHint: '参加同意書の「同意します」にチェックすると進めます',
    noPaymentShort: 'お支払いは発生しません',
  },
  en: {
    couponCheckError: 'Something went wrong while checking the coupon.',
    closedAlert: () => 'Booking for this date has closed. Please choose another date.',
    seatsUnavailable: () => 'There are not enough seats left for this date. The page will reload so you can check availability.',
    freeConfirmFailed: 'We could not confirm your booking. Please wait a moment and try again.',
    checkoutCreateFailed: 'We could not open the payment page.',
    stripeLoadFailed: 'We could not load the payment module.',
    bookingFailed: 'Something went wrong while creating your booking. Please wait a moment and try again.',
    // サーバーの日本語メッセージは英語ページでは出さない（上の英文に置き換える）
    useServerError: false,
    requestBadge: 'No open dates',
    requestTitle: 'No dates are open right now',
    requestBody: 'There are no dates open for booking at the moment. To ask about upcoming dates, email us at 3dlab@sunu25.com.',
    confirmingOverlay: 'Confirming your booking...',
    redirectingOverlay: 'Taking you to the payment page...',
    pricePerPerson: 'Price per person',
    closed: 'Closed',
    full: 'Full',
    spotsLeft: (n: number) => `${n} ${n === 1 ? 'spot' : 'spots'} left`,
    earlyBirdBanner: (slots: number, discount: number) =>
      `🎉 Early bird: first ${slots} bookings get ¥${discount.toLocaleString()} off per person`,
    earlyBirdRemaining: (n: number) => `${n} left`,
    eventInfo: 'Date & details',
    chooseDate: 'Choose a date',
    sessionDate: (date: string) => enDateShort(date),
    sessionStartTime: (hhmm: string) => `Starts ${hhmm} (JST)`,
    fullDate: (date: string) => enDateLong(date),
    workshopDate: (date: string) => enDateLong(date),
    startTimeWithDuration: (hhmm: string, duration: number | null | undefined) =>
      `Starts ${hhmm} (JST)${duration ? ` · ${duration} min` : ''}`,
    familyTitle: 'Recommended for families',
    familyBody: { before: 'One accompanying parent is ', strong: 'free', after: ' and does not take a seat. Please book for the children only.' },
    capacity: (n: number) => `Capacity ${n}`,
    capacityState: (state: string) => `(${state})`,
    capacityLeft: (n: number) => `(${n} ${n === 1 ? 'spot' : 'spots'} left)`,
    cutoff: (label: string) => `Booking closes ${label} (JST)`,
    manualParticipants: (n: number) => `* Booked through other sites: ${n}`,
    closedTitle: 'Booking for this date has closed',
    closedOther: 'Please choose another date.',
    closedNext: 'Please check back for the next date.',
    fullTitle: 'This workshop is fully booked',
    fullBody: 'To join the waiting list, email us at 3dlab@sunu25.com.',
    book: 'Book now',
    noPayment: 'Free of charge (no payment)',
    stripeSecure: 'Payments are processed securely by Stripe',
    threeMinutes: 'Booking takes about 3 minutes',
    formLabel: 'Booking form',
    modalDate: (date: string) => enDateMedium(date),
    modalTime: (hhmm: string) => `, ${hhmm} (JST)`,
    close: 'Close',
    duration: (n: number) => `${n} min`,
    earlyBirdChip: (discount: number) => `Early bird ¥${discount.toLocaleString()} off per person`,
    companionFreeChip: '👨‍👩‍👧 Parent joins free',
    introFree: 'Fill in the form below to confirm your booking (takes 1–2 minutes, no payment needed).',
    introPaid: 'Fill in the form below, then continue to payment (takes 1–2 minutes).',
    participants: 'Number of participants',
    people: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
    participantsHelpFamily: 'The number of people making a figure. Do not include a parent who only accompanies; add them under "Accompanying parent" below (one parent is free).',
    participantsHelp: 'If an accompanying parent will also take part, include them in this number (each person is charged one seat).',
    name: 'Name',
    namePlaceholder: 'Your full name',
    email: 'Email',
    phone: 'Phone number',
    phonePlaceholder: '+81 90-1234-5678',
    hasMinors: 'Some participants are high school age or younger',
    minorCount: 'Number of participants high school age or younger',
    grade: 'School grade',
    nthPerson: (n: number) => `Participant ${n}`,
    selectPlaceholder: 'Please select',
    gradeLabel: (g: string) => GRADE_LABELS_EN[g] ?? g,
    minorsNote: '* Participants must be elementary school age or older. Preschool children cannot take part.',
    elementaryFamily: 'Elementary school participants must be accompanied by a parent. On this family date, one accompanying parent is free and does not take a seat (add them under "Accompanying parent" below).',
    elementary: 'Elementary school participants must be accompanied by a parent. Please include the accompanying parent in "Number of participants" above (each person is charged one seat).',
    companion: 'Accompanying parent',
    companionTag: 'Family date · free',
    none: 'None',
    onePerson: '1 person',
    companionHelp: 'A parent who only accompanies and does not make a figure. One is free and is not counted in "Number of participants" (price and seats). If two or more adults accompany, include the second and any others in "Number of participants".',
    age: 'Age',
    gender: 'Gender',
    genderNone: 'Not selected',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    genderNoAnswer: 'Prefer not to say',
    couponToggle: 'Have a coupon code?',
    couponApplied: (code: string) => `✓ ${code} applied`,
    couponChecking: 'Checking...',
    couponApply: 'Apply',
    couponDefaultDescription: 'Coupon applied',
    couponPercent: (v: number) => `${v}% off`,
    couponFixed: (v: number) => `¥${v.toLocaleString()} off`,
    priceTimes: (n: number) => `Price × ${n}`,
    choiceLabel: (label: string, n: number, total: number) => (total > 1 ? `${label} (person ${n})` : label),
    choicePlaceholder: 'Please select',
    choiceNoExtra: 'no extra charge',
    choiceOption: (label: string, price: string) => `${label} (${price})`,
    choicesChanged: 'The options for this workshop have been updated. The page will reload — please book again.',
    choiceLine: (label: string, n: number) => `${label} × ${n}`,
    companionLine: (n: number) => `Accompanying parent × ${n}`,
    free: 'Free',
    earlyBirdLine: (discount: number, n: number) => `Early bird (¥${discount.toLocaleString()} off × ${n})`,
    couponLine: 'Coupon discount',
    total: 'Total',
    noteFreeIncluded: '* Participation and materials are free. There is nothing to pay on the day.',
    noteIncluded: '* The price includes materials and equipment use.',
    noteFreeCancel: '* If you can no longer attend, please let us know early so someone else can take your seat.',
    noteCancel: '* Free cancellation with a full refund until the day before the event.',
    consentTitle: 'Participation agreement',
    consentAgree: 'I have read and agree to the participation agreement',
    processing: 'Processing...',
    confirmBooking: 'Confirm booking',
    proceedToPayment: 'Continue to payment',
    consentHint: 'Check "I agree" on the participation agreement to continue',
    noPaymentShort: 'No payment is required',
  },
}

export type BookingText = (typeof BOOKING_TEXT)['ja']
