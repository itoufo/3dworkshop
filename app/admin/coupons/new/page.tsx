'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Tag, CreditCard, Calendar, Users, Save, Sparkles, AlertCircle } from 'lucide-react'

export default function NewCouponPage() {
  const router = useRouter()
  const [coupon, setCoupon] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: '',
    minimum_amount: '',
    usage_limit: '',
    user_limit: '1',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
    workshop_ids: [] as string[]
  })
  const [selectedWorkshops, setSelectedWorkshops] = useState<Set<string>>(new Set())
  const [workshops, setWorkshops] = useState<{id: string; title: string}[]>([])
  const [creating, setCreating] = useState(false)

  // クーポンコード自動生成
  function generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCoupon({ ...coupon, code })
  }

  // ワークショップ一覧を取得
  useState(() => {
    async function fetchWorkshops() {
      const { data } = await supabase
        .from('workshops')
        .select('id, title')
        .order('created_at', { ascending: false })
      
      if (data) {
        setWorkshops(data)
      }
    }
    fetchWorkshops()
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    setCreating(true)

    try {
      const { error } = await supabase
        .from('coupons')
        .insert({
          code: coupon.code.toUpperCase(),
          description: coupon.description || null,
          discount_type: coupon.discount_type,
          discount_value: parseInt(coupon.discount_value),
          minimum_amount: coupon.minimum_amount ? parseInt(coupon.minimum_amount) : null,
          usage_limit: coupon.usage_limit ? parseInt(coupon.usage_limit) : null,
          user_limit: parseInt(coupon.user_limit),
          valid_from: coupon.valid_from,
          valid_until: coupon.valid_until || null,
          is_active: coupon.is_active,
          workshop_ids: selectedWorkshops.size > 0 ? Array.from(selectedWorkshops) : null
        })

      if (error) throw error

      alert('クーポンを作成しました')
      router.push('/admin')
    } catch (error) {
      console.error('Error creating coupon:', error)
      alert('クーポンの作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        管理画面に戻る
      </button>
      
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <h2 className="text-2xl font-bold text-white">新規クーポン作成</h2>
          <p className="text-white/80 mt-1">割引クーポンを作成して、お客様に特別なオファーを提供しましょう</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-purple-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Tag className="w-5 h-5 mr-2 text-purple-600" />
                基本情報
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  クーポンコード *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase"
                    value={coupon.code}
                    onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2024"
                  />
                  <button
                    type="button"
                    onClick={generateCouponCode}
                    className="px-4 py-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors flex items-center"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    自動生成
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">英数字のみ使用可能です</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  value={coupon.description}
                  onChange={(e) => setCoupon({ ...coupon, description: e.target.value })}
                  placeholder="夏季キャンペーン限定クーポン"
                />
              </div>
            </div>

            {/* 割引設定 */}
            <div className="bg-pink-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <CreditCard className="w-5 h-5 mr-2 text-pink-600" />
                割引設定
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  割引タイプ *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCoupon({ ...coupon, discount_type: 'percentage' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      coupon.discount_type === 'percentage'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">パーセント割引</div>
                    <div className="text-xs text-gray-500 mt-1">例: 20%OFF</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoupon({ ...coupon, discount_type: 'fixed_amount' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      coupon.discount_type === 'fixed_amount'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">固定額割引</div>
                    <div className="text-xs text-gray-500 mt-1">例: ¥500OFF</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    割引値 *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={coupon.discount_value}
                      onChange={(e) => setCoupon({ ...coupon, discount_value: e.target.value })}
                      placeholder={coupon.discount_type === 'percentage' ? '20' : '500'}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      {coupon.discount_type === 'percentage' ? '%' : '円'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最低利用金額
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={coupon.minimum_amount}
                    onChange={(e) => setCoupon({ ...coupon, minimum_amount: e.target.value })}
                    placeholder="2000"
                  />
                </div>
              </div>
            </div>

            {/* 有効期間・使用制限 */}
            <div className="bg-indigo-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                有効期間・使用制限
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    有効開始日 *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={coupon.valid_from}
                    onChange={(e) => setCoupon({ ...coupon, valid_from: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    有効終了日
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={coupon.valid_until}
                    onChange={(e) => setCoupon({ ...coupon, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    総使用回数上限
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={coupon.usage_limit}
                    onChange={(e) => setCoupon({ ...coupon, usage_limit: e.target.value })}
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">空欄の場合は無制限</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    1人あたりの使用回数 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={coupon.user_limit}
                    onChange={(e) => setCoupon({ ...coupon, user_limit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 対象ワークショップ */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                対象ワークショップ
              </h3>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedWorkshops.size === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWorkshops(new Set())
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      すべてのワークショップで使用可能
                    </span>
                  </label>
                </div>
                
                {selectedWorkshops.size > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm text-gray-600 mb-2">特定のワークショップのみ:</p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {workshops.map((workshop) => (
                        <label key={workshop.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedWorkshops.has(workshop.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedWorkshops)
                              if (e.target.checked) {
                                newSet.add(workshop.id)
                              } else {
                                newSet.delete(workshop.id)
                              }
                              setSelectedWorkshops(newSet)
                            }}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{workshop.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ステータス */}
            <div className="flex items-center space-x-3 bg-yellow-50 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={coupon.is_active}
                  onChange={(e) => setCoupon({ ...coupon, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  作成後すぐに有効にする
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                キャンセル
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {creating ? '作成中...' : 'クーポンを作成'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}