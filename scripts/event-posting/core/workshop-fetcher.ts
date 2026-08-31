import { WorkshopData } from './types'

export async function fetchFutureWorkshops(): Promise<WorkshopData[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/workshops`)

  if (!res.ok) {
    throw new Error(`Failed to fetch workshops: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  const workshops: WorkshopData[] = json.data || []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return workshops.filter((ws) => {
    if (!ws.event_date) return false
    const eventDate = new Date(ws.event_date)
    return eventDate >= today
  })
}
