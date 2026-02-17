'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingOverlay from '@/components/LoadingOverlay'
import { ArrowLeft, Save, Type, Link, FileText, Image as ImageIcon, Hash } from 'lucide-react'

export default function NewCategoryPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    sort_order: '0'
  })
  const [saving, setSaving] = useState(false)
  const [navigating, setNavigating] = useState(false)

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
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          image_url: formData.image_url || null,
          sort_order: parseInt(formData.sort_order) || 0
        })

      if (error) throw error

      alert('カテゴリを作成しました')
      setNavigating(true)
      router.push('/admin?tab=categories')
    } catch (error) {
      console.error('Error creating category:', error)
      alert('カテゴリの作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    setNavigating(true)
    router.push('/admin?tab=categories')
  }

  return (
    <>
      {navigating && <LoadingOverlay message="管理画面へ戻っています..." />}
      {saving && <LoadingOverlay message="カテゴリを作成しています..." />}
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
            <h2 className="text-2xl font-bold text-white">新規カテゴリ作成</h2>
            <p className="text-white/80 mt-1">ワークショップカテゴリの情報を入力してください</p>
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
                    placeholder="3Dプリンター入門"
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
                    placeholder="3d-printer-intro"
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
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">小さい数字が先に表示されます</p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-2" />
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '作成中...' : 'カテゴリを作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
