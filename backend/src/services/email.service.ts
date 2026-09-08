import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: Number(process.env.BREVO_SMTP_PORT) === 465,
      auth: {
        user: process.env.BREVO_SMTP_USER || process.env.BREVO_FROM_EMAIL || '',
        pass: process.env.BREVO_SMTP_PASSWORD || process.env.BREVO_API_KEY || '',
      },
    })
  }

  private getFromHeader(): string {
    const name = process.env.BREVO_FROM_NAME || 'ALPHA FITNESS'
    const email = process.env.BREVO_FROM_EMAIL || 'notifications@alphafitness.com'
    return `"${name}" <${email}>`
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
          .cta-btn { display: block; width: 220px; margin: 25px auto; padding: 14px 20px; background: linear-gradient(to right, #6f0000, #ba0000); color: #ffffff; text-align: center; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; font-size: 13px; letter-spacing: 1.5px; }
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
    const body = `
      <div class="badge">Welcome to the Elite</div>
      <h2 style="color: #ffffff; margin-top: 0;">Congratulations, ${memberName}!</h2>
      <p>Welcome to the <strong>${gymName}</strong> family! Your membership for <strong>${planName}</strong> plan is now active.</p>
      <p>Your journey towards peak human performance starts right now. Our state-of-the-art facilities, automated RFID tracking, and elite community are ready to support every sweat and rep.</p>
      <div style="background-color: #181818; padding: 15px; border-radius: 8px; border-left: 3px solid #ed3434; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #a0a0a0;"><strong>PRO TIP:</strong> Don't forget to scan your RFID card at the front desk console every time you enter to maintain your active training streak!</p>
      </div>
      <p>See you on the workout floor!</p>
    `
    const html = this.getBaseLayout(`Welcome to ${gymName}`, body)
    await this.transporter.sendMail({
      from: this.getFromHeader(),
      to: toEmail,
      subject: `🔥 Welcome to ${gymName}, ${memberName}! Your Journey Begins Now`,
      html,
    })
  }

  async sendMissedPunchEmail(toEmail: string, memberName: string, dateStr: string) {
    if (!toEmail) return
    const body = `
      <div class="badge" style="color: #eab308; border-color: rgba(234, 179, 8, 0.3); background-color: rgba(234, 179, 8, 0.15);">Streak Alert</div>
      <h2 style="color: #ffffff; margin-top: 0;">We missed you today, ${memberName}!</h2>
      <p>Our attendance system noticed that you didn't punch in on <strong>${dateStr}</strong>.</p>
      <p>If you trained today, please remember to swipe your RFID card at the entrance reader so your training streak and attendance records stay 100% accurate.</p>
      <p>Consistency is the key to extraordinary results. Make sure to hit your training session tomorrow!</p>
    `
    const html = this.getBaseLayout('Missed Punch-In Alert', body)
    await this.transporter.sendMail({
      from: this.getFromHeader(),
      to: toEmail,
      subject: `⚠️ Missed Punch-In Notice — ALPHA FITNESS (${dateStr})`,
      html,
    })
  }

  async sendExpiryWarningEmail(toEmail: string, memberName: string, daysLeft: number, expiryDateStr: string) {
    if (!toEmail) return
    const body = `
      <div class="badge" style="color: #f97316; border-color: rgba(249, 115, 22, 0.3); background-color: rgba(249, 115, 22, 0.15);">Membership Alert</div>
      <h2 style="color: #ffffff; margin-top: 0;">Notice: ${daysLeft} Days Remaining</h2>
      <p>Hi ${memberName},</p>
      <p>Your gym membership is scheduled to expire on <strong style="color: #ffffff;">${expiryDateStr}</strong> (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining).</p>
      <p>To avoid any interruption to your workout routine and RFID gate access, please renew your membership plan with the front desk before the expiry date.</p>
      <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 13px; color: #8d8d8d;">Visit the desk today or contact management to extend your plan.</p>
      </div>
    `
    const html = this.getBaseLayout('Membership Expiring Soon', body)
    await this.transporter.sendMail({
      from: this.getFromHeader(),
      to: toEmail,
      subject: `⏳ Urgent: Your Membership Expires in ${daysLeft} Days — ALPHA FITNESS`,
      html,
    })
  }

  async sendMembershipExpiredEmail(toEmail: string, memberName: string, expiredDateStr: string) {
    if (!toEmail) return
    const body = `
      <div class="badge">Plan Expired</div>
      <h2 style="color: #ffffff; margin-top: 0;">Your Membership Plan Has Expired</h2>
      <p>Hi ${memberName},</p>
      <p>Your membership plan expired on <strong>${expiredDateStr}</strong>.</p>
      <p>Your RFID access card has been temporarily paused. Renew your membership now to regain full access to all workout zones and classes without losing your streak progress!</p>
      <p>We look forward to seeing you back on the floor stronger than ever.</p>
    `
    const html = this.getBaseLayout('Membership Plan Expired', body)
    await this.transporter.sendMail({
      from: this.getFromHeader(),
      to: toEmail,
      subject: `🚨 Membership Expired — Renew Your Plan at ALPHA FITNESS`,
      html,
    })
  }
}

export const emailService = new EmailService()
