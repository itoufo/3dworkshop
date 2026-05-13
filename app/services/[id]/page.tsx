import { notFound } from 'next/navigation'
import Image from 'next/image'
import Header from '@/components/Header'
import ServiceRequestForm from '@/components/ServiceRequestForm'
import { getService } from '@/lib/services'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { Sparkles, RotateCw } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const service = await getService(id)
  if (!service) return { title: 'サービスが見つかりません | 3DLab' }
  const typeLabel = service.type === 'reprint' ? '追加印刷' : 'オーダーメイド'
  return {
    title: `${service.title} | ${typeLabel} | 3DLab`,
    description: service.description || `${typeLabel}サービス: ${service.title}`,
  }
}

export default async function ServicePage({ params }: PageProps) {
  const { id } = await params
  const service = await getService(id)
  if (!service || !service.is_active) notFound()

  const typeLabel = service.type === 'reprint' ? '追加印刷' : 'オーダーメイド'
  const Icon = service.type === 'reprint' ? RotateCw : Sparkles

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {service.image_url ? (
                <div className="relative w-full aspect-square">
                  <Image
                    src={optimizeImageUrl(service.image_url, 80)}
                    alt={service.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <Icon className="w-20 h-20 text-purple-300" />
                </div>
              )}
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                service.type === 'reprint'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {typeLabel}
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{service.title}</h1>
              {service.description && (
                <p className="text-gray-700 whitespace-pre-line mb-6">{service.description}</p>
              )}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-4">
                <p className="text-sm text-gray-600 mb-1">参考価格</p>
                <p className="text-3xl font-bold text-gray-900">
                  ¥{service.price.toLocaleString()}<span className="text-base font-normal">〜</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  数量や仕様により金額が変動します。お見積もりをお出しします。
                </p>
              </div>
            </div>
          </div>

          {service.rich_description && (
            <div
              className="bg-white rounded-2xl shadow-sm p-8 mb-8 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: service.rich_description }}
            />
          )}

          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{typeLabel}のリクエスト</h2>
            <p className="text-gray-600 mb-6">
              フォームを送信いただくと、担当者が内容確認の上、お見積もりをご連絡いたします。
            </p>
            <ServiceRequestForm serviceId={service.id} serviceType={service.type} />
          </div>
        </div>
      </main>
    </div>
  )
}
