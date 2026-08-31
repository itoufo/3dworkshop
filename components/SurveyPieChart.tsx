'use client'

import { useEffect, useState } from 'react'

/**
 * 2択の結果を出す円グラフ。
 *
 * conic-gradient ではなく SVG の円弧で描いている。conic-gradient を滑らかに動かすには
 * @property で角度をアニメーション可能な型として登録する必要があり、対応していない
 * ブラウザでは「0%から一気に最終値へ飛ぶ」だけになる。stroke-dasharray なら
 * どのブラウザでも同じように補間される。
 */

const SIZE = 200
const STROKE = 34
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface SurveyPieChartProps {
  percentA: number
  percentB: number
  labelA: string
  labelB: string
  total: number
  /** 描画と同時に動かす。結果ページのように最初から見えている場合は false でもよい */
  animate?: boolean
}

export default function SurveyPieChart({
  percentA,
  percentB,
  labelA,
  labelB,
  total,
  animate = true,
}: SurveyPieChartProps) {
  // ⚠ 初期値を 0 にしてから実測値へ動かす。最初から最終値で描くと transition が走らない
  const [shown, setShown] = useState(animate ? 0 : 1)

  useEffect(() => {
    if (!animate) return
    // 次のフレームまで待つ。同じフレームで 0 → 1 にすると変化として扱われない
    const id = requestAnimationFrame(() => setShown(1))
    return () => cancelAnimationFrame(id)
  }, [animate])

  const arcA = (CIRCUMFERENCE * percentA * shown) / 100
  const arcB = (CIRCUMFERENCE * percentB * shown) / 100

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${labelA} ${percentA}パーセント、${labelB} ${percentB}パーセント`}
        className="shrink-0"
      >
        {/* 12時の位置から時計回りに描くための回転 */}
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#f3e8ff"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#9333ea"
            strokeWidth={STROKE}
            strokeDasharray={`${arcA} ${CIRCUMFERENCE}`}
            style={{ transition: 'stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#ec4899"
            strokeWidth={STROKE}
            strokeDasharray={`${arcB} ${CIRCUMFERENCE}`}
            // A のぶんだけ手前を空けて続きから描く
            strokeDashoffset={-arcA}
            style={{
              transition:
                'stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1), stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </g>
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 4}
          textAnchor="middle"
          className="fill-gray-900"
          style={{ fontSize: 26, fontWeight: 700 }}
        >
          {total.toLocaleString('ja-JP')}
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 20}
          textAnchor="middle"
          className="fill-gray-500"
          style={{ fontSize: 13 }}
        >
          人が回答
        </text>
      </svg>

      <ul className="w-full max-w-xs space-y-3">
        <li className="flex items-center gap-3">
          <span className="h-4 w-4 shrink-0 rounded-full bg-purple-600" aria-hidden="true" />
          <span className="flex-1 text-gray-800">{labelA}</span>
          <span className="text-xl font-bold text-purple-600 tabular-nums">{percentA}%</span>
        </li>
        <li className="flex items-center gap-3">
          <span className="h-4 w-4 shrink-0 rounded-full bg-pink-500" aria-hidden="true" />
          <span className="flex-1 text-gray-800">{labelB}</span>
          <span className="text-xl font-bold text-pink-500 tabular-nums">{percentB}%</span>
        </li>
      </ul>
    </div>
  )
}
