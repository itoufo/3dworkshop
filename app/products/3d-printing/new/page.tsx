'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Upload, FileUp, Package, Palette, Ruler, Hash, AlertCircle, Truck, Info } from 'lucide-react'

// サイズ定義
const sizes = [
  { value: 'S', label: 'Sサイズ', dimension: '5cm', basePrice1: 5000, basePrice100: 3000, basePrice1000: 2000 },
  { value: 'M', label: 'Mサイズ', dimension: '10cm', basePrice1: 7500, basePrice100: 4500, basePrice1000: 3000 },
  { value: 'L', label: 'Lサイズ', dimension: '15cm', basePrice1: 10000, basePrice100: 6000, basePrice1000: 4000 },
]

// フィラメント定義
const materials = [
  { value: 'PLA', label: 'PLA', description: '標準・初心者向け' },
  { value: 'TPU', label: 'TPU', description: '柔軟性あり' },
  { value: 'ABS', label: 'ABS', description: '耐熱・耐衝撃' },
]

// 色定義
const colors = [
  { value: 'white', label: 'ホワイト', hex: '#FFFFFF' },
  { value: 'black', label: 'ブラック', hex: '#1a1a1a' },
  { value: 'custom', label: 'その他（特注）', hex: null },
]

// 数量による単価計算（対数スケール）
function calculateUnitPrice(quantity: number, size: typeof sizes[0]): number {
  if (quantity <= 1) return size.basePrice1
  if (quantity >= 1000) return size.basePrice1000

  // 対数補間: price = base1 - (log10(qty) / log10(1000)) * (base1 - base1000)
  const logQty = Math.log10(quantity)
  const logMax = Math.log10(1000)
  const ratio = logQty / logMax
  const unitPrice = size.basePrice1 - ratio * (size.basePrice1 - size.basePrice1000)

  return Math.round(unitPrice)
}

export default function New3DPrintingOrder() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [order, setOrder] = useState({
    stl_file_url: '',
    stl_file_name: '',
    file_size_mb: 0,
    size: 'S' as 'S' | 'M' | 'L',
    quantity: 1,
    material_type: 'PLA',
    material_color: 'white',
    custom_color_request: '',
    notes: '',
  })
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // 選択されたサイズの情報を取得
  const selectedSize = sizes.find(s => s.value === order.size) || sizes[0]

  // 料金計算
  const unitPrice = calculateUnitPrice(order.quantity, selectedSize)
  const materialCost = unitPrice * order.quantity
  const baseCost = 5000
  const shippingCost = 0 // 送料無料
  const totalCost = baseCost + materialCost + shippingCost

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.stl')) {
      alert('STLファイルのみアップロード可能です')
      return
    }

    setUploading(true)

    try {
      const fileSizeMB = file.size / (1024 * 1024)
      const fileName = `${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('stl-files')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('stl-files')
        .getPublicUrl(fileName)

      setOrder(prev => ({
        ...prev,
        stl_file_url: publicUrl,
        stl_file_name: file.name,
        file_size_mb: fileSizeMB
      }))

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

    if (order.material_color === 'custom' && !order.custom_color_request) {
      alert('希望する色を備考欄に記載してください')
      return
    }

    setLoading(true)

    try {
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

      const orderNumber = `3DP-${Date.now()}`

      const { data: printingOrder, error: orderError } = await supabase
        .from('printing_orders')
        .insert({
          customer_id: customer.id,
          order_number: orderNumber,
          status: 'pending',
          stl_file_url: order.stl_file_url,
          stl_file_name: order.stl_file_name,
          file_size_mb: order.file_size_mb,
          material_type: order.material_type,
          material_color: order.material_color === 'custom' ? `特注: ${order.custom_color_request}` : order.material_color,
          layer_height: 0.4,
          infill_percentage: 20,
          notes: order.notes + (order.material_color === 'custom' ? `\n希望フィラメント: ${order.custom_color_request}` : ''),
          delivery_method: 'shipping',
          base_cost: baseCost,
          material_cost: materialCost,
          total_cost: totalCost,
          // 新しいフィールド
          print_size: order.size,
          print_quantity: order.quantity,
          unit_price: unitPrice,
        })
        .select()
        .single()

      if (orderError) throw orderError

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">3Dプリント制作依頼</h1>
            <p className="text-gray-600 mb-8">STLファイルをアップロードして、3Dプリント制作を依頼できます</p>

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
                        <p className="text-sm text-purple-600 mt-2">クリックして変更</p>
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

                <div className="space-y-6">
                  {/* サイズ選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Ruler className="w-4 h-4 inline mr-1" />
                      サイズ
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {sizes.map(size => (
                        <button
                          key={size.value}
                          type="button"
                          onClick={() => setOrder({ ...order, size: size.value as 'S' | 'M' | 'L' })}
                          className={`p-4 rounded-xl border-2 transition-all text-center ${
                            order.size === size.value
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <span className="block text-lg font-bold text-gray-900">{size.label}</span>
                          <span className="block text-sm text-gray-500">{size.dimension}</span>
                          <span className="block text-xs text-purple-600 mt-1">
                            ¥{size.basePrice1.toLocaleString()}〜
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 数量 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Hash className="w-4 h-4 inline mr-1" />
                      数量（1〜20個）
                    </label>
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => setOrder({ ...order, quantity: Math.max(1, order.quantity - 1) })}
                        className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-purple-600 transition-colors flex items-center justify-center text-xl font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={order.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1
                          setOrder({ ...order, quantity: Math.min(20, Math.max(1, val)) })
                        }}
                        className="w-20 text-center text-xl font-bold border-2 border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setOrder({ ...order, quantity: Math.min(20, order.quantity + 1) })}
                        className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-purple-600 transition-colors flex items-center justify-center text-xl font-bold"
                      >
                        +
                      </button>
                      <span className="text-gray-500">個</span>
                    </div>
                    {order.quantity > 1 && (
                      <p className="text-sm text-purple-600 mt-2">
                        数量が多いほど単価がお得になります！（単価: ¥{unitPrice.toLocaleString()}/個）
                      </p>
                    )}
                  </div>

                  {/* フィラメント */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Package className="w-4 h-4 inline mr-1" />
                      フィラメント
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {materials.map(material => (
                        <button
                          key={material.value}
                          type="button"
                          onClick={() => setOrder({ ...order, material_type: material.value })}
                          className={`p-4 rounded-xl border-2 transition-all text-center ${
                            order.material_type === material.value
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <span className="block font-bold text-gray-900">{material.label}</span>
                          <span className="block text-xs text-gray-500">{material.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 色 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Palette className="w-4 h-4 inline mr-1" />
                      色
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {colors.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setOrder({ ...order, material_color: color.value })}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl border-2 transition-all ${
                            order.material_color === color.value
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {color.hex ? (
                            <span
                              className="w-6 h-6 rounded-full border border-gray-300"
                              style={{ backgroundColor: color.hex }}
                            />
                          ) : (
                            <span className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                              <span className="text-xs">?</span>
                            </span>
                          )}
                          <span className="font-medium text-gray-900">{color.label}</span>
                        </button>
                      ))}
                    </div>

                    {order.material_color === 'custom' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          希望する色・フィラメント
                        </label>
                        <input
                          type="text"
                          value={order.custom_color_request}
                          onChange={(e) => setOrder({ ...order, custom_color_request: e.target.value })}
                          placeholder="例: シルバー、木目調、蓄光など"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          特殊なフィラメントは追加料金がかかる場合があります
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 塗装 */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">塗装について</p>
                        <p className="text-sm text-gray-500">塗装オプションは現在対応しておりません</p>
                      </div>
                    </div>
                  </div>

                  {/* 備考 */}
                  <div>
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">料金</h2>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">基本手数料</span>
                    <span className="font-medium">¥{baseCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      材料費（{selectedSize.label} × {order.quantity}個）
                    </span>
                    <span className="font-medium">¥{materialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span className="ml-4">└ 単価: ¥{unitPrice.toLocaleString()}/個</span>
                    <span></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 flex items-center">
                      <Truck className="w-4 h-4 mr-1" />
                      送料
                    </span>
                    <span className="font-medium text-green-600">無料</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-purple-200">
                    <span className="text-lg font-bold">合計</span>
                    <span className="text-2xl font-bold text-purple-700">¥{totalCost.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-start space-x-2 text-sm text-purple-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    特注フィラメントをご希望の場合、別途追加料金が発生する場合があります。
                    確認後、正式な金額をご連絡いたします。
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
