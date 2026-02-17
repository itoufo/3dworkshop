'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WorkshopCategory } from '@/types'
import LoadingOverlay from '@/components/LoadingOverlay'
import { ArrowLeft, Save, Type, Link, FileText, Image as ImageIcon, Hash, Trash2 } from 'lucide-react'

export default function EditCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<WorkshopCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    sort_order: '0'
  })
  const [saving, setSaving] = useState(false)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    async function fetchCategory() {
      const { data, error } = await supabase
        .from('workshop_categories')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Error fetching category:', error)
      } else {
        const cat = data as WorkshopCategory
        setCategory(cat)
        setFormData({
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          image_url: cat.image_url || '',
          sort_order: cat.sort_order.toString()
        })
      }
      setLoading(false)
    }

    fetchCategory()
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.slug.match(/^[a-z0-9-]+$/)) {
      alert('スラッグは半角英数字とハイフンのみ使用できます')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('workshop_categories')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          image_url: formData.image_url || null,
          sort_order: parseInt(formData.sort_order) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error

      alert('カテゴリを更新しました')
      setNavigating(true)
      router.push('/admin?tab=categories')
    } catch (error) {
      console.error('Error updating category:', error)
      alert('カテゴリの更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('本当に削除しますか？カテゴリを削除しても、紐付いているワークショップは削除されません。')) {
      return
    }

    try {
      const { error } = await supabase
        .from('workshop_categories')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      alert('カテゴリを削除しました')
      setNavigating(true)
      router.push('/admin?tab=categories')
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('カテゴリの削除に失敗しました')
    }
  }

  const handleBack = () => {
    setNavigating(true)
    router.push('/admin?tab=categories')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">カテゴリが見つかりません</p>
          <button
            onClick={() => router.push('/admin?tab=categories')}
            className="text-purple-600 hover:underline"
          >
            管理画面へ戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {navigating && <LoadingOverlay message="管理画面へ戻っています..." />}
      {saving && <LoadingOverlay message="カテゴリを更新しています..." />}
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
            <h2 className="text-2xl font-bold text-white">カテゴリ編集</h2>
            <p className="text-white/80 mt-1">{category.name}</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-purple-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <Type className="w-5 h-5 mr-2 text-purple-600" />
                  基本情報
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリ名 *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Link className="w-4 h-4 inline mr-1" />
                    スラッグ *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                  <p className="text-xs text-gray-500 mt-1">URLに使用されます。半角英数字とハイフンのみ</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-600" />
                  説明
                </h3>
                <textarea
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none text-gray-900"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="カテゴリのピラーページに表示される説明文"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ImageIcon className="w-4 h-4 inline mr-1" />
                    画像URL
                  </label>
                  <input
                    type="url"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    並び順
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">小さい数字が先に表示されます</p>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </button>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? '更新中...' : 'カテゴリを更新'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
