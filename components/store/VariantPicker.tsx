'use client'

import { useMemo } from 'react'
import { axisValues, isAvailable, type Selection } from '@/lib/product-variants'
import { asVariantItems, type StoreVariant } from '@/lib/store/variants'

interface Props {
  axes: string[]
  variants: StoreVariant[]
  selection: Selection
  onChoose: (axis: string, value: string) => void
}

/**
 * 完成品の選択肢（サイズ・色など）を項目ごとのボタンで選ぶ。本サイトのシリーズのページと同じ見た目・動き。
 * いまの組み合わせに無い値は点線で出し、押すと他の項目をいちばん近い組み合わせに合わせる（親の onChoose）。
 */
export default function VariantPicker({ axes, variants, selection, onChoose }: Props) {
  const items = useMemo(() => asVariantItems(variants), [variants])
  const values = useMemo(() => axisValues(items, axes), [items, axes])

  return (
    <div className="space-y-3">
      {axes.map((axis) => (
        <fieldset key={axis}>
          <legend className="text-base text-gray-700 mb-2">
            {axis}：<span className="font-semibold text-gray-900">{selection[axis] ?? '未選択'}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {values[axis].map((value) => {
              const selected = selection[axis] === value
              const available = isAvailable(items, axes, selection, axis, value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChoose(axis, value)}
                  aria-pressed={selected}
                  title={available ? undefined : `${value} はいまの組み合わせにはありません（選ぶと他の項目を合わせます）`}
                  className={`px-3 py-1.5 rounded-lg border-2 text-base transition-colors ${
                    selected
                      ? 'border-purple-600 bg-purple-50 text-purple-800 font-semibold'
                      : available
                        ? 'border-gray-200 bg-white text-gray-800 hover:border-purple-400'
                        : 'border-dashed border-gray-200 bg-white text-gray-400 hover:border-purple-300'
                  }`}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
