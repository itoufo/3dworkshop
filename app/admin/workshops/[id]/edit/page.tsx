'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const LexicalRichTextEditor = dynamic(() => import('@/components/LexicalRichTextEditor'), {
  ssr: false,
})

export default function EditWorkshop() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rich_description: '',
    price: '',
    duration: '',
    max_participants: '',
    location: '',
    image_url: '',
    event_date: '',
    event_time: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWorkshop() {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Error fetching workshop:', error)
      } else {
        const workshopData = data as Workshop
        setWorkshop(workshopData)
        setFormData({
          title: workshopData.title,
          description: workshopData.description,
          rich_description: workshopData.rich_description || '',
          price: workshopData.price.toString(),
          duration: workshopData.duration.toString(),
          max_participants: workshopData.max_participants.toString(),
          location: workshopData.location || '',
          image_url: workshopData.image_url || '',
          event_date: workshopData.event_date || '',
          event_time: workshopData.event_time || ''
        })
        if (workshopData.image_url) {
          setImagePreview(workshopData.image_url)
        }
      }
      setLoading(false)
    }
    
    fetchWorkshop()
  }, [params.id])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // 価格のバリデーション
    if (parseInt(formData.price) < 50) {
      alert('価格は50円以上で設定してください')
      return
    }
    
    setSaving(true)

    try {
      let imageUrl = formData.image_url

      // 新しい画像がアップロードされた場合
      if (imageFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', imageFile)

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formDataUpload
        })

        if (!response.ok) {
          throw new Error('画像のアップロードに失敗しました')
        }

        const data = await response.json()
        imageUrl = data.imageUrl
      }

      const { error } = await supabase
        .from('workshops')
        .update({
          title: formData.title,
          description: formData.description,
          rich_description: formData.rich_description || null,
          price: parseInt(formData.price),
          duration: parseInt(formData.duration),
          max_participants: parseInt(formData.max_participants),
          location: formData.location,
          image_url: imageUrl,
          event_date: formData.event_date || null,
          event_time: formData.event_time || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error

      alert('ワークショップを更新しました')
      router.push('/admin')
    } catch (error) {
      console.error('Error updating workshop:', error)
      alert('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('本当に削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      alert('ワークショップを削除しました')
      router.push('/admin')
    } catch (error) {
      console.error('Error deleting workshop:', error)
      alert('削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">ワークショップが見つかりません</p>
          <button
            onClick={() => router.push('/admin')}
            className="text-indigo-600 hover:underline"
          >
            管理画面へ戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ワークショップ編集</h1>
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 戻る
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                簡潔な説明 *
              </label>
              <textarea
                required
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="一覧に表示される簡潔な説明"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                詳細説明
              </label>
              <LexicalRichTextEditor
                content={formData.rich_description}
                onChange={(content) => setFormData({ ...formData, rich_description: content })}
                placeholder="ワークショップの詳細な内容を入力してください。太字、見出し、リスト、画像などが使用できます。"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開催日 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻 *
                </label>
                <input
                  type="time"
                  required
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  価格（円） *
                </label>
                <input
                  type="number"
                  required
                  min="50"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="最低50円から"
                />
                <p className="text-xs text-gray-500 mt-1">Stripeの最低決済金額は50円です</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  所要時間（分） *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最大参加人数 *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開催場所
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メイン画像
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500">JPEG, PNG, WebP形式 (最大5MB)</p>
                
                {imagePreview && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 mb-2">プレビュー:</p>
                    <div className="relative w-full h-48">
                      <Image
                        src={imagePreview}
                        alt="プレビュー"
                        fill
                        className="object-cover rounded-md"
                        unoptimized={imagePreview.startsWith('data:')}
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    または画像URLを入力
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value })
                      if (e.target.value && !imageFile) {
                        setImagePreview(e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://example.com/image.jpg"
                    disabled={!!imageFile}
                  />
                  {imageFile && (
                    <p className="text-xs text-gray-500 mt-1">画像ファイルを選択中のため、URLは入力できません</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                削除
              </button>

              <div className="space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? '保存中...' : '更新'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}