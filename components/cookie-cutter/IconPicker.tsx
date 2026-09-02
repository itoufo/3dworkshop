'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { CUTTER_ICONS, ICON_CATEGORIES, searchIcons, type CutterIcon } from '@/lib/cookie-cutter/icons'
import { measurePaths, type PathBox } from '@/lib/cookie-cutter/sources'

/**
 * 型にするアイコンを選ぶ。
 *
 * ⚠ 見本の枠（viewBox）は決め打ちにできない。Font Awesome のアイコンは
 *   宣言されている大きさの外にはみ出すものがあり（星の上端など）、
 *   決め打ちだと端が切れる。最初に一度だけ実測して枠を決める。
 */
export default function IconPicker({
  selected,
  onSelect,
}: {
  selected: CutterIcon | null
  onSelect: (icon: CutterIcon) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [boxes, setBoxes] = useState<Map<string, PathBox>>(new Map())

  useEffect(() => {
    const measured = measurePaths(CUTTER_ICONS.map((i) => i.path))
    setBoxes(new Map(CUTTER_ICONS.map((icon, i) => [icon.name, measured[i]])))
  }, [])

  const results = useMemo(() => searchIcons(query, category), [query, category])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ねこ、ほし、ケーキ…"
          aria-label="アイコンを探す"
          className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            category === null
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400'
          }`}
        >
          すべて
        </button>
        {ICON_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="text-base text-gray-500 py-6 text-center">
          見つかりませんでした。ひらがなでもお試しください。
        </p>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-80 overflow-y-auto p-1">
          {results.map((icon) => {
            const box = boxes.get(icon.name)
            // 実測できるまでは宣言値で仮に描く（一瞬だけ小さめに見える）
            const viewBox = box
              ? `${box.x} ${box.y} ${box.width} ${box.height}`
              : '0 0 512 512'
            const isSelected = selected?.name === icon.name
            return (
              <button
                key={icon.name}
                type="button"
                onClick={() => onSelect(icon)}
                title={icon.keywords.split(' ')[0]}
                aria-pressed={isSelected}
                className={`aspect-square flex items-center justify-center rounded-lg border-2 p-2 transition-colors ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <svg
                  viewBox={viewBox}
                  className="w-full h-full"
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                >
                  <path d={icon.path} fill={isSelected ? '#7c3aed' : '#4b5563'} />
                </svg>
              </button>
            )
          })}
        </div>
      )}

      <p className="text-sm text-gray-500">
        アイコン提供:{' '}
        <a
          href="https://fontawesome.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700"
        >
          Font Awesome
        </a>
        （
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700"
        >
          CC BY 4.0
        </a>
        ）
      </p>
    </div>
  )
}
