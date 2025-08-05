'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import LoadingOverlay from '@/components/LoadingOverlay'
import { ArrowLeft, Upload, Calendar, Clock, MapPin, Users, CreditCard, Type, FileImage, Save } from 'lucide-react'

const LexicalRichTextEditor = dynamic(() => import('@/components/LexicalRichTextEditor'), {
  ssr: false,
})

export default function NewWorkshopPage() {
  const router = useRouter()
  const [workshop, setWorkshop] = useState({
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
  const [uploading, setUploading] = useState(false)
  const [navigating, setNavigating] = useState(false)

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
    if (parseInt(workshop.price) < 50) {
      alert('価格は50円以上で設定してください')
      return
    }
    
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
          rich_description: workshop.rich_description || null,
          price: parseInt(workshop.price),
          duration: parseInt(workshop.duration),
          max_participants: parseInt(workshop.max_participants),
          location: workshop.location || null,
          image_url: imageUrl || null,
          event_date: workshop.event_date || null,
          event_time: workshop.event_time || null
        })

      if (error) throw error

      alert('ワークショップを追加しました')
      setNavigating(true)
      router.push('/admin')
    } catch (error) {
      console.error('Error adding workshop:', error)
      alert('ワークショップの追加に失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const handleBack = () => {
    setNavigating(true)
    router.push('/admin')
  }

  return (
    <>
      {navigating && <LoadingOverlay message="管理画面へ戻っています..." />}
      {uploading && <LoadingOverlay message="ワークショップを作成しています..." />}
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
          <h2 className="text-2xl font-bold text-white">新規ワークショップ作成</h2>
          <p className="text-white/80 mt-1">新しいワークショップの情報を入力してください</p>
        </div>
        
        <div className="p-8">
        
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-purple-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Type className="w-5 h-5 mr-2 text-purple-600" />
                基本情報
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  value={workshop.title}
                  onChange={(e) => setWorkshop({ ...workshop, title: e.target.value })}
                  placeholder="3Dプリンター入門ワークショップ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  簡潔な説明 *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  value={workshop.description}
                  onChange={(e) => setWorkshop({ ...workshop, description: e.target.value })}
                  placeholder="ワークショップの概要を簡潔に説明してください"
                />
                <p className="text-xs text-gray-500 mt-1">一覧ページに表示されます</p>
              </div>
            </div>

            {/* 詳細説明 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileImage className="w-5 h-5 mr-2 text-purple-600" />
                詳細説明
              </h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <LexicalRichTextEditor
                  content={workshop.rich_description}
                  onChange={(content) => setWorkshop({ ...workshop, rich_description: content })}
                  placeholder="ワークショップの詳細な内容を入力してください。太字、見出し、リスト、画像などが使用できます。"
                />
              </div>
            </div>

            {/* 開催情報 */}
            <div className="bg-pink-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Calendar className="w-5 h-5 mr-2 text-pink-600" />
                開催情報
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    開催日 *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={workshop.event_date}
                    onChange={(e) => setWorkshop({ ...workshop, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    開始時刻 *
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={workshop.event_time}
                    onChange={(e) => setWorkshop({ ...workshop, event_time: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  開催場所
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  value={workshop.location}
                  onChange={(e) => setWorkshop({ ...workshop, location: e.target.value })}
                  placeholder="例: 東京都渋谷区○○ 1-2-3 ビル4F"
                />
              </div>
            </div>

            {/* 価格・人数設定 */}
            <div className="bg-indigo-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <CreditCard className="w-5 h-5 mr-2 text-indigo-600" />
                価格・人数設定
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    価格（円） *
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={workshop.price}
                    onChange={(e) => setWorkshop({ ...workshop, price: e.target.value })}
                    placeholder="3000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Stripeの最低金額は50円</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    所要時間（分） *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={workshop.duration}
                    onChange={(e) => setWorkshop({ ...workshop, duration: e.target.value })}
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    最大参加人数 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={workshop.max_participants}
                    onChange={(e) => setWorkshop({ ...workshop, max_participants: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            {/* メイン画像 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-purple-600" />
                メイン画像
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-purple-400 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600">クリックして画像を選択</p>
                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP (最大5MB)</p>
                  </div>
                </label>
                
                {imagePreview && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">プレビュー:</p>
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="プレビュー"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  または画像URLを入力
                </label>
                <input
                  type="url"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                disabled={uploading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {uploading ? 'アップロード中...' : 'ワークショップを作成'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  )
}