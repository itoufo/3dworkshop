'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Upload, FileUp, Package, Palette, Layers, Grid3x3, AlertCircle } from 'lucide-react'

export default function New3DPrintingOrder() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [order, setOrder] = useState({
    stl_file_url: '',
    stl_file_name: '',
    file_size_mb: 0,
    material_type: 'PLA',
    material_color: 'white',
    layer_height: 0.4,
    infill_percentage: 20,
    notes: '',
    delivery_method: 'pickup'
  })
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [estimatedCost, setEstimatedCost] = useState({
    base_cost: 5000,
    material_cost: 0,
    total_cost: 5000
  })

  const materials = [
    { value: 'PLA', label: 'PLA (標準)', pricePerGram: 10, available: true },
    { value: 'ABS', label: 'ABS (耐熱)', pricePerGram: 12, available: false },
    { value: 'PETG', label: 'PETG (高強度)', pricePerGram: 15, available: true },
    { value: 'Resin', label: 'レジン (高精細)', pricePerGram: 30, available: false },
  ]

  const colors = [
    { value: 'white', label: 'ホワイト', hex: '#FFFFFF' },
    { value: 'black', label: 'ブラック', hex: '#000000' },
    { value: 'gray', label: 'グレー', hex: '#808080' },
    { value: 'red', label: 'レッド', hex: '#FF0000' },
    { value: 'blue', label: 'ブルー', hex: '#0000FF' },
    { value: 'green', label: 'グリーン', hex: '#00FF00' },
    { value: 'yellow', label: 'イエロー', hex: '#FFFF00' },
    { value: 'orange', label: 'オレンジ', hex: '#FFA500' },
  ]

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.stl')) {
      alert('STLファイルのみアップロード可能です')
      return
    }

    setUploading(true)

    try {
      // ファイルサイズを計算（MB）
      const fileSizeMB = file.size / (1024 * 1024)
      
      // Supabase Storageにアップロード
      const fileName = `${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('stl-files')
        .upload(fileName, file)

      if (error) throw error

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('stl-files')
        .getPublicUrl(fileName)

      setOrder(prev => ({
        ...prev,
        stl_file_url: publicUrl,
        stl_file_name: file.name,
        file_size_mb: fileSizeMB
      }))

      // 仮の材料費計算（ファイルサイズベース）
      const estimatedWeight = fileSizeMB * 5 // 仮の重量計算
      const material = materials.find(m => m.value === order.material_type)
      const materialCost = Math.round(estimatedWeight * (material?.pricePerGram || 10))
      
      setEstimatedCost({
        base_cost: 5000,
        material_cost: materialCost,
        total_cost: 5000 + materialCost
      })

    } catch (error) {
      console.error('Error uploading file:', error)
      alert('ファイルのアップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!order.stl_file_url) {
      alert('STLファイルをアップロードしてください')
      return
    }

    setLoading(true)

    try {
      // 顧客情報を保存または更新
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          email: customerInfo.email,
          name: customerInfo.name,
          phone: customerInfo.phone,
        }, {
          onConflict: 'email'
        })
        .select()
        .single()

      if (customerError) throw customerError

      // 注文番号を生成
      const orderNumber = `3DP-${Date.now()}`

      // 注文を作成
      const { data: printingOrder, error: orderError } = await supabase
        .from('printing_orders')
        .insert({
          customer_id: customer.id,
          order_number: orderNumber,
          status: 'pending',
          ...order,
          ...estimatedCost,
          estimated_print_time_hours: Math.round(order.file_size_mb * 2) // 仮の計算
        })
        .select()
        .single()

      if (orderError) throw orderError

      // メール送信
      await fetch('/api/send-3d-printing-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: printingOrder,
          customer: customer
        })
      })

      alert('注文を受け付けました。確認メールをお送りしました。')
      router.push('/products')

    } catch (error) {
      console.error('Error creating order:', error)
      alert('注文の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {(loading || uploading) && <LoadingOverlay message={uploading ? 'ファイルをアップロード中...' : '注文を処理中...'} />}
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <Header />
        
        <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">3Dプリント制作依頼</h1>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* STLファイルアップロード */}
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileUp className="w-6 h-6 mr-2 text-purple-600" />
                  STLファイルアップロード
                </h2>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    accept=".stl"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="stl-upload"
                  />
                  <label htmlFor="stl-upload" className="cursor-pointer">
                    {order.stl_file_name ? (
                      <div>
                        <Package className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                        <p className="text-gray-900 font-medium">{order.stl_file_name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          ファイルサイズ: {order.file_size_mb.toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600">
                          クリックしてSTLファイルを選択
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          または、ここにドラッグ&ドロップ
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* 印刷設定 */}
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">印刷設定</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 材料 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Package className="w-4 h-4 inline mr-1" />
                      材料
                    </label>
                    <select
                      value={order.material_type}
                      onChange={(e) => setOrder({ ...order, material_type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    >
                      {materials.map(material => (
                        <option 
                          key={material.value} 
                          value={material.value}
                          disabled={!material.available}
                        >
                          {material.label} - ¥{material.pricePerGram}/g
                          {!material.available && ' (売り切れ)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 色 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Palette className="w-4 h-4 inline mr-1" />
                      色
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setOrder({ ...order, material_color: color.value })}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            order.material_color === color.value 
                              ? 'border-purple-600 scale-110' 
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 積層ピッチ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Layers className="w-4 h-4 inline mr-1" />
                      積層ピッチ
                    </label>
                    <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
                      <span className="text-gray-900">0.4mm (固定)</span>
                    </div>
                  </div>

                  {/* 充填率 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Grid3x3 className="w-4 h-4 inline mr-1" />
                      充填率
                    </label>
                    <select
                      value={order.infill_percentage}
                      onChange={(e) => setOrder({ ...order, infill_percentage: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="10">10% (軽量)</option>
                      <option value="20">20% (標準)</option>
                      <option value="50">50% (高強度)</option>
                      <option value="100">100% (最大強度)</option>
                    </select>
                  </div>
                </div>

                {/* 備考 */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    備考・特記事項
                  </label>
                  <textarea
                    value={order.notes}
                    onChange={(e) => setOrder({ ...order, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="特別な要望があればご記入ください"
                  />
                </div>
              </div>

              {/* 顧客情報 */}
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">お客様情報</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      お名前 *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      電話番号
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* 料金見積もり */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">料金見積もり（概算）</h2>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">基本料金</span>
                    <span className="font-medium">¥{estimatedCost.base_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">材料費（概算）</span>
                    <span className="font-medium">¥{estimatedCost.material_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-purple-200">
                    <span className="text-lg font-bold">合計（概算）</span>
                    <span className="text-lg font-bold">¥{estimatedCost.total_cost.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex items-start space-x-2 text-sm text-purple-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    正確な料金は、STLファイルの解析後にお知らせいたします。
                    上記は概算料金です。
                  </p>
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!order.stl_file_url || loading}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  注文を確定する
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  )
}