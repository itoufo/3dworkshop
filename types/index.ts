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
  notes?: string
  created_at: string
  updated_at: string
  workshop?: Workshop
  customer?: Customer
}