export const PLATFORM_NAMES = ['street-academy', 'aini', 'kokuchpro', 'peatix', 'ikoyo', 'connpass'] as const
export type PlatformName = (typeof PLATFORM_NAMES)[number]

export interface PlatformCredentials {
  email: string
  password: string
}

export interface PostResult {
  success: boolean
  platformEventId?: string
  platformUrl?: string
  error?: string
}

export interface WorkshopData {
  id: string
  title: string
  description: string
  rich_description?: string
  image_url: string | null
  event_date: string | null
  event_time: string | null
  duration: number
  location: string | null
  max_participants: number
  price: number
  category?: {
    name: string
    slug: string
  } | null
}

export interface PlatformPostRecord {
  id: string
  workshop_id: string
  platform: PlatformName
  platform_event_id: string | null
  platform_url: string | null
  status: 'pending' | 'posted' | 'failed' | 'review'
  error_message: string | null
  posted_at: string | null
  created_at: string
}

export const PLATFORM_DISPLAY_NAMES: Record<PlatformName, string> = {
  'street-academy': 'ストアカ',
  'aini': 'アイニ',
  'kokuchpro': 'こくちーず',
  'peatix': 'Peatix',
  'ikoyo': 'いこーよ',
  'connpass': 'connpass',
}
