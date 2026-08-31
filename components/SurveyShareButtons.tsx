'use client'

import { Share2 } from 'lucide-react'
import type { Survey } from '@/lib/surveys'
import { gaEvent } from '@/lib/gtag'

/**
 * 「あなたは少数派？多数派？」の共有導線。
 *
 * ⚠ 共有先の URL は必ず個別ページ（/survey/<slug>）にする。/survey は毎日中身が変わるので、
 *   共有されたリンクを翌日に開いた人は、共有された人が見たのとは別の設問を見ることになる。
 */

interface SurveyShareButtonsProps {
  survey: Pick<Survey, 'slug' | 'question' | 'option_a' | 'option_b'>
  percentA: number
  percentB: number
}

export default function SurveyShareButtons({ survey, percentA, percentB }: SurveyShareButtonsProps) {
  const url = `https://3dlab.jp/survey/${survey.slug}`
  const text = `あなたは少数派？多数派？「${survey.question}」${survey.option_a} ${percentA}% / ${survey.option_b} ${percentB}%`

  const links = [
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      className: 'bg-gray-900 hover:bg-gray-800',
    },
    {
      name: 'LINE',
      href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      className: 'bg-[#06C755] hover:bg-[#05b34c]',
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      className: 'bg-[#1877F2] hover:bg-[#1568d8]',
    },
  ]

  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
        <Share2 className="h-4 w-4" aria-hidden="true" />
        あなたは少数派？多数派？
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            // ⚠ noopener を外さない。target="_blank" のリンク先から window.opener 経由で
            //   このページを別の URL へ飛ばせてしまう
            rel="noopener noreferrer"
            onClick={() => gaEvent('survey_share', { survey_slug: survey.slug, method: link.name })}
            className={`rounded-full px-5 py-2 text-sm font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02] ${link.className}`}
          >
            {link.name}で共有
          </a>
        ))}
      </div>
    </div>
  )
}
