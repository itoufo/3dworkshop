'use client'

import { Trash2 } from 'lucide-react'

interface Props {
  remember: boolean
  onChange: (remember: boolean) => void
  hasSaved: boolean
  onForget: () => void
}

/**
 * 「次回のために入力内容を保存する」チェックボックス。
 * 保存先はこの端末のブラウザだけ（lib/customer-profile.ts）。
 */
export default function RememberCustomerInfo({ remember, onChange, hasSaved, onForget }: Props) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <label className="flex items-start space-x-3 cursor-pointer">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 text-purple-600 rounded shrink-0"
        />
        <span>
          <span className="block font-medium text-gray-900">次回のために入力内容を保存する</span>
          <span className="block text-sm text-gray-600 mt-0.5">
            お名前・ご連絡先をこの端末のブラウザにだけ保存し、次回の入力を省きます。当社のサーバーには保存されません。
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
          保存した内容を削除する
        </button>
      )}
    </div>
  )
}
