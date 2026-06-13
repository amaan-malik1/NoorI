import { Resend } from 'resend'
import { env } from '../config/env.js'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

// ─── Helpers ─────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; padding: 40px; }
    .logo { font-size: 22px; font-weight: 600; color: #111; margin-bottom: 32px; }
    .title { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 12px; }
    .body { font-size: 15px; color: #555; line-height: 1.7; margin-bottom: 28px; }
    .btn { display: inline-block; background: #111; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 500; }
    .footer { margin-top: 32px; font-size: 13px; color: #aaa; border-top: 1px solid #e5e5e5; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Noori</div>
    ${body}
    <div class="footer">If you did not request this, you can safely ignore this email.</div>
  </div>
</body>
</html>`
}

// ─── Send wrapper ────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    // Dev fallback — just log the email
    console.log('\n📧  [Email - Dev Mode]')
    console.log(`   To: ${to}`)
    console.log(`   Subject: ${subject}`)
    console.log('   (Set RESEND_API_KEY to actually send)\n')
    return
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  })

  if (error) {
    console.error('Email send error:', error)
    throw new Error('Failed to send email')
  }
}

// ─── Email Types ─────────────────────────────────────────

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`

  const html = baseTemplate('Verify your email', `
    <div class="title">Verify your email address</div>
    <div class="body">
      Click the button below to verify your email address and activate your Noori account.
      This link expires in 24 hours.
    </div>
    <a href="${link}" class="btn">Verify email</a>
  `)

  await sendEmail(to, 'Verify your Noori email', html)
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`

  const html = baseTemplate('Reset your password', `
    <div class="title">Reset your password</div>
    <div class="body">
      Click the button below to reset your password. This link expires in 1 hour.
    </div>
    <a href="${link}" class="btn">Reset password</a>
  `)

  await sendEmail(to, 'Reset your Noori password', html)
}

export async function sendWelcomeEmail(to: string) {
  const html = baseTemplate('Welcome to Noori', `
    <div class="title">Welcome to Noori 👋</div>
    <div class="body">
      Your account is verified and ready. Connect your Cloudflare account to start filtering content on all your devices.
    </div>
    <a href="${env.FRONTEND_URL}/dashboard" class="btn">Go to dashboard</a>
  `)

  await sendEmail(to, 'Welcome to Noori', html)
}
