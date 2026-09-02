'use client'

import { CUTTER_PRESETS, presetToSvgPath, type CutterPreset } from '@/lib/cookie-cutter/presets'

/**
 * よくある形から選ぶ。
 * 見本は計算で作った輪郭そのものを描いているので、選んだ形と出来上がる形が必ず一致する。
 */
export default function PresetPicker({
  selected,
  onSelect,
}: {
  selected: CutterPreset | null
  onSelect: (preset: CutterPreset) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-base text-gray-600">
        丸・四角・星など、よく使う形をそのまま選べます。写真と違ってギザギザが出ないので、
        形を整える手順は要りません。
      </p>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {CUTTER_PRESETS.map((preset) => {
          const isSelected = selected?.key === preset.key
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onSelect(preset)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-colors ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <svg
                viewBox="-1.35 -1.35 2.7 2.7"
                className="w-full aspect-square"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <path
                  d={presetToSvgPath(preset.build())}
                  fill={isSelected ? '#7c3aed' : '#4b5563'}
                />
              </svg>
              <span className="text-sm text-gray-700 leading-tight text-center">{preset.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
