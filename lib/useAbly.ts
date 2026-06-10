import { useEffect, useRef } from 'react'
import { Realtime } from 'ably'
import type { RealtimeChannel, Message } from 'ably'

let ablyInstance: Realtime | null = null

function getAblyInstance(): Realtime {
  if (ablyInstance) return ablyInstance

  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY || process.env.ABLY_API_KEY

  if (!apiKey) {
    console.warn('[Ably] API key not configured')
    return new Realtime({ autoConnect: false })
  }

  ablyInstance = new Realtime({ key: apiKey })
  return ablyInstance
}

export function useAblyExpenses(userId: string, onExpenseChange: (event: string, expense: any) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    try {
      const ably = getAblyInstance()
      const channel = ably.channels.get(`expenses:${userId}`)
      channelRef.current = channel

      const messageHandler = (message: Message) => {
        const { event, expense } = message.data
        onExpenseChange(event, expense)
      }

      channel.subscribe('expense', messageHandler)

      return () => {
        channel.unsubscribe('expense', messageHandler)
      }
    } catch (e) {
      console.error('[Ably subscribe error]', e)
    }
  }, [userId, onExpenseChange])
}

export function useAblyNotifications(userId: string, onNotification: (notification: any) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    try {
      const ably = getAblyInstance()
      const channel = ably.channels.get(`notifications:${userId}`)
      channelRef.current = channel

      const messageHandler = (message: Message) => {
        onNotification(message.data)
      }

      channel.subscribe('notification', messageHandler)

      return () => {
        channel.unsubscribe('notification', messageHandler)
      }
    } catch (e) {
      console.error('[Ably notifications error]', e)
    }
  }, [userId, onNotification])
}

export function useAblyAchievements(userId: string, onAchievement: (achievement: any) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    try {
      const ably = getAblyInstance()
      const channel = ably.channels.get(`achievements:${userId}`)
      channelRef.current = channel

      const messageHandler = (message: Message) => {
        onAchievement(message.data)
      }

      channel.subscribe('achievement', messageHandler)

      return () => {
        channel.unsubscribe('achievement', messageHandler)
      }
    } catch (e) {
      console.error('[Ably achievements error]', e)
    }
  }, [userId, onAchievement])
}
