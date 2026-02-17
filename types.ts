export interface WorkshopCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Workshop {
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
  manual_participants?: number
  manual_participants_note?: string
  price: number
  is_pinned: boolean
  pin_order: number | null
  category_id?: string | null
  category?: WorkshopCategory | null
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  email: string
  created_at?: string
}

export interface Booking {
  id: string
  workshop_id: string
  user_id: string
  customer_id: string
  coupon_id?: string | null
  booking_date: string | null
  participants: number
  total_amount: number
  discount_amount?: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at?: string
  // Joined fields (when using Supabase .select() with relations)
  workshop?: Workshop
  customer?: Customer
  coupon?: Coupon
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  minimum_amount: number | null
  usage_limit: number | null
  usage_count: number
  user_limit: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  workshop_ids: string[] | null
  created_at?: string
  updated_at?: string
}

export interface Customer {
  id: string
  name: string
  full_name?: string
  email: string
  phone: string | null
  age?: number
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  created_at: string
  updated_at?: string
}
