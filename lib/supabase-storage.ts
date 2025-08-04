import { supabaseAdmin } from './supabase-admin'

export async function uploadWorkshopImage(file: File): Promise<string | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  try {
    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 9)
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomString}.${fileExt}`

    // ファイルをアップロード
    const { data, error } = await supabaseAdmin.storage
      .from('workshop-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading image:', error)
      return null
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('workshop-images')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('Error in uploadWorkshopImage:', error)
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