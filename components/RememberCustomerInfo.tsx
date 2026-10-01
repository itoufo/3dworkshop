'use client'

import { Trash2, UserCheck } from 'lucide-react'
import type { Locale } from '@/lib/i18n'

interface Props {
  remember: boolean
  onChange: (remember: boolean) => void
  hasSaved: boolean
  onForget: () => void
  /** ログイン中の会員の情報で埋めたか（lib/use-customer-profile.ts の fromAccount） */
  fromAccount?: boolean
  locale?: Locale
}

const TEXT = {
  ja: {
    fromAccount: 'ログイン中の会員情報を入れました。変更してそのまま進めます。',
    remember: '次回のために入力内容を保存する',
    rememberHelp: 'お名前・ご連絡先をこの端末のブラウザにだけ保存し、次回の入力を省きます。当社のサーバーには保存されません。',
    forget: '保存した内容を削除する',
  },
  en: {
    fromAccount: 'We filled in your member details. You can change them and continue.',
    remember: 'Remember my details for next time',
    rememberHelp: 'Your name and contact details are saved only in this browser on this device, so you do not have to type them again. They are not stored on our servers.',
    forget: 'Delete saved details',
  },
}

/**
 * 「次回のために入力内容を保存する」チェックボックス。
 * 保存先はこの端末のブラウザだけ（lib/customer-profile.ts）。
 */
export default function RememberCustomerInfo({
  remember,
  onChange,
  hasSaved,
  onForget,
  fromAccount = false,
  locale = 'ja',
}: Props) {
  const t = TEXT[locale]
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      {/* 勝手に値が入っていると不審に見えるので、どこから来た値かを伝える */}
      {fromAccount && (
        <p className="mb-3 flex items-start gap-2 text-base text-purple-800">
          <UserCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t.fromAccount}
        </p>
      )}
      <label className="flex items-start space-x-3 cursor-pointer">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 text-purple-600 rounded shrink-0"
        />
        <span>
          <span className="block font-medium text-gray-900">{t.remember}</span>
          <span className="block text-sm text-gray-600 mt-0.5">
            {t.rememberHelp}
          </span>
        </span>
      </label>

      {hasSaved && (
        <button
          type="button"
          onClick={onForget}
          className="inline-flex items-center mt-3 text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t.forget}
        </button>
      )}
    </div>
  )
}
