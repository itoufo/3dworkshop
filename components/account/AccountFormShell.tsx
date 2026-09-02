'use client'

/** 会員まわりのフォームで共通の見た目。入力欄の大きさとラベルを揃える */
export const fieldClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent'

export const labelClass = 'block text-base font-medium text-gray-700 mb-2'

export const submitClass =
  'w-full py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-bold hover:shadow-lg disabled:opacity-50 transition-all'

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-700">{error}</p>
    )
  }
  if (success) {
    return (
      <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-base text-green-800">
        {success}
      </p>
    )
  }
  return null
}
