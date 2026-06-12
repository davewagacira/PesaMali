import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import Papa from 'papaparse'
import { cleanInt } from '@/lib/validate'

export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { format = 'pdf', month, year } = Object.fromEntries(req.nextUrl.searchParams)
    const now = new Date()
    const queryYear = year ? cleanInt(year, 2000, 2100) : now.getFullYear()
    const queryMonth = month ? cleanInt(month, 1, 12) : now.getMonth() + 1
    if (queryYear === null || queryMonth === null) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    const monthStart = `${queryYear}-${String(queryMonth).padStart(2, '0')}-01`
    const monthEnd = new Date(queryYear, queryMonth, 0).toISOString().slice(0, 10)

    const profile = await prisma.profile.findUnique({ where: { id: session.profileId } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const expenses = await prisma.expense.findMany({
      where: {
        profileId: session.profileId,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { date: 'desc' },
    })

    const categoryExpenses: Record<string, number> = {}
    let totalSpent = 0

    for (const expense of expenses) {
      categoryExpenses[expense.category] = (categoryExpenses[expense.category] || 0) + expense.amount
      totalSpent += expense.amount
    }

    if (format === 'csv') {
      const rows = [
        ['PesaMali - Monthly Expense Report'],
        [`Month: ${queryMonth}/${queryYear}`],
        [`User: ${profile.name} (${profile.email})`],
        [''],
        ['Date', 'Category', 'Item', 'Amount (KES)'],
        ...expenses.map((e) => [e.date, e.category, e.item, e.amount.toString()]),
        [''],
        ['Summary'],
        ['Budget', profile.monthlyBudget.toString()],
        ['Total Spent', totalSpent.toString()],
        ['Remaining', (profile.monthlyBudget - totalSpent).toString()],
        ['Savings Goal', profile.savingsGoal.toString()],
        [''],
        ['By Category'],
        ...Object.entries(categoryExpenses).map(([cat, amt]) => [cat, amt.toString()]),
      ]

      const csv = Papa.unparse(rows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="pesamali-report-${queryYear}-${String(queryMonth).padStart(2, '0')}.csv"`,
        },
      })
    } else {
      // PDF format
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20

      // Title
      doc.setFontSize(20)
      doc.text('PesaMali Monthly Report', 20, yPos)
      yPos += 15

      // Header info
      doc.setFontSize(11)
      doc.text(`Month: ${queryMonth}/${queryYear}`, 20, yPos)
      yPos += 7
      doc.text(`User: ${profile.name}`, 20, yPos)
      yPos += 7
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPos)
      yPos += 15

      // Summary section
      doc.setFontSize(13)
      doc.text('Summary', 20, yPos)
      yPos += 10

      doc.setFontSize(10)
      const summary = [
        `Budget: KES ${profile.monthlyBudget.toLocaleString()}`,
        `Total Spent: KES ${totalSpent.toLocaleString()}`,
        `Remaining: KES ${(profile.monthlyBudget - totalSpent).toLocaleString()}`,
        `Savings Goal: KES ${profile.savingsGoal.toLocaleString()}`,
        `Status: ${totalSpent <= profile.monthlyBudget ? '✓ On Track' : '✗ Over Budget'}`,
      ]

      for (const line of summary) {
        if (yPos > pageHeight - 40) {
          doc.addPage()
          yPos = 20
        }
        doc.text(line, 20, yPos)
        yPos += 7
      }

      yPos += 10

      // Category breakdown
      doc.setFontSize(13)
      doc.text('Spending by Category', 20, yPos)
      yPos += 10

      doc.setFontSize(10)
      for (const [cat, amt] of Object.entries(categoryExpenses)) {
        if (yPos > pageHeight - 40) {
          doc.addPage()
          yPos = 20
        }
        const pct = ((amt / totalSpent) * 100).toFixed(1)
        doc.text(`${cat}: KES ${amt.toLocaleString()} (${pct}%)`, 20, yPos)
        yPos += 7
      }

      yPos += 10

      // Expenses table
      doc.setFontSize(13)
      doc.text('All Expenses', 20, yPos)
      yPos += 10

      doc.setFontSize(9)
      const colWidth = [30, 40, 55, 30]
      const headers = ['Date', 'Category', 'Item', 'Amount']

      // Draw headers
      doc.setFont('helvetica', 'bold')
      let xPos = 20
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], xPos, yPos)
        xPos += colWidth[i]
      }
      doc.setFont('helvetica', 'normal')
      yPos += 7

      // Draw rows
      for (const expense of expenses) {
        if (yPos > pageHeight - 20) {
          doc.addPage()
          yPos = 20
        }

        xPos = 20
        doc.text(expense.date, xPos, yPos)
        xPos += colWidth[0]
        doc.text(expense.category, xPos, yPos)
        xPos += colWidth[1]
        doc.text(expense.item.slice(0, 15), xPos, yPos)
        xPos += colWidth[2]
        doc.text(`KES ${expense.amount}`, xPos, yPos)
        yPos += 6
      }

      const pdf = doc.output('arraybuffer')
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="pesamali-report-${queryYear}-${String(queryMonth).padStart(2, '0')}.pdf"`,
        },
      })
    }
  } catch (e) {
    console.error('[Reports error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
