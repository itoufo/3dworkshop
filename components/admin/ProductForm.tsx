'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingOverlay from '@/components/LoadingOverlay'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import {
  ACCEPTED_MEDIA_TYPES,
  MAX_MEDIA_FILE_SIZE,
  imageUrlsOnly,
  isVideoUrl,
} from '@/lib/media'
import { ArrowLeft, Save, Type, ImagePlus, Star, Trash2, Plus, Video } from 'lucide-react'
import type { Product } from '@/lib/products'

interface SpecRow {
  key: string
  value: string
}

interface Props {
  product?: Product
}

/** 物販商品の作成・編集フォーム。写真は複数枚アップロードでき、先頭の1枚が一覧・OG画像になる */
export default function ProductForm({ product }: Props) {
  const router = useRouter()
  const isEdit = Boolean(product)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [navigating, setNavigating] = useState(false)
  // 写真と動画を表示順のまま1本の配列で持つ。先頭がメイン
  const [media, setMedia] = useState<string[]>(
    product?.media_urls?.length ? product.media_urls : (product?.image_urls ?? [])
  )
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [specs, setSpecs] = useState<SpecRow[]>(
    Object.entries(product?.specifications ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  )
  const [formData, setFormData] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    base_price: product ? String(product.base_price) : '',
    // 空欄 = 在庫管理をしない（受注製作）
    stock_quantity: product?.stock_quantity != null ? String(product.stock_quantity) : '',
    is_active: product?.is_active ?? true,
  })

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const [index, file] of files.entries()) {
        setUploadProgress(`${index + 1} / ${files.length} 件目「${file.name}」を送信中...`)

        if (file.size > MAX_MEDIA_FILE_SIZE) {
          throw new Error(
            `「${file.name}」は ${(file.size / 1024 / 1024).toFixed(1)}MB あります。1ファイル ${MAX_MEDIA_FILE_SIZE / 1024 / 1024}MB までです。`
          )
        }
        if (!(ACCEPTED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
          throw new Error(`「${file.name}」は登録できない形式です（${file.type || '不明'}）。`)
        }

        // 動画は大きいので、API を経由せずブラウザから Supabase Storage へ直接送る。
        // その許可証（署名付きURL）だけを管理APIから受け取る
        const signRes = await fetch('/api/admin/product-media/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: file.type, size: file.size }),
        })
        const signed = await signRes.json()
        if (!signRes.ok) {
          throw new Error(signed.message || 'アップロードURLの発行に失敗しました')
        }

        const { error: uploadError } = await supabase.storage
          .from(signed.bucket)
          .uploadToSignedUrl(signed.path, signed.token, file, {
            contentType: file.type,
            // ファイル名は毎回ユニークなので長期キャッシュで安全
            cacheControl: '31536000, immutable',
          })
        if (uploadError) {
          throw new Error(`「${file.name}」のアップロードに失敗しました: ${uploadError.message}`)
        }

        uploaded.push(signed.publicUrl)
      }
      setMedia((prev) => [...prev, ...uploaded])
    } catch (error) {
      console.error('Error uploading media:', error)
      alert(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      e.target.value = ''
    }
  }

  function removeMedia(url: string) {
    setMedia((prev) => prev.filter((u) => u !== url))
  }

  function makeMainMedia(url: string) {
    setMedia((prev) => [url, ...prev.filter((u) => u !== url)])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const price = parseInt(formData.base_price)
    if (!(price >= 0)) {
      alert('価格を正しく入力してください')
      return
    }

    const specifications = specs.reduce<Record<string, string>>((acc, row) => {
      if (row.key.trim()) acc[row.key.trim()] = row.value
      return acc
    }, {})

    const payload = {
      name: formData.name,
      description: formData.description || null,
      category: 'product',
      base_price: price,
      media_urls: media,
      // 旧カラム。写真だけを入れて過去の参照が壊れないようにしておく
      image_urls: imageUrlsOnly(media),
      specifications,
      is_active: formData.is_active,
      stock_quantity: formData.stock_quantity.trim() === '' ? null : parseInt(formData.stock_quantity) || 0,
    }

    setSaving(true)
    try {
      const { error } = isEdit
        ? await supabase.from('products').update(payload).eq('id', product!.id)
        : await supabase.from('products').insert(payload)

      if (error) throw error

      alert(isEdit ? '商品を更新しました' : '商品を作成しました')
      setNavigating(true)
      router.push('/admin/products')
      router.refresh()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('商品の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {navigating && <LoadingOverlay message="商品管理へ戻っています..." />}
      {saving && <LoadingOverlay message="保存しています..." />}
      {uploading && <LoadingOverlay message={uploadProgress ?? 'アップロードしています...'} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => {
            setNavigating(true)
            router.push('/admin/products')
          }}
          className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          商品管理に戻る
        </button>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <h2 className="text-2xl font-bold text-white">{isEdit ? '商品を編集' : '新規商品作成'}</h2>
            <p className="text-white/80 mt-1">{SHIPPING_LEAD_TIME_TEXT}する物販商品として公開されます</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-purple-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <Type className="w-5 h-5 mr-2 text-purple-600" />
                  基本情報
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品名 *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="オリジナル3Dプリント置物"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品説明</label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="素材・サイズ・使い方など"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">価格（税込・円） *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      placeholder="3500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">在庫数</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="空欄なら受注製作"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      空欄にすると在庫管理をせず「受注製作」として販売し続けます。数値を入れると購入のたびに自動で減ります。
                    </p>
                  </div>
                </div>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded"
                  />
                  <span className="text-gray-900 font-medium">公開する（商品一覧・商品ページに表示）</span>
                </label>
              </div>

              <div className="bg-pink-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-2">
                  <ImagePlus className="w-5 h-5 mr-2 text-pink-600" />
                  商品写真・動画（複数可）
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>写真 JPEG / PNG / WebP、動画 MP4 / WebM / MOV。1ファイル {MAX_MEDIA_FILE_SIZE / 1024 / 1024}MB まで。</p>
                  <p>並び順のとおりに商品ページへ表示されます。先頭がメインです。</p>
                  <p>
                    一覧のサムネイルと SNS シェア時の画像には<strong>最初の写真</strong>が使われます（動画は使えません）。
                    {media.length > 0 && imageUrlsOnly(media).length === 0 && (
                      <span className="text-red-600">写真が1枚もありません。写真を1枚は登録してください。</span>
                    )}
                  </p>
                </div>

                <input
                  type="file"
                  accept={ACCEPTED_MEDIA_TYPES.join(',')}
                  multiple
                  onChange={handleMediaSelect}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />

                {media.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {media.map((url, index) => (
                      <div key={url} className="relative group">
                        <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow bg-black">
                          {isVideoUrl(url) ? (
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                              controls
                            />
                          ) : (
                            <Image
                              src={optimizeImageUrl(url, 60)}
                              alt={`商品写真 ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="25vw"
                            />
                          )}
                        </div>
                        <div className="absolute top-2 left-2 flex gap-1">
                          {index === 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-xs">メイン</span>
                          )}
                          {isVideoUrl(url) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-900/80 text-white text-xs">
                              <Video className="w-3 h-3 mr-1" />
                              動画
                            </span>
                          )}
                        </div>
                        <div className="flex justify-center space-x-2 mt-2">
                          {index !== 0 && (
                            <button
                              type="button"
                              onClick={() => makeMainMedia(url)}
                              className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:border-purple-500"
                            >
                              <Star className="w-3 h-3 mr-1" />
                              メインに
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(url)}
                            className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">商品仕様（任意）</h3>
                <p className="text-sm text-gray-600">「素材」「サイズ」など、商品ページに表の形で並びます。</p>

                {specs.map((row, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      className="w-40 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={row.key}
                      onChange={(e) => {
                        const next = [...specs]
                        next[index] = { ...row, key: e.target.value }
                        setSpecs(next)
                      }}
                      placeholder="素材"
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={row.value}
                      onChange={(e) => {
                        const next = [...specs]
                        next[index] = { ...row, value: e.target.value }
                        setSpecs(next)
                      }}
                      placeholder="PLA樹脂"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl"
                      aria-label="この行を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setSpecs([...specs, { key: '', value: '' }])}
                  className="inline-flex items-center px-4 py-2 text-sm rounded-full border-2 border-gray-300 text-gray-700 hover:border-purple-500"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  項目を追加
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? '更新する' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
