import { prisma } from '@/lib/prisma'

// Budgets vary month to month (e.g. extra shopping in July). A MonthlyBudget
// row overrides the profile defaults for that specific month; months without
// a row fall back to profile.monthlyBudget / profile.savingsGoal.

export interface EffectiveBudget {
  budget: number
  savingsGoal: number
  isOverride: boolean
}

export function nairobiYearMonth(date = new Date()): { year: number; month: number } {
  const nairobi = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }))
  return { year: nairobi.getFullYear(), month: nairobi.getMonth() + 1 }
}

export async function getEffectiveBudget(
  profileId: string,
  year: number,
  month: number,
  defaults?: { monthlyBudget: number; savingsGoal: number }
): Promise<EffectiveBudget> {
  const override = await prisma.monthlyBudget.findUnique({
    where: { profileId_year_month: { profileId, year, month } },
  })
  if (override) {
    return { budget: override.budget, savingsGoal: override.savingsGoal, isOverride: true }
  }
  const profile =
    defaults ?? (await prisma.profile.findUnique({ where: { id: profileId } }))
  if (!profile) return { budget: 0, savingsGoal: 0, isOverride: false }
  return { budget: profile.monthlyBudget, savingsGoal: profile.savingsGoal, isOverride: false }
}
