'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingOverlay from '@/components/LoadingOverlay'
import { ArrowLeft, UserCircle, Phone, MapPin, Save, AlertCircle } from 'lucide-react'

// 管理画面からの顧客の手動登録。
// 電話や対面で申し込みを受けた人など、サイトのフォームを通っていない顧客を入れる。
// 書き込みは /api/admin/customers（service role）経由。anon キーで直接 INSERT しない。

const GENDER_OPTIONS = [
  { value: '', label: '未選択' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' },
] as const

export default function NewCustomerPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
  })
  const [creating, setCreating] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      })
      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        setErrorMessage('管理画面のログインが古くなっています。一度ログアウトして、入り直してください。')
        return
      }
      if (!response.ok) {
        setErrorMessage(data.error || '顧客の登録に失敗しました')
        return
      }

      alert('顧客を登録しました')
      setNavigating(true)
      router.push('/admin?tab=customers')
    } catch (error) {
      console.error('Error creating customer:', error)
      setErrorMessage('顧客の登録に失敗しました（通信エラー）')
    } finally {
      setCreating(false)
    }
  }

  const handleBack = () => {
    setNavigating(true)
    router.push('/admin?tab=customers')
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'

  return (
    <>
      {navigating && <LoadingOverlay message="管理画面へ戻っています..." />}
      {creating && <LoadingOverlay message="顧客を登録しています..." />}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          管理画面に戻る
        </button>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <h2 className="text-2xl font-bold text-white">新規顧客登録</h2>
            <p className="text-white/80 mt-1">電話や対面で申し込みを受けたお客様を、手動で顧客一覧に追加します</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本情報 */}
              <div className="bg-purple-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <UserCircle className="w-5 h-5 mr-2 text-purple-600" />
                  基本情報
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    お名前 *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    className={inputClass}
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="山田 太郎"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={200}
                    className={inputClass}
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="taro@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    すでに登録済みのメールアドレスは登録できません（既存の顧客情報を上書きしないため）
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年齢
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={150}
                      className={inputClass}
                      value={customer.age}
                      onChange={(e) => setCustomer({ ...customer, age: e.target.value })}
                      placeholder="未登録"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性別
                    </label>
                    <select
                      className={inputClass}
                      value={customer.gender}
                      onChange={(e) => setCustomer({ ...customer, gender: e.target.value })}
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 連絡先 */}
              <div className="bg-pink-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <Phone className="w-5 h-5 mr-2 text-pink-600" />
                  連絡先
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    maxLength={20}
                    className={inputClass}
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="090-1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    住所
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    className={`${inputClass} resize-none`}
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    placeholder="〒000-0000 ○○県○○市…"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
