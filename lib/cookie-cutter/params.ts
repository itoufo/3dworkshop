/**
 * クッキー型の寸法パラメータ。単位はすべてミリメートル。
 *
 * 印刷の向きは「フランジ（＝手で押す平らなふち）を造形プレートに接地させ、
 * 刃（＝生地を切る薄い壁）を上に伸ばす」向きを前提にしている。
 * この向きなら全面が垂直な壁になるので、サポート材なしで印刷できる。
 *
 *        ↑ z
 *        │        ││  ← blade_thickness_mm（刃の厚み）
 *        │        ││
 *   ─────┴───┬────┴┴──── z = flange_thickness_mm
 *            │ フランジ │
 *   ─────────┴────────── z = 0（造形プレート）
 *            ←────────→  flange_width_mm
 */
export interface CutterParams {
  /** 刃（＝生地を切る薄い壁）の厚み。0.4mmノズルの2パス分が既定 */
  blade_thickness_mm: number
  /** 刃の高さ。生地の厚みより十分高くする */
  blade_height_mm: number
  /** フランジ（＝手で押す平らなふち）の幅 */
  flange_width_mm: number
  /** フランジの厚み（＝高さ）。blade_height_mm より小さいこと */
  flange_thickness_mm: number
  /** 焼き上がるクッキーの最大寸法。輪郭の長辺がこの値になるよう拡大縮小する */
  max_size_mm: number
}

export const DEFAULT_PARAMS: CutterParams = {
  blade_thickness_mm: 0.8,
  blade_height_mm: 15,
  flange_width_mm: 3,
  flange_thickness_mm: 1.6,
  max_size_mm: 60,
}

/** 各パラメータの許容範囲。UI のスライダーとサーバー側の検証で共用する */
export const PARAM_LIMITS: Record<keyof CutterParams, { min: number; max: number; step: number; label: string; unit: string }> = {
  // 0.4mm ノズルで印刷できる下限が0.8mm（2パス）。それ未満はスライサーが壁を落とす
  blade_thickness_mm: { min: 0.8, max: 2.0, step: 0.1, label: '刃の厚み', unit: 'mm' },
  blade_height_mm: { min: 8, max: 30, step: 1, label: '刃の高さ', unit: 'mm' },
  flange_width_mm: { min: 1.5, max: 8, step: 0.5, label: 'ふちの幅', unit: 'mm' },
  flange_thickness_mm: { min: 0.8, max: 4, step: 0.2, label: 'ふちの厚み', unit: 'mm' },
  max_size_mm: { min: 25, max: 120, step: 1, label: 'クッキーの大きさ', unit: 'mm' },
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * クライアントから届いたパラメータを、印刷できる範囲に丸める。
 *
 * ⚠ サーバー側は必ずこれを通すこと。ブラウザから送られてくる値をそのまま使うと、
 *   刃の厚み0.01mm のような印刷不能なデータを生成して売ってしまう。
 */
export function sanitizeParams(input: unknown): CutterParams {
  const raw = (input ?? {}) as Partial<Record<keyof CutterParams, unknown>>
  const out = {} as CutterParams

  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof CutterParams)[]) {
    const { min, max } = PARAM_LIMITS[key]
    out[key] = clampNumber(raw[key], min, max, DEFAULT_PARAMS[key])
  }

  // フランジが刃より高いと、フランジの上面と刃の側面が同じ高さに重なって形が破綻する
  out.flange_thickness_mm = Math.min(out.flange_thickness_mm, out.blade_height_mm - 2)

  return out
}
