'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Coupon } from '@/types'
import { ArrowLeft, Tag, CreditCard, Calendar, Save, Shield, AlertCircle } from 'lucide-react'

export default function EditCouponPage() {
  const params = useParams()
  const router = useRouter()
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: '',
    minimum_amount: '',
    usage_limit: '',
    user_limit: '1',
    valid_from: '',
    valid_until: '',
    is_active: true,
    workshop_ids: [] as string[]
  })
  const [selectedWorkshops, setSelectedWorkshops] = useState<Set<string>>(new Set())
  const [workshops] = useState<{id: string; title: string}[]>([])
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCoupon() {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error

        if (data) {
          setCoupon(data as Coupon)
          setFormData({
            code: data.code,
            description: data.description || '',
            discount_type: data.discount_type,
            discount_value: data.discount_value.toString(),
            minimum_amount: data.minimum_amount?.toString() || '',
            usage_limit: data.usage_limit?.toString() || '',
            user_limit: data.user_limit?.toString() || '1',
            valid_from: data.valid_from.split('T')[0],
            valid_until: data.valid_until ? data.valid_until.split('T')[0] : '',
            is_active: data.is_active,
            workshop_ids: data.workshop_ids || []
          })
          if (data.workshop_ids) {
            setSelectedWorkshops(new Set(data.workshop_ids))
          }
        }
      } catch (error) {
        console.error('Error fetching coupon:', error)
        alert('クーポン情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCoupon()
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    setUpdating(true)

    try {
      const { error } = await supabase
        .from('coupons')
        .update({
          code: formData.code.toUpperCase(),
          description: formData.description || null,
          discount_type: formData.discount_type,
          discount_value: parseInt(formData.discount_value),
          minimum_amount: formData.minimum_amount ? parseInt(formData.minimum_amount) : null,
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          user_limit: parseInt(formData.user_limit),
          valid_from: formData.valid_from,
          valid_until: formData.valid_until || null,
          is_active: formData.is_active,
          workshop_ids: selectedWorkshops.size > 0 ? Array.from(selectedWorkshops) : null
        })
        .eq('id', params.id)

      if (error) throw error

      alert('クーポンを更新しました')
      router.push('/admin')
    } catch (error) {
      console.error('Error updating coupon:', error)
      alert('クーポンの更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!coupon) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">クーポンが見つかりません</p>
      </div>
    )
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
          <h2 className="text-2xl font-bold text-white">クーポン編集</h2>
          <p className="text-white/80 mt-1">クーポンの設定を変更します</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 使用状況 */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                使用状況
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">使用回数</p>
                  <p className="text-2xl font-bold text-gray-900">{coupon.usage_count}回</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">使用率</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {coupon.usage_limit 
                      ? `${Math.round((coupon.usage_count / coupon.usage_limit) * 100)}%`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ステータス</p>
                  <p className="text-2xl font-bold">
                    {coupon.is_active ? (
                      <span className="text-green-600">有効</span>
                    ) : (
                      <span className="text-gray-400">無効</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

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
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    onClick={() => setFormData({ ...formData, discount_type: 'percentage' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.discount_type === 'percentage'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">パーセント割引</div>
                    <div className="text-xs text-gray-500 mt-1">例: 20%OFF</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'fixed_amount' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.discount_type === 'fixed_amount'
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
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      {formData.discount_type === 'percentage' ? '%' : '円'}
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
                    value={formData.minimum_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_amount: e.target.value })}
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
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    有効終了日
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
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
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
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
                    value={formData.user_limit}
                    onChange={(e) => setFormData({ ...formData, user_limit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ステータス */}
            <div className="flex items-center space-x-3 bg-yellow-50 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  クーポンを有効にする
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
                disabled={updating}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {updating ? '更新中...' : '変更を保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}