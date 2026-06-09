export interface Expense {
  id: string
  date: string
  category: string
  item: string
  amount: number
}

export interface User {
  id: string
  name: string
  email: string
  monthlyBudget: number
  savingsGoal: number
}
