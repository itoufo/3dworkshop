'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Upload, Loader2, AlertTriangle, Info, Download, Package, Image as ImageIcon, Type, Shapes, Circle } from 'lucide-react'
import RememberCustomerInfo from '@/components/RememberCustomerInfo'
import { useCustomerProfile } from '@/lib/use-customer-profile'
import { DEFAULT_PARAMS, PARAM_LIMITS, type CutterParams } from '@/lib/cookie-cutter/params'
import { buildCutterMesh, type BuiltCutter } from '@/lib/cookie-cutter/mesh'
import { validateContours, isBlocking, type CutterWarning } from '@/lib/cookie-cutter/validate'
import { normalizeContoursToSize, type Polygon } from '@/lib/cookie-cutter/polygon'
import {
  traceImage,
  downscaleImageData,
  autoThreshold,
  hasTransparency,
  flipY,
  DEFAULT_TRACE_OPTIONS,
  type TraceOptions,
} from '@/lib/cookie-cutter/trace'
import {
  svgTextToImageData,
  iconPathToImageData,
  textToImageData,
  loadCutterFont,
  CUTTER_FONTS,
  SvgParseError,
} from '@/lib/cookie-cutter/sources'
import type { CutterIcon } from '@/lib/cookie-cutter/icons'
import PresetPicker from '@/components/cookie-cutter/PresetPicker'
import type { CutterPreset } from '@/lib/cookie-cutter/presets'
import {
  CUTTER_DOWNLOAD_PRICE,
  CUTTER_PRINT_PRICE,
  DOWNLOAD_VALID_DAYS,
  type CutterOrderKind,
} from '@/lib/cookie-cutter/pricing'
import { SHIPPING_FEE, SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'

/**
 * アイコンの一覧は形のデータ（122個ぶんのパス）を抱えていて重い。
 * 「アイコン」を選んだ人だけが読み込むよう、必要になってから取りに行く。
 */
const IconPicker = dynamic(() => import('@/components/cookie-cutter/IconPicker'), {
  ssr: false,
  loading: () => (
    <p className="flex items-center gap-2 py-8 justify-center text-base text-gray-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      アイコンを読み込んでいます…
    </p>
  ),
})

// three.js はサーバーでは動かないので、ブラウザに届いてから読み込む
const CutterPreview3D = dynamic(() => import('@/components/CutterPreview3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
})

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_SVG_BYTES = 2 * 1024 * 1024

/** 型の元をどこから作るか */
type Source = 'preset' | 'upload' | 'text' | 'icon'

/**
 * 文字のときの既定値。
 *
 * 1文字ずつが別の刃になるので、ふちが1枚につながらないと型がバラバラになる。
 * かといって字を重ねるほど詰めると字が読めなくなるため、
 * 「字は読める間隔のまま、ふちを広くしてつなぐ」を既定にする。実際の名前型もこの作り。
 */
const TEXT_LETTER_SPACING = -0.08
const TEXT_FLANGE_WIDTH_MM = 5
/** 1文字あたりの目安の大きさ。小さいと線と線のすき間から生地が抜けない */
const TEXT_SIZE_PER_CHAR_MM = 30

const SOURCE_TABS: { key: Source; label: string; icon: typeof ImageIcon }[] = [
  { key: 'preset', label: 'きほんの形', icon: Circle },
  { key: 'upload', label: '絵・写真', icon: ImageIcon },
  { key: 'text', label: '文字', icon: Type },
  { key: 'icon', label: 'アイコン', icon: Shapes },
]

export default function CookieCutterStudio() {
  const [source, setSource] = useState<Source>('preset')

  // どの入口から作っても、いったんこの画像に落としてから輪郭を取る
  const [image, setImage] = useState<ImageData | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 文字から作るとき
  const [text, setText] = useState('')
  const [fontIndex, setFontIndex] = useState(0)
  const [letterSpacing, setLetterSpacing] = useState(TEXT_LETTER_SPACING)

  // アイコンから作るとき
  const [icon, setIcon] = useState<CutterIcon | null>(null)

  // きほんの形から作るとき
  const [preset, setPreset] = useState<CutterPreset | null>(null)

  /**
   * 型のもとになる輪郭。Y上向き、大きさは未確定。
   * 画像からは輪郭抽出を通して、きほんの形は計算した輪郭をそのまま入れる
   * （見本は計算で作った正確な形なので、画像に落として拾い直すと角が甘くなる）
   */
  const [rawContours, setRawContours] = useState<Polygon[] | null>(null)

  const [traceOptions, setTraceOptions] = useState<TraceOptions>(DEFAULT_TRACE_OPTIONS)
  const [params, setParams] = useState<CutterParams>(DEFAULT_PARAMS)
  /** 利用者が大きさを自分で動かしたか。動かしたあとは勝手に変えない */
  const [sizeTouched, setSizeTouched] = useState(false)
  const [title, setTitle] = useState('')

  const [contoursMm, setContoursMm] = useState<Polygon[] | null>(null)
  const [built, setBuilt] = useState<BuiltCutter | null>(null)
  const [warnings, setWarnings] = useState<CutterWarning[]>([])
  const [buildError, setBuildError] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '', quantity: 1 })
  const [submitting, setSubmitting] = useState<CutterOrderKind | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  const { remember, setRemember, hasSaved, persist, forget } = useCustomerProfile((saved) => {
    setForm((f) => ({
      ...f,
      name: saved.name ?? f.name,
      email: saved.email ?? f.email,
      phone: saved.phone ?? f.phone,
    }))
  })

  /** 入口を切り替えるたびに、前の形の残りを消す */
  const resetShape = useCallback(() => {
    setSizeTouched(false)
    setImage(null)
    setRawContours(null)
    setPreset(null)
    setContoursMm(null)
    setBuilt(null)
    setWarnings([])
    setBuildError(null)
    setLoadError(null)
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  /** 入口を切り替える。入口ごとに向いた既定値に戻す */
  const switchSource = useCallback(
    (next: Source) => {
      setSource(next)
      resetShape()
      setLetterSpacing(TEXT_LETTER_SPACING)
      setParams((prev) => ({
        ...prev,
        flange_width_mm:
          next === 'text' ? TEXT_FLANGE_WIDTH_MM : DEFAULT_PARAMS.flange_width_mm,
        max_size_mm: DEFAULT_PARAMS.max_size_mm,
      }))
    },
    [resetShape]
  )

  // ---- 入口0: きほんの形 ----

  const choosePreset = useCallback(
    (chosen: CutterPreset) => {
      setPreset(chosen)
      // ⚠ 画像に落とさず、計算した輪郭をそのまま使う。
      //   画像経由にすると角が丸まり、四角や星の角が甘くなる
      setImage(null)
      setRawContours([chosen.build()])
      setLoadError(null)
      if (!title) setTitle(chosen.label)
    },
    [title]
  )

  // ---- 入口1: 画像・SVG の読み込み ----

  const loadFile = useCallback(
    async (file: File) => {
      setLoadError(null)
      const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)

      if (!file.type.startsWith('image/') && !isSvg) {
        setLoadError('画像ファイル（JPEG・PNG・SVG）を選んでください')
        return
      }
      if (file.size > (isSvg ? MAX_SVG_BYTES : MAX_FILE_BYTES)) {
        setLoadError(isSvg ? 'SVGは2MB以下にしてください' : '画像は8MB以下にしてください')
        return
      }

      setBusy(true)
      try {
        if (isSvg) {
          // ⚠ SVG は中身を読み取って安全な形に組み直してから描く（lib/cookie-cutter/sources.ts）
          const svgText = await file.text()
          const data = await svgTextToImageData(svgText)
          setTraceOptions({ ...DEFAULT_TRACE_OPTIONS, useAlpha: true, closeGaps: 0 })
          setImage(data)
        } else {
          const data = await readRasterImage(file)
          const transparent = hasTransparency(data)
          setTraceOptions({
            ...DEFAULT_TRACE_OPTIONS,
            useAlpha: transparent,
            threshold: transparent ? DEFAULT_TRACE_OPTIONS.threshold : autoThreshold(data),
          })
          setImage(data)
        }

        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(file)
        })
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 30))
      } catch (err) {
        setLoadError(
          err instanceof SvgParseError ? err.message : '画像を読み込めませんでした'
        )
      }
      setBusy(false)
    },
    [title]
  )

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  // ---- 入口2: 文字 ----

  const textTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (source !== 'text') return
    if (!text.trim()) {
      setImage(null)
      setBuilt(null)
      return
    }

    // 1文字あたり30mmを目安にする。
    // 60mmのまま3文字入れると1文字20mmになり、線と線のすき間が生地の通らない細さになる
    if (!sizeTouched) {
      const charCount = [...text.trim()].length
      const suggested = Math.min(
        PARAM_LIMITS.max_size_mm.max,
        Math.max(PARAM_LIMITS.max_size_mm.min, charCount * TEXT_SIZE_PER_CHAR_MM)
      )
      setParams((prev) => (prev.max_size_mm === suggested ? prev : { ...prev, max_size_mm: suggested }))
    }

    if (textTimer.current) clearTimeout(textTimer.current)
    setBusy(true)
    textTimer.current = setTimeout(async () => {
      try {
        const font = CUTTER_FONTS[fontIndex]
        // ⚠ 書体が届く前に描くと、代わりの書体の形で型ができてしまう
        await loadCutterFont(font, text)
        const data = textToImageData({ text, font, letterSpacing })
        setTraceOptions({ ...DEFAULT_TRACE_OPTIONS, useAlpha: true, closeGaps: 0 })
        setImage(data)
        setLoadError(null)
        if (!title) setTitle(text.slice(0, 30))
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '文字を描けませんでした')
        setBusy(false)
      }
    }, 250)

    return () => {
      if (textTimer.current) clearTimeout(textTimer.current)
    }
    // title を依存に入れると、名前を打つたびに描き直しになる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, text, fontIndex, letterSpacing])

  // ---- 入口3: アイコン ----

  const chooseIcon = useCallback(
    async (chosen: CutterIcon) => {
      setIcon(chosen)
      setBusy(true)
      try {
        const data = await iconPathToImageData(chosen.path)
        setTraceOptions({ ...DEFAULT_TRACE_OPTIONS, useAlpha: true, closeGaps: 0 })
        setImage(data)
        setLoadError(null)
        if (!title) setTitle(chosen.keywords.split(' ')[0])
      } catch {
        setLoadError('アイコンを読み込めませんでした')
        setBusy(false)
      }
    },
    [title]
  )

  // ---- 輪郭の取り出しと、立体の組み立て ----

  // 画像から輪郭を取り出す。スライダーを動かすたびに計算すると重いので、少し待ってまとめる
  const traceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!image) return
    if (traceTimer.current) clearTimeout(traceTimer.current)
    setBusy(true)

    traceTimer.current = setTimeout(() => {
      try {
        const small = downscaleImageData(image, 512)
        const traced = traceImage(small, traceOptions)
        if (!traced) {
          setRawContours(null)
          setBuildError(
            traceOptions.useAlpha
              ? '形を見つけられませんでした。'
              : '形を見つけられませんでした。明るさのしきい値を動かしてみてください。'
          )
          setBusy(false)
          return
        }
        // 画像は Y が下向き。ミリの世界は Y を上向きにして扱う
        setRawContours(flipY(traced.contours))
        setBuildError(null)
      } catch (err) {
        setRawContours(null)
        setBuildError(err instanceof Error ? err.message : '形を読み取れませんでした')
        setBusy(false)
      }
    }, 150)

    return () => {
      if (traceTimer.current) clearTimeout(traceTimer.current)
    }
  }, [image, traceOptions])

  // 輪郭と寸法から立体を組み立てる
  useEffect(() => {
    if (!rawContours) {
      setBuilt(null)
      setContoursMm(null)
      setWarnings([])
      return
    }
    setBusy(true)
    try {
      const centerlines = normalizeContoursToSize(rawContours, params.max_size_mm)
      const result = buildCutterMesh(centerlines, params)
      setContoursMm(centerlines)
      setBuilt(result)
      setWarnings(validateContours(centerlines, params))
      setBuildError(null)
    } catch (err) {
      setContoursMm(null)
      setBuilt(null)
      setWarnings([])
      setBuildError(err instanceof Error ? err.message : '型を作れませんでした')
    }
    setBusy(false)
  }, [rawContours, params])

  // ---- 判定 ----

  const notClosed = built !== null && built.openEdgeCount > 0
  const blocked = notClosed || isBlocking(warnings) || !built
  const advisory = warnings.filter((w) => !isBlocking([w]))
  const hasSource = rawContours !== null || image !== null

  // ---- 2Dプレビュー（輪郭を上から見た図） ----

  const svg = useMemo(() => {
    if (!built) return null
    const outline = built.rings.flangeOuter
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of outline) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    const pad = 3
    // SVG は Y が下向きなので、ミリの座標を上下反転して描く
    const viewBox = `${minX - pad} ${-maxY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
    const toPath = (points: Polygon) =>
      points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${(-y).toFixed(2)}`).join(' ') + ' Z'

    const paths: { d: string; stroke: string; width: number }[] = [
      { d: toPath(built.rings.flangeOuter), stroke: '#c4b5fd', width: 0.6 },
      ...built.rings.flangeHoles.map((h) => ({ d: toPath(h), stroke: '#c4b5fd', width: 0.6 })),
    ]
    for (const blade of built.rings.blades) {
      paths.push({ d: toPath(blade.outer), stroke: '#7c3aed', width: 0.5 })
      for (const inner of blade.inners) {
        paths.push({ d: toPath(inner), stroke: '#7c3aed', width: 0.5 })
      }
    }

    const narrowPoints = warnings.find((w) => w.kind === 'narrow')?.points ?? []
    return { viewBox, paths, narrowPoints }
  }, [built, warnings])

  // ---- 購入 ----

  async function purchase(kind: CutterOrderKind) {
    if (!contoursMm || blocked) return
    setOrderError(null)

    if (!form.name.trim()) return setOrderError('お名前を入力してください')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setOrderError('メールアドレスを正しく入力してください')

    persist({ name: form.name, email: form.email, phone: form.phone })
    setSubmitting(kind)
    try {
      // 先に設計を保存し、その ID に対して決済する。
      // 金額も形の検証もサーバー側でやり直される
      const saveRes = await fetch('/api/cookie-cutter/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contour: contoursMm, params, title: title || null }),
      })
      const saved = await saveRes.json()
      if (!saveRes.ok || !saved.id) {
        setOrderError(saved.error || 'デザインの保存に失敗しました')
        setSubmitting(null)
        return
      }

      const res = await fetch(`/api/cookie-cutter/${saved.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, kind }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setOrderError(data.error || '決済セッションの作成に失敗しました')
        setSubmitting(null)
        return
      }
      window.location.href = data.url
    } catch {
      setOrderError('通信エラーが発生しました。時間をおいて再度お試しください。')
      setSubmitting(null)
    }
  }

  // ---- 見た目 ----

  const sliderClass = 'w-full accent-purple-600'
  const cardClass = 'bg-white rounded-2xl border border-gray-200 p-6'
  const fieldClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* 左: 操作 */}
      <div className="lg:col-span-3 space-y-6">
        {/* 1. 形のもと */}
        <section className={cardClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. 型にする形を決める</h2>

          <div className="flex gap-2 mb-5" role="tablist">
            {SOURCE_TABS.map((tab) => {
              const Icon = tab.icon
              const active = source === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchSource(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    active
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {source === 'preset' && <PresetPicker selected={preset} onSelect={choosePreset} />}

          {source === 'upload' && (
            <>
              <p className="text-base text-gray-600 mb-4">
                お子さんの絵、ロゴ、シルエット写真など。白い紙に濃い線で描いたものが一番きれいに出ます。
                SVG も読み込めます。
              </p>
              <label
                className="block border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:bg-purple-50 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) loadFile(file)
                }}
              >
                <input
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) loadFile(file)
                  }}
                />
                <Upload className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <span className="block text-base font-medium text-gray-800">
                  クリックして選ぶ / ここにドラッグ
                </span>
                <span className="block text-sm text-gray-500 mt-1">
                  JPEG・PNG は8MBまで／SVG は2MBまで
                </span>
              </label>

              {imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt="アップロードした画像"
                  className="mt-4 max-h-48 mx-auto rounded-lg border border-gray-200"
                />
              )}
            </>
          )}

          {source === 'text' && (
            <div className="space-y-5">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  型にする文字
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 12))}
                  placeholder="例: ゆうと"
                  className={fieldClass}
                />
                <p className="text-sm text-gray-500 mt-1">
                  12文字まで。名前や短い言葉が向いています。
                </p>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">書体</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CUTTER_FONTS.map((font, i) => (
                    <button
                      key={font.family}
                      type="button"
                      onClick={() => setFontIndex(i)}
                      className={`px-3 py-2.5 rounded-lg text-base font-medium border-2 transition-colors ${
                        fontIndex === i
                          ? 'border-purple-600 bg-purple-50 text-purple-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
                {CUTTER_FONTS[fontIndex].thin && (
                  <p className="text-sm text-amber-700 mt-2">
                    この書体は線が細く、小さい型だと刃がくっついてしまいます。
                    クッキーの大きさを大きめにしてください。
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between text-base text-gray-700 mb-1">
                  <span>字間</span>
                  <span className="text-gray-500">{letterSpacing.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={-0.3}
                  max={0.05}
                  step={0.01}
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(Number(e.target.value))}
                  className={sliderClass}
                />
                <p className="text-sm text-gray-500 mt-1">
                  左に動かすと字が近づきます。字が離れすぎているとバラバラの型になるので、
                  「ふちがつながらない」と言われたら詰めてください。
                </p>
              </div>
            </div>
          )}

          {source === 'icon' && <IconPicker selected={icon} onSelect={chooseIcon} />}

          {loadError && <p className="mt-3 text-base text-red-600">{loadError}</p>}
        </section>

        {/* 2. 形を整える。きほんの形は計算で作った正確な輪郭なので、整える必要がない */}
        {hasSource && source !== 'preset' && (
          <section className={cardClass}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. 形を整える</h2>

            <div className="space-y-5">
              {!traceOptions.useAlpha && (
                <div>
                  <div className="flex justify-between text-base text-gray-700 mb-1">
                    <span>明るさのしきい値</span>
                    <span className="text-gray-500">{traceOptions.threshold}</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={235}
                    step={1}
                    value={traceOptions.threshold}
                    onChange={(e) => setTraceOptions({ ...traceOptions, threshold: Number(e.target.value) })}
                    className={sliderClass}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    これより暗い部分を「形」として扱います。背景が拾われるときは下げてください。
                  </p>
                </div>
              )}

              <div>
                <div className="flex justify-between text-base text-gray-700 mb-1">
                  <span>線のすき間を埋める</span>
                  <span className="text-gray-500">{traceOptions.closeGaps}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={traceOptions.closeGaps}
                  onChange={(e) => setTraceOptions({ ...traceOptions, closeGaps: Number(e.target.value) })}
                  className={sliderClass}
                />
                <p className="text-sm text-gray-500 mt-1">
                  手描きの線が途切れているときや、文字どうしをつなげたいときに上げてください。
                </p>
              </div>

              <div>
                <div className="flex justify-between text-base text-gray-700 mb-1">
                  <span>なめらかさ</span>
                  <span className="text-gray-500">{traceOptions.smoothness.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={5}
                  step={0.1}
                  value={traceOptions.smoothness}
                  onChange={(e) => setTraceOptions({ ...traceOptions, smoothness: Number(e.target.value) })}
                  className={sliderClass}
                />
                <p className="text-sm text-gray-500 mt-1">
                  上げるとギザギザが取れます。細かい部分が印刷できないと言われたら上げてください。
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 3. 大きさ */}
        {hasSource && (
          <section className={cardClass}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {source === 'preset' ? '2' : '3'}. 大きさを決める
            </h2>
            <div className="space-y-5">
              {(Object.keys(PARAM_LIMITS) as (keyof CutterParams)[]).map((key) => {
                const limit = PARAM_LIMITS[key]
                return (
                  <div key={key}>
                    <div className="flex justify-between text-base text-gray-700 mb-1">
                      <span>{limit.label}</span>
                      <span className="text-gray-500">
                        {params[key]} {limit.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={limit.min}
                      max={limit.max}
                      step={limit.step}
                      value={params[key]}
                      onChange={(e) => {
                        if (key === 'max_size_mm') setSizeTouched(true)
                        setParams({ ...params, [key]: Number(e.target.value) })
                      }}
                      className={sliderClass}
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              「刃の厚み」は 0.4mm ノズルで印刷できる下限が 0.8mm です。それより薄くはできません。
            </p>
          </section>
        )}

        {/* 4. 購入 */}
        {built && (
          <section className={cardClass} id="buy">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {source === 'preset' ? '3' : '4'}. 受け取り方を選ぶ
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">型の名前</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                  placeholder="例: そらのくま"
                  className={fieldClass}
                />
                <p className="text-sm text-gray-500 mt-1">ファイル名になります。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    お名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className={fieldClass}
                  />
                  <p className="text-sm text-gray-500 mt-1">ここにデータのリンクをお送りします。</p>
                </div>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">電話番号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">ご要望</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className={fieldClass}
                />
              </div>

              <RememberCustomerInfo
                remember={remember}
                onChange={setRemember}
                hasSaved={hasSaved}
                onForget={forget}
              />

              {orderError && (
                <p className="text-base text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {orderError}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={blocked || submitting !== null}
                  onClick={() => purchase('download')}
                  className="flex flex-col items-center justify-center gap-1 px-6 py-5 rounded-xl border-2 border-purple-600 text-purple-700 font-bold hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting === 'download' ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Download className="w-6 h-6" />
                  )}
                  <span className="text-lg">データを買う</span>
                  <span className="text-2xl">¥{CUTTER_DOWNLOAD_PRICE.toLocaleString()}</span>
                  <span className="text-sm font-normal text-gray-600">
                    STLファイル／{DOWNLOAD_VALID_DAYS}日間ダウンロード可
                  </span>
                </button>

                <button
                  type="button"
                  disabled={blocked || submitting !== null}
                  onClick={() => purchase('print')}
                  className="flex flex-col items-center justify-center gap-1 px-6 py-5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {submitting === 'print' ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Package className="w-6 h-6" />
                  )}
                  <span className="text-lg">印刷して送ってもらう</span>
                  <span className="text-2xl">¥{CUTTER_PRINT_PRICE.toLocaleString()}</span>
                  <span className="text-sm font-normal opacity-90">
                    {SHIPPING_FEE > 0 ? `＋送料 ¥${SHIPPING_FEE.toLocaleString()}` : '送料込み'}／{SHIPPING_LEAD_TIME_TEXT}
                  </span>
                </button>
              </div>

              <p className="text-sm text-gray-500">
                データは性質上、購入後の返金をお受けできません。印刷してお送りするものはオーダーメイドのため、
                お支払い後のキャンセルをお受けできません。
              </p>
            </div>
          </section>
        )}
      </div>

      {/* 右: プレビュー */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="bg-purple-50 rounded-2xl border border-purple-100 overflow-hidden">
            <div className="h-72 sm:h-80">
              {built ? (
                <CutterPreview3D positions={built.mesh.positions} className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center px-6">
                  <p className="text-base text-gray-500">
                    {hasSource ? '形を探しています…' : 'ここに3Dの型が出ます'}
                  </p>
                </div>
              )}
            </div>
            {built && (
              <p className="text-sm text-gray-600 text-center py-2 border-t border-purple-100">
                ドラッグで回転／ホイールで拡大
              </p>
            )}
          </div>

          {svg && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-base font-medium text-gray-800 mb-2">上から見た形</p>
              <svg viewBox={svg.viewBox} className="w-full h-40" preserveAspectRatio="xMidYMid meet">
                {svg.paths.map((path, i) => (
                  <path
                    key={i}
                    d={path.d}
                    fill="none"
                    stroke={path.stroke}
                    strokeWidth={path.width}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {svg.narrowPoints.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={-y} r={0.8} fill="#ef4444" opacity={0.7} />
                ))}
              </svg>
              {svg.narrowPoints.length > 0 && (
                <p className="text-sm text-red-600 mt-1">赤い点：生地が抜けにくい細い部分</p>
              )}
            </div>
          )}

          {built && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-base text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">外形（ふち込み）</span>
                <span>
                  {built.size.width} × {built.size.depth} × {built.size.height} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">刃の数</span>
                <span>{built.rings.blades.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">材料の量</span>
                <span>約 {built.volumeCm3} cm³（約 {Math.round(built.volumeCm3 * 1.24)} g）</span>
              </div>
            </div>
          )}

          {busy && (
            <p className="flex items-center justify-center text-base text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              計算中…
            </p>
          )}

          {buildError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-base text-red-700">{buildError}</p>
            </div>
          )}

          {notClosed && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-base text-red-700">
                この形は型として成立しません（立体が閉じていません）。
                「なめらかさ」を上げるか、クッキーの大きさを大きくしてください。
              </p>
            </div>
          )}

          {warnings
            .filter((w) => isBlocking([w]))
            .map((w, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-base text-red-700">{w.message}</p>
              </div>
            ))}

          {advisory.map((w, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-base text-amber-800">{w.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 写真・イラストのファイルを ImageData にする */
function readRasterImage(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('canvas を使えませんでした')
        ctx.drawImage(img, 0, 0)
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像を読み込めませんでした'))
    }
    img.src = url
  })
}
