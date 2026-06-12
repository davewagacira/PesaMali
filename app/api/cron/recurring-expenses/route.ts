import { NextResponse } from 'next/server'
import { processDueRecurringExpenses } from '@/lib/recurring'

// Required to force dynamic execution for cron jobs
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Only execute if the correct CRON_SECRET is provided
  const authHeader = req.headers.get('authorization')
  
  // You must set CRON_SECRET in your Vercel Environment Variables
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Unauthorized cron request.')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const createdCount = await processDueRecurringExpenses()
    return NextResponse.json({ 
      success: true, 
      message: `Processed due recurring expenses`,
      expensesCreated: createdCount 
    })
  } catch (error) {
    console.error('Cron job error processing recurring expenses:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
