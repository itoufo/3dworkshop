import { NextRequest, NextResponse } from 'next/server'
import { uploadWorkshopImage } from '@/lib/supabase-storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（5MB以下）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      )
    }

    // 画像をアップロード
    const imageUrl = await uploadWorkshopImage(file)

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Error in upload-image API:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}