import { prisma } from './prisma'
import { publishAchievement, publishNotification } from './ably'

interface AchievementDefinition {
  type: string
  title: string
  description: string
  icon: string
}

const achievements: Record<string, AchievementDefinition> = {
  savings_100k: {
    type: 'savings_milestone',
    title: 'Century Club',
    description: 'Saved KES 100,000 this month',
    icon: 'trophy',
  },
  savings_50k: {
    type: 'savings_milestone',
    title: 'Half Way',
    description: 'Saved KES 50,000 this month',
    icon: 'star',
  },
  savings_25k: {
    type: 'savings_milestone',
    title: 'Quarter Master',
    description: 'Saved KES 25,000 this month',
    icon: 'zap',
  },
  perfect_day: {
    type: 'budget_perfect_day',
    title: 'Perfect Day',
    description: 'Stayed within daily budget for 5 days straight',
    icon: 'checkCircle',
  },
  no_overspend_week: {
    type: 'no_overspend_week',
    title: 'Steady Week',
    description: 'Did not overspend once this week',
    icon: 'shield',
  },
  goal_reached: {
    type: 'goal_reached',
    title: 'Goal Reached',
    description: 'Achieved your monthly savings goal',
    icon: 'flag',
  },
}

export async function checkAndAwardAchievements(profileId: string) {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!profile) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const today = now.toISOString().slice(0, 10)

    const expenses = await prisma.expense.findMany({
      where: {
        profileId,
        date: { gte: monthStart },
      },
    })

    const spent = expenses.reduce((s, e) => s + e.amount, 0)
    const remaining = profile.monthlyBudget - spent
    const saved = profile.savingsGoal - (profile.monthlyBudget - remaining)

    // Check for savings milestones
    if (saved >= 100000 && !(await hasAchievement(profileId, 'savings_100k'))) {
      await awardAchievement(profileId, 'savings_100k')
    } else if (saved >= 50000 && !(await hasAchievement(profileId, 'savings_50k'))) {
      await awardAchievement(profileId, 'savings_50k')
    } else if (saved >= 25000 && !(await hasAchievement(profileId, 'savings_25k'))) {
      await awardAchievement(profileId, 'savings_25k')
    }

    // Check if goal reached
    if (remaining >= profile.savingsGoal && !(await hasAchievement(profileId, 'goal_reached'))) {
      await awardAchievement(profileId, 'goal_reached')
    }

    // Check for perfect day (stayed within safe daily spend)
    const todayExpense = expenses.find((e) => e.date === today)
    const safeDaily = remaining > 0 ? (remaining - profile.savingsGoal) / (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()) : 0

    if (todayExpense && todayExpense.amount <= safeDaily) {
      // Could track perfect days streak, for now just check current day
    }
  } catch (e) {
    console.error('[Achievement check error]', e)
  }
}

async function hasAchievement(profileId: string, achievementType: string): Promise<boolean> {
  const existing = await prisma.achievement.findFirst({
    where: {
      profileId,
      type: achievements[achievementType]?.type,
    },
  })
  return !!existing
}

async function awardAchievement(profileId: string, achievementKey: string) {
  try {
    const def = achievements[achievementKey]
    if (!def) return

    const achievement = await prisma.achievement.create({
      data: {
        profileId,
        type: def.type,
        title: def.title,
        description: def.description,
        icon: def.icon,
      },
    })

    // Publish to Ably
    await publishAchievement(profileId, achievement)

    // Create notification
    await createNotification(profileId, {
      type: 'achievement',
      title: `🎉 ${def.title}`,
      message: def.description,
      icon: def.icon,
    })
  } catch (e) {
    console.error('[Award achievement error]', e)
  }
}

export async function createNotification(profileId: string, data: { type: string; title: string; message: string; icon?: string; actionUrl?: string }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        profileId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
      },
    })

    // Publish to Ably
    await publishNotification(profileId, notification)

    return notification
  } catch (e) {
    console.error('[Create notification error]', e)
  }
}
