'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Workshop, WorkshopSession } from '@/types'
import { supabase } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import LoadingOverlay from '@/components/LoadingOverlay'
import FamilyFriendlyBadge from '@/components/FamilyFriendlyBadge'
import { Calendar, Clock, MapPin, Users, Shield, User, Mail, Phone, Tag, X, ArrowRight, ChevronDown } from 'lucide-react'
import { gaEvent, gaWorkshopItem, GA_CURRENCY } from '@/lib/gtag'
import { formatPrice, isFreePrice } from '@/lib/price'
import RememberCustomerInfo from '@/components/RememberCustomerInfo'
import { useCustomerProfile } from '@/lib/use-customer-profile'
import { getConsentTextFor } from '@/lib/consent-default'
import { sessionStartJst, zeroBookingCutoffJst, formatCutoffJst, formatCutoffJstEn } from '@/lib/booking-deadline'
import WorkshopRequestForm from '@/components/WorkshopRequestForm'
import { BOOKING_TEXT, type BookingText, type Locale } from '@/lib/i18n'

// 開始時刻（JST）を過ぎていない回。端末のタイムゾーンに左右されないよう JST で比べる
function getUpcomingSessions(w: Workshop): WorkshopSession[] {
  const now = Date.now()
  return (w.sessions ?? [])
    .filter(s => s.status === 'scheduled' && sessionStartJst(s).getTime() > now)
    .sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
      return (a.event_time || '').localeCompare(b.event_time || '')
    })
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// 学年から小学生以下（同伴者が必要な区分）を検出する
const ELEMENTARY_OR_YOUNGER_RE = /小|年長|年中|年少|幼|園|未就学/

const GRADE_OPTIONS = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3', '高1', '高2', '高3']

// 学年リストを人数に合わせて伸縮する（入力済みの値は保持）
function resizeGrades(list: string[], n: number): string[] {
  return Array.from({ length: n }, (_, i) => list[i] ?? '')
}

interface WorkshopBookingSectionProps {
  workshop: Workshop
  relatedWorkshops: Workshop[]
  isPastWorkshop: boolean
  /** 表示言語。英語ページ（/en）では 'en' */
  locale?: Locale
}

export default function WorkshopBookingSection({ workshop, relatedWorkshops, isPastWorkshop, locale = 'ja' }: WorkshopBookingSectionProps) {
  const t: BookingText = BOOKING_TEXT[locale]
  // 完了ページ（英語ページからの予約は /en/success）
  const successPath = locale === 'en' ? '/en/success' : '/success'
  const upcomingSessions = useMemo(() => getUpcomingSessions(workshop), [workshop])
  // 予約0人の締切を過ぎて受付終了になった回（参加者数が要るので API で確かめる）
  const [closedSessionIds, setClosedSessionIds] = useState<Set<string>>(new Set())
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    upcomingSessions[0]?.id ?? null
  )
  const selectedSession = useMemo(
    () =>
      upcomingSessions.find(s => s.id === selectedSessionId) ??
      upcomingSessions.find(s => !closedSessionIds.has(s.id)) ??
      upcomingSessions[0] ??
      null,
    [upcomingSessions, selectedSessionId, closedSessionIds]
  )

  // 0人締切の時刻を過ぎている回だけ、受付終了かどうかを問い合わせる（通常は直近の1〜2回）
  useEffect(() => {
    const now = Date.now()
    const candidates = upcomingSessions.filter(s => {
      const cutoff = zeroBookingCutoffJst(workshop, s)
      return cutoff && cutoff.getTime() <= now
    })
    if (candidates.length === 0) return
    let cancelled = false
    Promise.all(
      candidates.map(async s => {
        const params = new URLSearchParams({ workshopId: workshop.id, sessionId: s.id })
        const res = await fetch(`/api/check-availability?${params.toString()}`)
        if (!res.ok) return null
        const data = await res.json()
        return data?.is_closed ? s.id : null
      })
    )
      .then(ids => {
        if (cancelled) return
        const closed = new Set(ids.filter((id): id is string => !!id))
        setClosedSessionIds(closed)
        // 選んでいた回が締切済みなら、受付中の回に切り替える
        setSelectedSessionId(prev =>
          prev && closed.has(prev) ? upcomingSessions.find(s => !closed.has(s.id))?.id ?? prev : prev
        )
      })
      .catch(err => console.error('Error checking closed sessions:', err))
    return () => {
      cancelled = true
    }
  }, [upcomingSessions, workshop])

  const [booking, setBooking] = useState({
    participants: 1,
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    hasMinors: false,
    minorCount: 1,
    minorGrades: [''] as string[],
    // 同伴者（付き添いの保護者）: 親子向け日程でのみ1名まで無料・料金/定員に含めない
    companionCount: 0
  })
  const { remember, setRemember, hasSaved, persist, forget, fromAccount } = useCustomerProfile((saved) => {
    setBooking((b) => ({
      ...b,
      name: saved.name ?? b.name,
      email: saved.email ?? b.email,
      phone: saved.phone ?? b.phone,
      age: saved.age ?? b.age,
      gender: saved.gender ?? b.gender,
    }))
  })

  const [couponOpen, setCouponOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponValidation, setCouponValidation] = useState<{
    loading: boolean
    valid: boolean
    error?: string
    discount_amount?: number
    coupon?: {id: string; code: string; description?: string; discount_type: 'percentage' | 'fixed_amount'; discount_value: number}
  }>({ loading: false, valid: false })
  const [appliedCoupon, setAppliedCoupon] = useState<{id: string; code: string; description?: string; discount_type: 'percentage' | 'fixed_amount'; discount_value: number} | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [agreedToConsent, setAgreedToConsent] = useState(false)
  const consentText = useMemo(() => getConsentTextFor(workshop, locale), [workshop, locale])
  // GA4: モーダル離脱計測用。開いた(add_to_cart)のに決済(begin_checkout)へ進まず閉じたら離脱。
  const checkoutStartedRef = useRef(false)
  // GA4: フォームに一度でも触れたか。「開いただけ」と「入力したが送信手前で離脱」を分離する。
  const formStartedRef = useRef(false)
  const closeMethodRef = useRef<string>('unknown')
  const prevModalOpenRef = useRef(false)
  // モーダルを閉じる唯一の入口。閉じ方(× / 背景 / Esc)を記録してから閉じる。
  const requestClose = (method: string) => {
    closeMethodRef.current = method
    setModalOpen(false)
  }
  const [availability, setAvailability] = useState<{
    available_spots: number
    is_full: boolean
    manual_participants: number
    booked_participants: number
    total_participants?: number
    // 予約締切（開始時刻・予約0人の締切）
    is_closed?: boolean
    closes_at?: string | null
    close_reason?: 'started' | 'zero_booking_cutoff' | 'no_session' | null
    early_bird?: {
      enabled: boolean
      discount: number
      slots: number
      remaining: number
    } | null
  } | null>(null)

  // 満席か締切後なら申込を受け付けない
  const isClosed = !!availability?.is_closed
  const cannotBook = !!availability?.is_full || isClosed
  // 予約0人の回にだけ出す「◯月◯日 24:00 締切」。開始時刻より前に来るときだけ
  const zeroCutoffLabel = (() => {
    if (!availability || isClosed || (availability.total_participants ?? 1) > 0 || !selectedSession) return null
    const cutoff = zeroBookingCutoffJst(workshop, selectedSession)
    if (!cutoff || cutoff.getTime() >= sessionStartJst(selectedSession).getTime()) return null
    return locale === 'en' ? formatCutoffJstEn(cutoff) : formatCutoffJst(cutoff)
  })()

  // 参加費0円の回（無料の特別開催など）。Stripe は最低¥50のため決済自体を通さない
  const isFree = isFreePrice(workshop.price)

  // 早割: 残り組数がある間は「1名あたり割引 × 参加人数」を適用（金額の確定はサーバー側）
  const earlyBird = availability?.early_bird
  const earlyBirdActive = !!earlyBird && earlyBird.enabled && earlyBird.remaining > 0 && earlyBird.discount > 0
  const earlyBirdDiscount = earlyBirdActive ? earlyBird!.discount * booking.participants : 0

  // 親子向け日程かどうか。true のとき保護者の同伴が無料・定員外になる
  const isFamilySession = !!selectedSession?.is_family_friendly
  const hasElementary = booking.hasMinors && booking.minorGrades.some((g) => ELEMENTARY_OR_YOUNGER_RE.test(g))

  // 親子向け日程で小学生以下がいる場合は、同伴保護者を既定で1名（無料・定員外）立てる
  useEffect(() => {
    if (!isFamilySession || !hasElementary) return
    setBooking((prev) => (prev.companionCount === 0 ? { ...prev, companionCount: 1 } : prev))
  }, [isFamilySession, hasElementary])

  // 非親子向け日程では同伴者の無料枠がないため、同伴人数をリセット（参加人数に含める運用）
  useEffect(() => {
    if (isFamilySession) return
    setBooking((prev) => (prev.companionCount !== 0 ? { ...prev, companionCount: 0 } : prev))
  }, [isFamilySession])

  useEffect(() => {
    if (!isPastWorkshop) {
      fetchAvailability(workshop.id, selectedSession?.id ?? null)
    }
  }, [workshop.id, isPastWorkshop, selectedSession?.id])

  // モーダル表示中は背景スクロールを固定し、Escape で閉じる
  useEffect(() => {
    if (!modalOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose('escape')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [modalOpen])

  // GA4: モーダルを開いた→決済へ進まず閉じた 遷移で ws_booking_modal_abandon を1回送る。
  // 「キャンセル不可などの文言で決断直前に離脱していないか」を数値で検証するための計測。
  useEffect(() => {
    if (prevModalOpenRef.current && !modalOpen && !checkoutStartedRef.current) {
      gaEvent('ws_booking_modal_abandon', {
        workshop_id: workshop.id,
        method: closeMethodRef.current, // 'x_button' | 'backdrop' | 'escape' | 'unknown'
        participants: booking.participants,
        coupon_applied: !!appliedCoupon,
        value: workshop.price * booking.participants,
      })
    }
    prevModalOpenRef.current = modalOpen
  }, [modalOpen, workshop.id, workshop.price, booking.participants, appliedCoupon])

  // GA4: view_item（予約セクション表示を workshop ごとに1回）
  const viewItemSentRef = useRef<string | null>(null)
  useEffect(() => {
    if (isPastWorkshop) return
    if (viewItemSentRef.current === workshop.id) return
    viewItemSentRef.current = workshop.id
    gaEvent('view_item', {
      currency: GA_CURRENCY,
      value: workshop.price,
      items: [gaWorkshopItem(workshop)],
    })
  }, [workshop, isPastWorkshop])

  // GA4: 満席表示（構造的ゼロの可視化）。セッション単位で1回だけ送る
  const fullReportedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!availability?.is_full) return
    const key = selectedSession?.id ?? workshop.id
    if (fullReportedRef.current.has(key)) return
    fullReportedRef.current.add(key)
    gaEvent('ws_availability_full', {
      workshop_id: workshop.id,
      session_id: selectedSession?.id ?? null,
    })
  }, [availability?.is_full, selectedSession?.id, workshop.id])

  async function fetchAvailability(workshopId: string, sessionId: string | null) {
    try {
      const params = new URLSearchParams({ workshopId })
      if (sessionId) params.set('sessionId', sessionId)
      const response = await fetch(`/api/check-availability?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    }
  }

  async function validateCoupon() {
    if (!couponCode.trim()) return

    setCouponValidation({ loading: true, valid: false })

    try {
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          workshopId: workshop.id,
          amount: workshop.price * booking.participants,
          customerId: null
        })
      })

      const data = await response.json()

      gaEvent('ws_coupon_apply', {
        workshop_id: workshop.id,
        code: couponCode.trim(),
        valid: response.ok,
        discount: response.ok ? data.discount_amount : 0,
      })

      if (response.ok) {
        setCouponValidation({
          loading: false,
          valid: true,
          discount_amount: data.discount_amount,
          coupon: data.coupon
        })
        setAppliedCoupon(data.coupon)
      } else {
        setCouponValidation({
          loading: false,
          valid: false,
          // サーバーの文言は日本語なので、英語ページでは英文に置き換える
          error: t.useServerError ? data.error : 'This coupon code cannot be used.'
        })
      }
    } catch {
      setCouponValidation({
        loading: false,
        valid: false,
        error: t.couponCheckError
      })
    }
  }

  function removeCoupon() {
    setCouponCode('')
    setCouponValidation({ loading: false, valid: false })
    setAppliedCoupon(null)
  }

  // GA4: add_to_cart（「予約する」でモーダルを開く＝予約意図）
  const openBookingModal = () => {
    checkoutStartedRef.current = false
    formStartedRef.current = false
    closeMethodRef.current = 'unknown'
    gaEvent('add_to_cart', {
      currency: GA_CURRENCY,
      value: workshop.price * booking.participants,
      items: [gaWorkshopItem(workshop, booking.participants)],
    })
    setModalOpen(true)
  }

  // GA4: ws_form_start（モーダル内でフォームに最初に触れた1回だけ）。
  // add_to_cart(開いた) と begin_checkout(送信) の間を「入力に着手したか」で分解する。
  const handleFormStart = () => {
    if (formStartedRef.current) return
    formStartedRef.current = true
    gaEvent('ws_form_start', {
      workshop_id: workshop.id,
      currency: GA_CURRENCY,
      value: workshop.price * booking.participants,
    })
  }

  // GA4: ws_session_select（日程ラジオの選択）
  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    const s = upcomingSessions.find(x => x.id === sessionId)
    gaEvent('ws_session_select', {
      workshop_id: workshop.id,
      session_id: sessionId,
      event_date: s?.event_date,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (submitting || !agreedToConsent) return

    persist({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      age: booking.age,
      gender: booking.gender,
    })
    setSubmitting(true)

    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          email: booking.email,
          name: booking.name,
          phone: booking.phone,
          // 年齢・性別は収集対象のワークショップで入力があった場合のみ更新（未入力は不明のまま）
          ...(workshop.collect_demographics && booking.age ? { age: parseInt(booking.age) } : {}),
          ...(workshop.collect_demographics && booking.gender ? { gender: booking.gender } : {})
        }, {
          onConflict: 'email'
        })
        .select()
        .single()

      if (customerError) throw customerError

      const bookingDate = selectedSession?.event_date || workshop.event_date || new Date().toISOString().split('T')[0]
      const bookingTime = selectedSession?.event_time || workshop.event_time || '10:00'

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          workshop_id: workshop.id,
          session_id: selectedSession?.id || null,
          customer_id: customer.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          participants: booking.participants,
          total_amount: workshop.price * booking.participants,
          status: 'pending',
          payment_status: 'pending',
          minor_count: booking.hasMinors ? booking.minorCount : null,
          minor_grades: booking.hasMinors ? booking.minorGrades.filter(Boolean).join(', ') : null,
          // 同伴者は親子向け日程のみ無料・定員外。participants（＝料金/残席の基準）には含めない
          companion_count: isFamilySession ? booking.companionCount : 0,
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // 無料回は Stripe を通さず、その場で予約を確定して完了画面へ送る
      if (isFree) {
        const freeRes = await fetch('/api/create-free-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 同意の日時と本文はサーバー側で記録する
          body: JSON.stringify({ booking_id: bookingData.id, consent: agreedToConsent, locale }),
        })
        const freeData = await freeRes.json()

        if (freeRes.status === 409 && freeData?.code === 'booking_closed') {
          gaEvent('ws_booking_error', { workshop_id: workshop.id, step: 'closed' })
          alert(t.closedAlert(freeData.error))
          window.location.reload()
          return
        }
        if (!freeRes.ok || !freeData?.booking) {
          gaEvent('ws_booking_error', { workshop_id: workshop.id, step: 'free_confirm' })
          alert((t.useServerError && freeData?.error) || t.freeConfirmFailed)
          setSubmitting(false)
          return
        }

        // GA4: 有料回の begin_checkout と同じ地点（申込の確定操作）で計測する
        gaEvent('begin_checkout', {
          currency: GA_CURRENCY,
          value: 0,
          participants: booking.participants,
          items: [gaWorkshopItem(workshop, booking.participants)],
        })
        checkoutStartedRef.current = true

        window.location.href = `${successPath}?booking_id=${bookingData.id}`
        return
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshop_id: workshop.id,
          booking_id: bookingData.id,
          customer_email: booking.email,
          amount: workshop.price * booking.participants,
          participants: booking.participants,
          coupon_id: appliedCoupon?.id,
          discount_amount: couponValidation.discount_amount || 0,
          consent: agreedToConsent,
          locale,
        }),
      })

      const data = await response.json()
      const sessionId = data?.sessionId
      // セッション作成失敗を握りつぶさない（sessionId が無いまま先へ進むと
      // リダイレクトされず「処理中…」で固まるため、明示的にエラー化する）
      if (response.status === 409 && data?.code === 'booking_closed') {
        gaEvent('ws_booking_error', { workshop_id: workshop.id, step: 'closed' })
        alert(t.closedAlert(data.error))
        window.location.reload()
        return
      }
      if (!response.ok || !sessionId) {
        throw new Error(data?.error || t.checkoutCreateFailed)
      }

      // GA4: begin_checkout（Stripe へリダイレクトする直前）
      gaEvent('begin_checkout', {
        currency: GA_CURRENCY,
        value: workshop.price * booking.participants,
        coupon: appliedCoupon?.code,
        participants: booking.participants,
        items: [gaWorkshopItem(workshop, booking.participants)],
      })
      checkoutStartedRef.current = true // 決済へ進んだので離脱としてカウントしない

      const stripe = await stripePromise
      if (!stripe) throw new Error(t.stripeLoadFailed)
      // redirectToCheckout は失敗しても例外を投げず { error } を返すため戻り値を検証する
      const { error: redirectError } = await stripe.redirectToCheckout({ sessionId })
      if (redirectError) throw redirectError

    } catch (err) {
      console.error('Error creating booking', err)
      gaEvent('ws_booking_error', { workshop_id: workshop.id, step: 'checkout' })
      alert(t.bookingFailed)
      setSubmitting(false)
    }
  }

  if (isPastWorkshop) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 sticky top-24">
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 text-center mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">このワークショップは終了しました</h2>
          {(() => {
            const sessions = workshop.sessions ?? []
            const lastDate = sessions.length > 0
              ? sessions.map(s => s.event_date).sort().reverse()[0]
              : workshop.event_date || null
            return lastDate ? (
              <p className="text-sm text-gray-500">
                {new Date(`${lastDate}T00:00:00`).toLocaleDateString('ja-JP', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}に開催されました
              </p>
            ) : null
          })()}
        </div>

        {relatedWorkshops.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">次回の開催予定</h3>
            <div className="space-y-3">
              {relatedWorkshops.map((rw) => (
                <a
                  key={rw.id}
                  href={`/workshops/${rw.id}`}
                  className="block p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm mb-1">{rw.title}</p>
                  {rw.event_date && (
                    <p className="text-sm text-purple-600 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(rw.event_date).toLocaleDateString('ja-JP', {
                        month: 'long', day: 'numeric', weekday: 'short'
                      })}
                      {rw.event_time && ` ${rw.event_time.slice(0, 5)}〜`}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    詳細を見る <ArrowRight className="w-3 h-3 ml-1" />
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {workshop.category && (
          <div className="mt-6 text-center">
            <a
              href={`/workshops/category/${workshop.category.slug}`}
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              「{workshop.category.name}」の全日程を見る
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </div>
        )}
      </div>
    )
  }

  // 申し込める回が1つも残っていない（ISR のページが古く、開始済みの回しか持っていない場合も含む）。
  // 予約フォームは出さず、詳細ページの「リクエスト受付中」と同じ形でリクエストを受ける
  const hasSessions = (workshop.sessions ?? []).length > 0
  const noBookableSession = hasSessions
    ? upcomingSessions.every(s => closedSessionIds.has(s.id))
    : availability?.close_reason === 'no_session' || availability?.close_reason === 'started' ||
      availability?.close_reason === 'zero_booking_cutoff'
  if (noBookableSession) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24">
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full mb-3">
            {t.requestBadge}
          </span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t.requestTitle}</h3>
          <p className="text-sm text-gray-600">
            {t.requestBody}
          </p>
        </div>
        {/* リクエストフォームは日本語のみ。英語ページはメールでの問い合わせを案内する */}
        {locale === 'ja' && <WorkshopRequestForm workshopId={workshop.id} />}
      </div>
    )
  }

  return (
    <>
      {submitting && <LoadingOverlay message={isFree ? t.confirmingOverlay : t.redirectingOverlay} />}
      <div id="booking-form" className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-24">
        {/* Price Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 text-white">
          <p className="text-sm text-white/80 mb-1">{t.pricePerPerson}</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{formatPrice(workshop.price)}</span>
            {availability && (
              cannotBook ? (
                <span className="inline-flex items-center px-3 py-1 bg-red-500 rounded-full text-sm font-bold">
                  {isClosed ? t.closed : t.full}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  {t.spotsLeft(availability.available_spots)}
                </span>
              )
            )}
          </div>
          {earlyBirdActive && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium">
              <span>{t.earlyBirdBanner(earlyBird!.slots, earlyBird!.discount)}</span>
              <span className="ml-auto rounded-full bg-yellow-300 px-2 py-0.5 text-xs font-bold text-purple-900">
                {t.earlyBirdRemaining(earlyBird!.remaining)}
              </span>
            </div>
          )}
        </div>

        <div className="p-6">
        {/* Event Info Card */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">{t.eventInfo}</h3>
          <div className="space-y-3">
            {upcomingSessions.length >= 2 ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t.chooseDate}</p>
                <div className="space-y-2">
                  {upcomingSessions.map((s) => {
                    const dateLabel = t.sessionDate(s.event_date)
                    const timeLabel = s.event_time ? t.sessionStartTime(s.event_time.slice(0, 5)) : ''
                    const selected = s.id === selectedSession?.id
                    const closed = closedSessionIds.has(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center p-3 rounded-lg transition-all ${
                          closed
                            ? 'bg-gray-100 border-2 border-transparent opacity-60 cursor-not-allowed'
                            : selected
                              ? 'bg-white border-2 border-purple-500 shadow-sm cursor-pointer'
                              : 'bg-white/60 border-2 border-transparent hover:bg-white cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workshop-session"
                          value={s.id}
                          checked={selected && !closed}
                          disabled={closed}
                          onChange={() => handleSessionSelect(s.id)}
                          className="mr-3 accent-purple-600"
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium text-gray-900">{dateLabel}</div>
                          {timeLabel && <div className="text-gray-600 text-xs">{timeLabel}</div>}
                        </div>
                        {closed && (
                          <span className="ml-2 flex-shrink-0 rounded-full bg-gray-300 px-2 py-0.5 text-xs font-bold text-gray-700">
                            {t.closed}
                          </span>
                        )}
                        {s.is_family_friendly && <FamilyFriendlyBadge className="ml-2 flex-shrink-0" label={locale === 'en' ? 'Recommended for families' : undefined} />}
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : selectedSession ? (
              <>
                <div className="flex items-center text-sm text-gray-700">
                  <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                  <span className="font-medium text-gray-900">
                    {t.fullDate(selectedSession.event_date)}
                  </span>
                </div>
                {selectedSession.event_time && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="w-4 h-4 mr-2 text-purple-600" />
                    <span className="font-medium text-gray-900">
                      {t.startTimeWithDuration(selectedSession.event_time.slice(0, 5), workshop.duration)}
                    </span>
                  </div>
                )}
              </>
            ) : workshop.event_date ? (
              <div className="flex items-center text-sm text-gray-700">
                <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                <span className="font-medium text-gray-900">
                  {t.workshopDate(workshop.event_date)}
                </span>
              </div>
            ) : null}
            {isFamilySession && (
              <div className="flex items-start gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 px-3 py-2.5">
                <span aria-hidden className="text-xl leading-none">👨‍👩‍👧</span>
                <div className="text-sm leading-snug">
                  <p className="font-bold text-orange-700">{t.familyTitle}</p>
                  <p className="text-orange-800/80 text-xs mt-0.5">
                    {t.familyBody.before}<span className="font-bold">{t.familyBody.strong}</span>{t.familyBody.after}
                  </p>
                </div>
              </div>
            )}
            {workshop.location && (
              <div className="flex items-center text-sm text-gray-700">
                <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                <span className="font-medium text-gray-900">{workshop.location}</span>
              </div>
            )}
            <div className="flex items-center text-sm text-gray-700">
              <Users className="w-4 h-4 mr-2 text-purple-600" />
              <span className="font-medium text-gray-900">
                {t.capacity(workshop.max_participants)}
                {availability && (
                  <>
                    {cannotBook ? (
                      <span className="ml-2 text-red-600 font-bold">{t.capacityState(isClosed ? t.closed : t.full)}</span>
                    ) : (
                      <span className="ml-2 text-green-600">
                        {t.capacityLeft(availability.available_spots)}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            {zeroCutoffLabel && (
              <div className="flex items-center text-sm text-gray-700">
                <Clock className="w-4 h-4 mr-2 text-purple-600" />
                <span className="font-medium text-gray-900">{t.cutoff(zeroCutoffLabel)}</span>
              </div>
            )}
            {availability && availability.manual_participants > 0 && (
              <div className="text-xs text-orange-600 ml-6">
                {t.manualParticipants(availability.manual_participants)}
              </div>
            )}
          </div>
        </div>

        {isClosed ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-800 font-semibold mb-2">{t.closedTitle}</p>
            <p className="text-sm text-gray-600">
              {upcomingSessions.some(s => !closedSessionIds.has(s.id) && s.id !== selectedSession?.id)
                ? t.closedOther
                : t.closedNext}
            </p>
          </div>
        ) : availability?.is_full ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 font-semibold mb-2">{t.fullTitle}</p>
            <p className="text-sm text-red-600">{t.fullBody}</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={openBookingModal}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center"
            >
              <Calendar className="w-5 h-5 mr-2" />
              {t.book}
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>

            <div className="mt-4 space-y-1.5 text-xs text-gray-500">
              <div className="flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                {isFree ? t.noPayment : t.stripeSecure}
              </div>
              <div className="flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                {t.threeMinutes}
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {/* Booking Modal */}
      {modalOpen && !cannotBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => requestClose('backdrop')}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.formLabel}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.formLabel}</h2>
                {selectedSession && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.modalDate(selectedSession.event_date)}
                    {selectedSession.event_time ? t.modalTime(selectedSession.event_time.slice(0, 5)) : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => requestClose('x_button')}
                aria-label={t.close}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
        {/* 冒頭サマリ: 開いた瞬間に「価格・残席・所要・（親子回は同伴無料）」を提示し、
            入力に進む理由を先に見せる（開いて即離脱の対策） */}
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 p-4">
          <div className="flex items-end justify-between">
            <span className="text-sm text-gray-600">{t.pricePerPerson}</span>
            <span className="text-2xl font-black text-gray-900">{formatPrice(workshop.price)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {workshop.duration ? (
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-gray-700">
                <Clock className="w-3.5 h-3.5 mr-1 text-purple-500" />{t.duration(workshop.duration)}
              </span>
            ) : null}
            {availability && !availability.is_full && (
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-gray-700">
                <Users className="w-3.5 h-3.5 mr-1 text-purple-500" />{t.spotsLeft(availability.available_spots)}
              </span>
            )}
            {earlyBirdActive && (
              <span className="inline-flex items-center rounded-full bg-pink-100 text-pink-700 px-3 py-1 font-bold">
                {t.earlyBirdChip(earlyBird!.discount)}
              </span>
            )}
            {isFamilySession && (
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 font-bold">
                {t.companionFreeChip}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {isFree
              ? t.introFree
              : t.introPaid}
          </p>
        </div>
        <form onSubmit={handleSubmit} onFocus={handleFormStart} className="space-y-4">
          {/* Participants */}
          <div>
            <label htmlFor="booking-participants" className="block text-sm font-medium text-gray-700 mb-2">
              {t.participants}
            </label>
            <select
              id="booking-participants"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
              value={booking.participants}
              onChange={(e) => {
                const p = parseInt(e.target.value)
                const c = Math.min(booking.minorCount, p)
                setBooking({ ...booking, participants: p, minorCount: c, minorGrades: resizeGrades(booking.minorGrades, c) })
              }}
            >
              {[...Array(Math.min(availability?.available_spots || workshop.max_participants, 5))].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {t.people(i + 1)}
                </option>
              ))}
            </select>
            {isFamilySession ? (
              <p className="mt-2 text-xs text-gray-500">
                {t.participantsHelpFamily}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                {t.participantsHelp}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="booking-name" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              {t.name}
            </label>
            <input
              id="booking-name"
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
              value={booking.name}
              onChange={(e) => setBooking({ ...booking, name: e.target.value })}
              placeholder={t.namePlaceholder}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="booking-email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              {t.email}
            </label>
            <input
              id="booking-email"
              type="email"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
              value={booking.email}
              onChange={(e) => setBooking({ ...booking, email: e.target.value })}
              placeholder="example@email.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="booking-phone" className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              {t.phone}
            </label>
            <input
              id="booking-phone"
              type="tel"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
              value={booking.phone}
              onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
              placeholder={t.phonePlaceholder}
            />
          </div>

          {/* 高校生以下の参加者 */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <label htmlFor="booking-has-minors" className="flex items-center cursor-pointer">
              <input
                id="booking-has-minors"
                type="checkbox"
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                checked={booking.hasMinors}
                onChange={(e) => setBooking({ ...booking, hasMinors: e.target.checked })}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">{t.hasMinors}</span>
            </label>

            {booking.hasMinors && (
              <>
                <div>
                  <label htmlFor="booking-minor-count" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.minorCount}
                  </label>
                  <select
                    id="booking-minor-count"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                    value={booking.minorCount}
                    onChange={(e) => {
                      const c = parseInt(e.target.value)
                      setBooking({ ...booking, minorCount: c, minorGrades: resizeGrades(booking.minorGrades, c) })
                    }}
                  >
                    {[...Array(booking.participants)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {t.people(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">{t.grade}</span>
                  <div className="space-y-3">
                    {booking.minorGrades.map((grade, i) => (
                      <div key={i}>
                        {booking.minorCount > 1 && (
                          <label htmlFor={`booking-minor-grade-${i}`} className="block text-xs text-gray-500 mb-1">
                            {t.nthPerson(i + 1)}
                          </label>
                        )}
                        <select
                          id={`booking-minor-grade-${i}`}
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                          value={grade}
                          onChange={(e) => {
                            const next = [...booking.minorGrades]
                            next[i] = e.target.value
                            setBooking({ ...booking, minorGrades: next })
                          }}
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {t.gradeLabel(g)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  {t.minorsNote}
                </p>

                {hasElementary && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    {isFamilySession
                      ? t.elementaryFamily
                      : t.elementary}
                  </div>
                )}
              </>
            )}

            {/* 同伴者（付き添いの保護者）: 親子向け日程のみ 1名まで無料・定員外 */}
            {isFamilySession && (
              <div className="pt-2 border-t border-gray-100">
                <label htmlFor="booking-companion-count" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.companion}
                  <span className="ml-2 text-xs font-normal text-purple-700">{t.companionTag}</span>
                </label>
                <select
                  id="booking-companion-count"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                  value={booking.companionCount}
                  onChange={(e) => setBooking({ ...booking, companionCount: parseInt(e.target.value) })}
                >
                  <option value={0}>{t.none}</option>
                  <option value={1}>{t.onePerson}</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  {t.companionHelp}
                </p>
              </div>
            )}
          </div>

          {/* Age and Gender (収集対象のワークショップのみ・任意) */}
          {workshop.collect_demographics && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="booking-age" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.age}
                </label>
                <input
                  id="booking-age"
                  type="number"
                  min="1"
                  max="150"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                  value={booking.age}
                  onChange={(e) => setBooking({ ...booking, age: e.target.value })}
                  placeholder="25"
                />
              </div>

              <div>
                <label htmlFor="booking-gender" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.gender}
                </label>
                <select
                  id="booking-gender"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                  value={booking.gender}
                  onChange={(e) => setBooking({ ...booking, gender: e.target.value })}
                >
                  <option value="">{t.genderNone}</option>
                  <option value="male">{t.genderMale}</option>
                  <option value="female">{t.genderFemale}</option>
                  <option value="other">{t.genderOther}</option>
                  <option value="prefer_not_to_say">{t.genderNoAnswer}</option>
                </select>
              </div>
            </div>
          )}

          {/* Coupon Code (アコーディオン)。無料回は割引対象が無いので出さない */}
          {!isFree && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setCouponOpen(!couponOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>
                <Tag className="w-4 h-4 inline mr-1" />
                {t.couponToggle}
                {appliedCoupon && (
                  <span className="ml-2 text-green-600 font-normal">{t.couponApplied(appliedCoupon.code)}</span>
                )}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  couponOpen || appliedCoupon ? 'rotate-180' : ''
                }`}
              />
            </button>
            {(couponOpen || appliedCoupon) && (
              <div className="px-4 pb-4">
                {!appliedCoupon ? (
                  <div className="flex space-x-2">
                    <input
                      id="booking-coupon"
                      type="text"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="SUMMER2024"
                    />
                    <button
                      type="button"
                      onClick={validateCoupon}
                      disabled={!couponCode.trim() || couponValidation.loading}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {couponValidation.loading ? t.couponChecking : t.couponApply}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        ✓ {appliedCoupon.code} - {appliedCoupon.description || t.couponDefaultDescription}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {appliedCoupon.discount_type === 'percentage'
                          ? t.couponPercent(appliedCoupon.discount_value)
                          : t.couponFixed(appliedCoupon.discount_value)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {couponValidation.error && (
                  <p className="text-sm text-red-600 mt-2">{couponValidation.error}</p>
                )}
              </div>
            )}
          </div>
          )}

          {/* Price Summary */}
          <div className="border-t border-gray-200 pt-6">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t.priceTimes(booking.participants)}</span>
                <span className="text-lg text-gray-900">
                  {formatPrice(workshop.price * booking.participants)}
                </span>
              </div>
              {isFamilySession && booking.companionCount > 0 && (
                <div className="flex justify-between items-center text-purple-700">
                  <span>{t.companionLine(booking.companionCount)}</span>
                  <span>{t.free}</span>
                </div>
              )}
              {earlyBirdActive && (
                <div className="flex justify-between items-center text-pink-600">
                  <span>{t.earlyBirdLine(earlyBird!.discount, booking.participants)}</span>
                  <span>-¥{earlyBirdDiscount.toLocaleString()}</span>
                </div>
              )}
              {couponValidation.valid && couponValidation.discount_amount && (
                <div className="flex justify-between items-center text-green-600">
                  <span>{t.couponLine}</span>
                  <span>-¥{couponValidation.discount_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-900 font-semibold">{t.total}</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(Math.max(0, (workshop.price * booking.participants) - earlyBirdDiscount - (couponValidation.discount_amount || 0)))}
                </span>
              </div>
            </div>
            <div className="mb-6">
              <RememberCustomerInfo
                remember={remember}
                onChange={setRemember}
                hasSaved={hasSaved}
                onForget={forget}
                fromAccount={fromAccount}
                locale={locale}
              />
            </div>

            <div className="space-y-1 mb-6">
              <p className="text-xs text-gray-500">
                {isFree
                  ? t.noteFreeIncluded
                  : t.noteIncluded}
              </p>
              <p className="text-xs text-gray-500">
                {isFree
                  ? t.noteFreeCancel
                  : t.noteCancel}
              </p>
            </div>

            {/* 参加同意書 */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-800 mb-2">{t.consentTitle}</p>
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                {consentText}
              </div>
              <label className="mt-3 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreedToConsent}
                  onChange={(e) => setAgreedToConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 text-purple-600 border-2 border-gray-400 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-gray-700">
                  {t.consentAgree} <span className="text-red-500 font-bold">*</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !agreedToConsent}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t.processing : isFree ? t.confirmBooking : t.proceedToPayment}
            </button>
            {!agreedToConsent && !submitting && (
              <p className="mt-2 text-center text-sm text-gray-600">
                {t.consentHint}
              </p>
            )}

            <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
              <Shield className="w-4 h-4 mr-1" />
              {isFree ? t.noPaymentShort : t.stripeSecure}
            </div>
          </div>
        </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating Booking Button (Mobile Only) */}
      {!cannotBook && !modalOpen && (
        <button
          onClick={openBookingModal}
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center space-x-2 font-semibold"
        >
          <Calendar className="w-5 h-5" />
          <span>{t.book}</span>
        </button>
      )}
    </>
  )
}
