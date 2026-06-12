import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'
import { cleanInt } from '@/lib/validate'
import fs from 'fs'
import path from 'path'

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
        [`Profile: ${profile.name}`],
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
      
      // Use primary brand color from globals.css: #4F46E5 (rgb: 79, 70, 229)
      const brandColor = [79, 70, 229] as [number, number, number]
      
      // Header Background
      doc.setFillColor(...brandColor)
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      // Header Text
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('PesaMali Report', 20, 20)
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`User: ${profile.name} | Month: ${queryMonth}/${queryYear}`, 20, 30)
      
      // Add Logo
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.png')
        const logoBuffer = fs.readFileSync(logoPath)
        const logoBase64 = logoBuffer.toString('base64')
        // Place logo on the right side of the header. The header is 40 units high.
        // We'll make the logo 24x24 units, centered vertically in the 40 unit header.
        doc.addImage(logoBase64, 'PNG', pageWidth - 44, 8, 24, 24)
      } catch (e) {
        console.error("Could not load logo for PDF", e)
      }
      
      // Reset text color
      doc.setTextColor(40, 40, 40)
      let yPos = 50

      // Summary
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, yPos)
      yPos += 8
      
      const onTrack = totalSpent <= profile.monthlyBudget
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Amount (KES)']],
        body: [
          ['Monthly Budget', profile.monthlyBudget.toLocaleString()],
          ['Total Spent', totalSpent.toLocaleString()],
          ['Remaining', (profile.monthlyBudget - totalSpent).toLocaleString()],
          ['Savings Goal', profile.savingsGoal.toLocaleString()],
          ['Status', onTrack ? 'On Track' : 'Over Budget'],
        ],
        theme: 'grid',
        headStyles: { fillColor: brandColor, textColor: 255 },
        styles: { fontSize: 11, cellPadding: 5 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 20, right: 20 },
      })
      
      yPos = (doc as any).lastAutoTable.finalY + 15
      
      // Categories Table
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Spending by Category', 20, yPos)
      yPos += 8
      
      const catData = Object.entries(categoryExpenses)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => {
          const pct = ((amt / totalSpent) * 100).toFixed(1)
          return [cat, amt.toLocaleString(), `${pct}%`]
        })

      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Amount (KES)', '% of Total']],
        body: catData.length > 0 ? catData : [['No expenses', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        margin: { left: 20, right: 20 },
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Expenses Table
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('All Expenses', 20, yPos)
      yPos += 8
      
      const expData = expenses.map(e => [
        e.date, 
        e.category, 
        e.item, 
        e.amount.toLocaleString()
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Category', 'Item', 'Amount (KES)']],
        body: expData.length > 0 ? expData : [['-', '-', 'No expenses recorded', '-']],
        theme: 'striped',
        headStyles: { fillColor: brandColor, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 20, right: 20 },
      })
      
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.text(
          `Generated by PesaMali on ${new Date().toLocaleDateString()}  •  Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
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
