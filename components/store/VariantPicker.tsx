'use client'

import { useMemo } from 'react'
import { axisValues, isAvailable, type Selection } from '@/lib/product-variants'
import { asVariantItems, type StoreVariant } from '@/lib/store/variants'
import { STORE_UI } from '@/lib/store/ui-copy'
import { useStoreLocale } from './StoreLocale'

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
  const locale = useStoreLocale()
  const t = STORE_UI[locale].variant
  /** 項目の名前と値は出品者が入れた文字。英語のページでは lang="ja" を付けて出す */
  const userText = locale === 'en' ? { lang: 'ja' } : {}

  return (
    <div className="space-y-3">
      {axes.map((axis) => (
        <fieldset key={axis}>
          <legend className="text-base text-gray-700 mb-2">
            <span {...userText}>{t.current(axis, selection[axis]).label}</span>
            <span className="font-semibold text-gray-900" {...(selection[axis] ? userText : {})}>
              {t.current(axis, selection[axis]).value}
            </span>
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
                  {...userText}
                  title={available ? undefined : t.unavailable(value)}
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
