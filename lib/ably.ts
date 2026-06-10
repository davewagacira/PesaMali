// Server-side publishing must use the REST client: Realtime opens a WebSocket,
// which breaks under Next's server bundling (ws bufferUtil) and hangs API routes.
import { Rest } from 'ably'

let ablyClient: Rest | null = null

export function getAblyClient(): Rest {
  if (ablyClient) return ablyClient

  const apiKey = process.env.ABLY_API_KEY
  if (!apiKey) {
    throw new Error('ABLY_API_KEY not configured')
  }

  ablyClient = new Rest({ key: apiKey })
  return ablyClient
}

export async function publishExpenseEvent(userId: string, event: 'add' | 'update' | 'delete', expense: any) {
  try {
    const client = getAblyClient()
    const channel = client.channels.get(`expenses:${userId}`)
    await channel.publish('expense', { event, expense, timestamp: Date.now() })
  } catch (e) {
    console.error('[Ably publish error]', e)
  }
}

export async function publishNotification(userId: string, notification: any) {
  try {
    const client = getAblyClient()
    const channel = client.channels.get(`notifications:${userId}`)
    await channel.publish('notification', { ...notification, timestamp: Date.now() })
  } catch (e) {
    console.error('[Ably notification error]', e)
  }
}

export async function publishAchievement(userId: string, achievement: any) {
  try {
    const client = getAblyClient()
    const channel = client.channels.get(`achievements:${userId}`)
    await channel.publish('achievement', { ...achievement, timestamp: Date.now() })
  } catch (e) {
    console.error('[Ably achievement error]', e)
  }
}
