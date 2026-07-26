/**
 * 「親子におすすめ！」バッジ。
 * 親子向けの日程（workshop_sessions.is_family_friendly）に表示する。
 * - tone="default": amber→orange グラデ＋白リング（白背景のカード・日程行向け。画像上でも視認できる）
 * - tone="onColor": 白背景・オレンジ文字（色付き背景のバナー向け）
 * size="md"（既定）/ "sm"（小さめ）。className で配置を上書きできる。
 */
export default function FamilyFriendlyBadge({
  className = '',
  tone = 'default',
  size = 'md',
}: {
  className?: string
  tone?: 'default' | 'onColor'
  size?: 'sm' | 'md' | 'lg'
}) {
  const toneClass =
    tone === 'onColor'
      ? 'bg-white text-orange-600 ring-1 ring-orange-200'
      : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white ring-2 ring-white/80'
  const sizeClass =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[11px]'
      : size === 'lg'
        ? 'px-4 py-2 text-sm'
        : 'px-3 py-1 text-xs'
  const emojiClass = size === 'lg' ? 'text-lg leading-none' : 'text-sm leading-none'
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full font-bold shadow-md whitespace-nowrap ' +
        sizeClass +
        ' ' +
        toneClass +
        ' ' +
        className
      }
    >
      <span aria-hidden className={emojiClass}>👨‍👩‍👧</span>
      親子におすすめ
    </span>
  )
}
