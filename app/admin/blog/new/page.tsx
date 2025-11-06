'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import LoadingOverlay from '@/components/LoadingOverlay'
import { ArrowLeft, Upload, Save, BookOpen, Type, Tag, User, Calendar } from 'lucide-react'

const LexicalRichTextEditor = dynamic(() => import('@/components/LexicalRichTextEditor'), {
  ssr: false,
})

export default function NewBlogPostPage() {
  const router = useRouter()
  const [blogPost, setBlogPost] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featured_image_url: '',
    category: '',
    tags: '',
    author_name: '',
    is_published: false
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

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  function handleTitleChange(title: string) {
    setBlogPost({
      ...blogPost,
      title,
      slug: blogPost.slug || generateSlug(title)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!blogPost.title || !blogPost.content) {
      alert('タイトルと本文は必須です')
      return
    }

    setUploading(true)

    try {
      let imageUrl = blogPost.featured_image_url

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

      // タグを配列に変換
      const tagsArray = blogPost.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { error } = await supabase
        .from('blog_posts')
        .insert({
          title: blogPost.title,
          slug: blogPost.slug || generateSlug(blogPost.title),
          content: blogPost.content,
          excerpt: blogPost.excerpt || null,
          featured_image_url: imageUrl || null,
          category: blogPost.category || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          author_name: blogPost.author_name || null,
          is_published: blogPost.is_published,
          published_at: blogPost.is_published ? new Date().toISOString() : null
        })

      if (error) throw error

      alert('ブログ記事を作成しました')
      setNavigating(true)
      router.push('/admin')
    } catch (error) {
      console.error('Error creating blog post:', error)
      alert('ブログ記事の作成に失敗しました')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {(uploading || navigating) && <LoadingOverlay message={uploading ? 'アップロード中...' : 'ページを読み込んでいます...'} />}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-purple-600 hover:text-purple-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">新規ブログ記事作成</h1>
              <p className="text-sm text-gray-500">記事の情報を入力してください</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* タイトル */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Type className="w-4 h-4 mr-2" />
                タイトル <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                value={blogPost.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="記事のタイトルを入力"
                required
              />
            </div>

            {/* スラッグ */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Type className="w-4 h-4 mr-2" />
                スラッグ（URL用）
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                value={blogPost.slug}
                onChange={(e) => setBlogPost({ ...blogPost, slug: e.target.value })}
                placeholder="url-friendly-slug"
              />
              <p className="text-xs text-gray-500 mt-1">
                空欄の場合はタイトルから自動生成されます
              </p>
            </div>

            {/* 概要 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Type className="w-4 h-4 mr-2" />
                概要
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 resize-none"
                value={blogPost.excerpt}
                onChange={(e) => setBlogPost({ ...blogPost, excerpt: e.target.value })}
                placeholder="記事の簡単な説明（一覧ページで表示されます）"
                rows={3}
              />
            </div>

            {/* 本文 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 mr-2" />
                本文 <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <LexicalRichTextEditor
                  initialContent={blogPost.content}
                  onChange={(content) => setBlogPost({ ...blogPost, content })}
                  placeholder="記事の本文を入力してください..."
                />
              </div>
            </div>

            {/* アイキャッチ画像 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 mr-2" />
                アイキャッチ画像
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="text-sm text-gray-700">画像を選択</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="プレビュー"
                    className="w-32 h-32 object-cover rounded-xl border border-gray-200"
                  />
                )}
              </div>
            </div>

            {/* カテゴリー */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 mr-2" />
                  カテゴリー
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                  value={blogPost.category}
                  onChange={(e) => setBlogPost({ ...blogPost, category: e.target.value })}
                  placeholder="チュートリアル、ニュースなど"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  著者名
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                  value={blogPost.author_name}
                  onChange={(e) => setBlogPost({ ...blogPost, author_name: e.target.value })}
                  placeholder="3DLab スタッフ"
                />
              </div>
            </div>

            {/* タグ */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 mr-2" />
                タグ
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                value={blogPost.tags}
                onChange={(e) => setBlogPost({ ...blogPost, tags: e.target.value })}
                placeholder="3Dプリンタ, 初心者, チュートリアル（カンマ区切り）"
              />
            </div>

            {/* 公開設定 */}
            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-xl">
              <input
                type="checkbox"
                id="is_published"
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                checked={blogPost.is_published}
                onChange={(e) => setBlogPost({ ...blogPost, is_published: e.target.checked })}
              />
              <label htmlFor="is_published" className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                <Calendar className="w-4 h-4 mr-2" />
                すぐに公開する
              </label>
            </div>

            {/* 送信ボタン */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5 mr-2" />
                {blogPost.is_published ? '公開する' : '下書き保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
