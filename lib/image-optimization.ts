/**
 * 画像URLを1600x900（16:9）に最適化する
 * @param imageUrl 画像URL
 * @param quality 画質（デフォルト: 85）
 * @returns 最適化された画像URL
 */
export function optimizeImageUrl(imageUrl: string | null | undefined, quality: number = 85): string {
  if (!imageUrl) return '';
  
  // Supabaseの画像URLの場合
  if (imageUrl.includes('supabase.co') || imageUrl.includes('supabase')) {
    try {
      // 既存のクエリパラメータを確認
      const hasQuery = imageUrl.includes('?');
      const separator = hasQuery ? '&' : '?';
      
      // クエリパラメータを追加
      const params = new URLSearchParams();
      params.set('width', '1600');
      params.set('height', '900');
      params.set('quality', quality.toString());
      params.set('resize', 'cover'); // アスペクト比を維持しながらリサイズ
      
      // 既存のクエリパラメータがある場合はマージ
      if (hasQuery) {
        const existingParams = new URLSearchParams(imageUrl.split('?')[1]);
        params.forEach((value, key) => {
          existingParams.set(key, value);
        });
        return `${imageUrl.split('?')[0]}?${existingParams.toString()}`;
      }
      
      return `${imageUrl}${separator}${params.toString()}`;
    } catch (error) {
      // URLの解析に失敗した場合は元のURLを返す
      console.error('Error optimizing image URL:', error);
      return imageUrl;
    }
  }
  
  // その他の画像URLの場合
  return imageUrl;
}

/**
 * 画像のアスペクト比（16:9）に基づいて高さを計算
 * @param width 幅
 * @returns 高さ
 */
export function calculateHeight(width: number): number {
  return Math.round((width * 9) / 16);
}

