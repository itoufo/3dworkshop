'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
import Header from '@/components/Header'

interface WorkshopPasswordGateProps {
  workshopId: string
  title: string
}

export default function WorkshopPasswordGate({ workshopId, title }: WorkshopPasswordGateProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/workshops/${workshopId}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })

      if (res.ok) {
        // Cookie がセットされたのでサーバーコンポーネントを再描画
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'パスワードが違います')
        setSubmitting(false)
      }
    } catch {
      setError('通信エラーが発生しました。もう一度お試しください。')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full mb-4">
              限定公開
            </span>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-base text-gray-600 mb-8">
              このワークショップは限定公開です。<br />
              ご案内したパスワードを入力してください。
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting || !password.trim()}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    確認中...
                  </>
                ) : (
                  '閲覧する'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
