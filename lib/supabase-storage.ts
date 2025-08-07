import { supabaseAdmin } from './supabase-admin'

export async function uploadWorkshopImage(file: File): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available')
    throw new Error('Supabase admin client not available')
  }

  try {
    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 9)
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomString}.${fileExt}`

    console.log('Attempting to upload file:', {
      fileName,
      fileSize: file.size,
      fileType: file.type
    })

    // バケットの存在を確認
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
    } else {
      console.log('Available buckets:', buckets?.map(b => b.name))
    }

    // ファイルをアップロード
    const { data, error } = await supabaseAdmin.storage
      .from('workshop-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) {
      console.error('Error uploading image to Supabase:', {
        error,
        message: error.message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        statusCode: (error as any).statusCode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: (error as any).details
      })
      return null
    }

    console.log('Upload successful:', data)

    // 公開URLを取得
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('workshop-images')
      .getPublicUrl(fileName)

    console.log('Generated public URL:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('Error in uploadWorkshopImage:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
    return null
  }
}

export async function deleteWorkshopImage(imageUrl: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  try {
    // URLからファイルパスを抽出
    const urlParts = imageUrl.split('/workshop-images/')
    if (urlParts.length !== 2) {
      return false
    }
    const filePath = urlParts[1]

    // ファイルを削除
    const { error } = await supabaseAdmin.storage
      .from('workshop-images')
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteWorkshopImage:', error)
    return false
  }
}