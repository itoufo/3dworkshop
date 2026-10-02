import { getRegistrationFee } from '@/lib/school-campaign'

/**
 * スクールのクラス定義。申込画面（表示）と申込 API（申込行に書く金額）の両方がここから取る。
 * ⚠ 金額を画面側だけに持たせない。申込行に書く月謝・入会金はサーバーがここから決める。
 */

export interface SchoolClass {
  id: 'free' | 'basic'
  name: string
  description: string
  price: number
  registrationFee: number
  duration: string
  frequency: string
  perks: string
  schedule?: string
}

const SCHOOL_CLASSES: Record<string, Omit<SchoolClass, 'registrationFee'>> = {
  free: {
    id: 'free',
    name: '自由創作クラス（教室開放）',
    description: 'PCや有料版AIを自由に使いながら、自分のアイデアをとことん形にできるクラス',
    price: 17000,
    duration: '120分/回',
    frequency: '開校日の好きな日に月2回',
    perks: '制作し放題（時間内）',
  },
}

/** 指定のクラス。知らない値・未指定は自由創作クラスにする（申込画面の従来の挙動） */
export function getSchoolClass(classType: string | null | undefined): SchoolClass {
  const base = SCHOOL_CLASSES[classType ?? ''] ?? SCHOOL_CLASSES.free
  // 通常 20000円（税別）= 22000円（税込）。キャンペーン期間中は 0 円。
  // 呼ばれた時点の値を使う（モジュール読み込み時に固定しない）
  return { ...base, registrationFee: getRegistrationFee() }
}
