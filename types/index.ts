export interface Workshop {
  id: string
  title: string
  description: string
  rich_description?: string
  price: number
  duration: number
  max_participants: number
  location?: string
  image_url?: string
  event_date?: string
  event_time?: string
  available_dates?: AvailableDate[]
  stripe_price_id?: string
  is_pinned?: boolean
  pin_order?: number
  created_at: string
  updated_at: string
}

export interface AvailableDate {
  date: string
  times: string[]
}

export interface Customer {
  id: string
  email: string
  name: string
  phone?: string
  age?: number
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  workshop_id: string
  customer_id: string
  booking_date: string
  booking_time: string
  participants: number
  status: 'pending' | 'confirmed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'refunded'
  stripe_session_id?: string
  stripe_payment_intent_id?: string
  total_amount: number
  coupon_id?: string
  discount_amount?: number
  notes?: string
  created_at: string
  updated_at: string
  workshop?: Workshop
  customer?: Customer
  coupon?: Coupon
}

export interface Coupon {
  id: string
  code: string
  description?: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  minimum_amount?: number
  usage_limit?: number
  usage_count: number
  user_limit?: number
  valid_from: string
  valid_until?: string
  is_active: boolean
  workshop_ids?: string[]
  created_at: string
  updated_at: string
}

export interface CouponUsage {
  id: string
  coupon_id: string
  booking_id: string
  customer_id: string
  discount_amount: number
  used_at: string
  coupon?: Coupon
  booking?: Booking
  customer?: Customer
}