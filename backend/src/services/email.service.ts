import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

class EmailService {
  private getTransporter(): nodemailer.Transporter {
    const host = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'
    const port = Number(process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT) || 587
    const isSecure = port === 465
    const user = process.env.SMTP_USER || process.env.BREVO_SMTP_USER || process.env.BREVO_FROM_EMAIL || ''
    const pass = process.env.SMTP_PASS || process.env.BREVO_SMTP_PASSWORD || process.env.BREVO_API_KEY || ''

    return nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false, // Serverless runtime TLS fix
      },
      connectionTimeout: 10000,
    })
  }

  private getFromHeader(): string {
    const name = process.env.BREVO_FROM_NAME || 'ALPHA FITNESS'
    const rawSender = process.env.SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || process.env.SMTP_USER || 'notifications@alphafitness.com'
    if (rawSender.includes('<')) return rawSender
    return `"${name}" <${rawSender}>`
  }

  private getBaseLayout(title: string, bodyContent: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #070707; color: #f4f4f2; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #111111; border: 1px solid #222222; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #111111 0%, #220000 100%); padding: 30px 20px; text-align: center; border-bottom: 2px solid #ed3434; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
          .header h1 span { color: #ed3434; }
          .header p { margin: 5px 0 0; color: #8d8d8d; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
          .content { padding: 30px 25px; line-height: 1.6; font-size: 15px; color: #d0d0d0; }
          .badge { display: inline-block; padding: 6px 12px; background-color: rgba(237, 52, 52, 0.15); color: #ed3434; border: 1px solid rgba(237, 52, 52, 0.3); border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
          .footer { background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 1px solid #1a1a1a; font-size: 12px; color: #666666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ALPHA <span>FITNESS</span></h1>
            <p>Your Gym Operating System</p>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ALPHA FITNESS Operating System. All rights reserved.</p>
            <p>Stay Relentless. Never Settle.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  async sendWelcomeEmail(toEmail: string, memberName: string, planName: string, gymName = 'ALPHA FITNESS') {
    if (!toEmail) return
    try {
      const body = `
        <div class="badge">Welcome to the Family</div>
        <h2 style="color: #ffffff; margin-top: 0;">Congratulations, ${memberName}! 🎉</h2>
        <p>Welcome to the <strong>${gymName}</strong> family! Your membership for the <strong>${planName}</strong> plan is officially active.</p>
        <p>Your journey towards peak physical fitness begins now. Our state-of-the-art facilities, automated RFID gate tracking, and expert trainers are here to support every step of your fitness goal.</p>
        <div style="background-color: #181818; padding: 15px; border-radius: 8px; border-left: 3px solid #ed3434; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #a0a0a0;"><strong>PRO TIP:</strong> Always scan your RFID card at the front desk gate console when entering to log your daily attendance streak!</p>
        </div>
        <a href="${process.env.VITE_BASE_URL || 'http://localhost:5173'}" style="display: inline-block; background: linear-gradient(to right, #6f0000, #ba0000); color: #ffffff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 6px; margin-top: 15px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Access Console →</a>
      `
      const html = this.getBaseLayout(`Welcome to ${gymName}`, body)
      const transporter = this.getTransporter()

      const response = await transporter.sendMail({
        from: this.getFromHeader(),
        to: toEmail,
        subject: `🎉 Congratulations & Welcome to ${gymName}, ${memberName}!`,
        html,
      })
      console.log(`✉️ Welcome email sent to ${toEmail}. Message ID: ${response?.messageId}`)
      return { success: true, response }
    } catch (error: any) {
      console.error(`❌ Error sending welcome email to ${toEmail}:`, error)
      return { success: false, error: error.message || error }
    }
  }

  async sendMissedPunchEmail(toEmail: string, memberName: string, dateStr: string) {
    if (!toEmail) return
    try {
      const body = `
        <div class="badge" style="color: #eab308; border-color: rgba(234, 179, 8, 0.3); background-color: rgba(234, 179, 8, 0.15);">Streak Alert</div>
        <h2 style="color: #ffffff; margin-top: 0;">We missed you today, ${memberName}!</h2>
        <p>Our attendance console noticed that you did not punch in on <strong>${dateStr}</strong>.</p>
        <p>If you trained today, please remember to swipe your RFID card at the gate reader so your workout streak stays 100% up to date.</p>
        <p>Consistency is key to extraordinary results. We look forward to seeing you tomorrow!</p>
      `
      const html = this.getBaseLayout('Missed Punch-In Alert', body)
      const transporter = this.getTransporter()

      const response = await transporter.sendMail({
        from: this.getFromHeader(),
        to: toEmail,
        subject: `⚠️ Missed Punch-In Notice — ALPHA FITNESS (${dateStr})`,
        html,
      })
      console.log(`✉️ Missed punch email sent to ${toEmail}. Message ID: ${response?.messageId}`)
      return { success: true, response }
    } catch (error: any) {
      console.error(`❌ Error sending missed punch email to ${toEmail}:`, error)
      return { success: false, error: error.message || error }
    }
  }

  async sendExpiryWarningEmail(toEmail: string, memberName: string, daysLeft: number, expiryDateStr: string) {
    if (!toEmail) return
    try {
      const body = `
        <div class="badge" style="color: #f97316; border-color: rgba(249, 115, 22, 0.3); background-color: rgba(249, 115, 22, 0.15);">Membership Alert</div>
        <h2 style="color: #ffffff; margin-top: 0;">Notice: ${daysLeft} Days Remaining</h2>
        <p>Hi ${memberName},</p>
        <p>Your gym membership is scheduled to expire on <strong style="color: #ffffff;">${expiryDateStr}</strong> (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining).</p>
        <p>To avoid any interruption to your workout routine and RFID gate access, please renew your membership plan with the front desk before the expiry date.</p>
      `
      const html = this.getBaseLayout('Membership Expiring Soon', body)
      const transporter = this.getTransporter()

      const response = await transporter.sendMail({
        from: this.getFromHeader(),
        to: toEmail,
        subject: `⏳ Urgent: Your Membership Expires in ${daysLeft} Days — ALPHA FITNESS`,
        html,
      })
      console.log(`✉️ Expiry warning email sent to ${toEmail}. Message ID: ${response?.messageId}`)
      return { success: true, response }
    } catch (error: any) {
      console.error(`❌ Error sending expiry warning email to ${toEmail}:`, error)
      return { success: false, error: error.message || error }
    }
  }

  async sendMembershipExpiredEmail(toEmail: string, memberName: string, expiredDateStr: string) {
    if (!toEmail) return
    try {
      const body = `
        <div class="badge">Plan Expired</div>
        <h2 style="color: #ffffff; margin-top: 0;">Your Membership Plan Has Expired</h2>
        <p>Hi ${memberName},</p>
        <p>Your membership plan expired on <strong>${expiredDateStr}</strong>.</p>
        <p>Your RFID access card has been temporarily paused. Renew your membership now to regain full access without losing your streak progress!</p>
      `
      const html = this.getBaseLayout('Membership Plan Expired', body)
      const transporter = this.getTransporter()

      const response = await transporter.sendMail({
        from: this.getFromHeader(),
        to: toEmail,
        subject: `🚨 Membership Expired — Renew Your Plan at ALPHA FITNESS`,
        html,
      })
      console.log(`✉️ Expired email sent to ${toEmail}. Message ID: ${response?.messageId}`)
      return { success: true, response }
    } catch (error: any) {
      console.error(`❌ Error sending expired email to ${toEmail}:`, error)
      return { success: false, error: error.message || error }
    }
  }
}

export const emailService = new EmailService()
