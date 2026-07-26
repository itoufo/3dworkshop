import { Users } from 'lucide-react'

/**
 * 「親子におすすめ！」バッジ。
 * 親子向けの日程（workshop_sessions.is_family_friendly）に表示する。
 * - tone="default": amber→orange グラデ（白背景のカード・日程行向け）
 * - tone="onColor": 白背景・オレンジ文字（色付き背景のバナー向け）
 * className で配置・サイズを上書きできる。
 */
export default function FamilyFriendlyBadge({
  className = '',
  tone = 'default',
}: {
  className?: string
  tone?: 'default' | 'onColor'
}) {
  const toneClass =
    tone === 'onColor'
      ? 'bg-white text-orange-600'
      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full font-medium shadow px-3 py-1 text-xs ' +
        toneClass +
        ' ' +
        className
      }
    >
      <Users className="w-3 h-3" />
      親子におすすめ！
    </span>
  )
}
