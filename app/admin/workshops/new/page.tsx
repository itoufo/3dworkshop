'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function NewWorkshopPage() {
  const router = useRouter()
  const [workshop, setWorkshop] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    max_participants: '',
    image_url: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

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
    setUploading(true)

    try {
      let imageUrl = workshop.image_url

      // 画像ファイルがある場合はアップロード
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('画像のアップロードに失敗しました')
        }

        const data = await response.json()
        imageUrl = data.imageUrl
      }

      const { error } = await supabase
        .from('workshops')
        .insert({
          title: workshop.title,
          description: workshop.description,
          price: parseInt(workshop.price),
          duration: parseInt(workshop.duration),
          max_participants: parseInt(workshop.max_participants),
          image_url: imageUrl || null
        })

      if (error) throw error

      alert('ワークショップを追加しました')
      router.push('/admin')
    } catch (error) {
      console.error('Error adding workshop:', error)
      alert('ワークショップの追加に失敗しました')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">新規ワークショップ追加</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル *
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={workshop.title}
              onChange={(e) => setWorkshop({ ...workshop, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明 *
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={workshop.description}
              onChange={(e) => setWorkshop({ ...workshop, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                価格（円） *
              </label>
              <input
                type="number"
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={workshop.price}
                onChange={(e) => setWorkshop({ ...workshop, price: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所要時間（分） *
              </label>
              <input
                type="number"
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={workshop.duration}
                onChange={(e) => setWorkshop({ ...workshop, duration: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大参加人数 *
              </label>
              <input
                type="number"
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={workshop.max_participants}
                onChange={(e) => setWorkshop({ ...workshop, max_participants: e.target.value })}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={workshop.image_url}
                  onChange={(e) => setWorkshop({ ...workshop, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  disabled={!!imageFile}
                />
                {imageFile && (
                  <p className="text-xs text-gray-500 mt-1">画像ファイルを選択中のため、URLは入力できません</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'アップロード中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}