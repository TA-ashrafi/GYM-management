import { Request, Response } from 'express'
import { emailService } from '../services/email.service'
import { supabaseService } from '../services/supabase.service'

export const notificationController = {
  async sendMissedPunchNotice(req: Request, res: Response) {
    try {
      const { email, memberName, date } = req.body
      if (!email || !memberName) {
        return res.status(400).json({ error: 'Missing required fields: email, memberName' })
      }
      const dateStr = date || new Date().toISOString().split('T')[0]
      await emailService.sendMissedPunchEmail(email, memberName, dateStr)
      res.json({ success: true, message: `Missed punch notification sent to ${email}` })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async sendExpiryNotice(req: Request, res: Response) {
    try {
      const { email, memberName, daysLeft, expiryDate } = req.body
      if (!email || !memberName || daysLeft === undefined) {
        return res.status(400).json({ error: 'Missing required fields: email, memberName, daysLeft' })
      }
      if (daysLeft <= 0) {
        await emailService.sendMembershipExpiredEmail(email, memberName, expiryDate || 'today')
      } else {
        await emailService.sendExpiryWarningEmail(email, memberName, daysLeft, expiryDate || '')
      }
      res.json({ success: true, message: `Expiry notification sent to ${email}` })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async checkAndSendAutomatedEmails(req: Request, res: Response) {
    try {
      const members = await supabaseService.getMembers()
      const today = new Date()
      let sentCount = 0

      for (const m of members) {
        const email = m.email
        const name = m.full_name || m.name
        if (!email || !name) continue

        const expiry = m.expiry_date || m.expiryDate
        if (expiry) {
          const expDate = new Date(expiry)
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24))

          if (diffDays === 7) {
            await emailService.sendExpiryWarningEmail(email, name, 7, expDate.toISOString().split('T')[0])
            sentCount++
          } else if (diffDays === 0) {
            await emailService.sendMembershipExpiredEmail(email, name, expDate.toISOString().split('T')[0])
            sentCount++
          }
        }
      }

      res.json({ success: true, processedMembers: members.length, emailsSent: sentCount })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}
