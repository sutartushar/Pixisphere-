const nodemailer = require("nodemailer")
const logger = require("./logger")

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `"Pixisphere" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Pixisphere Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Pixisphere!</h2>
          <p>Hi ${name},</p>
          <p>Your OTP for account verification is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from Pixisphere. Please do not reply.
          </p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    logger.info(`OTP email sent to ${email}`)
    return true
  } catch (error) {
    logger.error("Failed to send OTP email:", error)
    return false
  }
}

// Send welcome email
const sendWelcomeEmail = async (email, name, role) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `"Pixisphere" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Pixisphere!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Pixisphere!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been successfully created as a <strong>${role}</strong>.</p>
          ${
            role === "partner"
              ? `
            <p>Next steps:</p>
            <ul>
              <li>Complete your business profile</li>
              <li>Upload your portfolio</li>
              <li>Wait for admin verification</li>
            </ul>
          `
              : ""
          }
          <p>Thank you for joining our photography marketplace!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from Pixisphere. Please do not reply.
          </p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    logger.info(`Welcome email sent to ${email}`)
    return true
  } catch (error) {
    logger.error("Failed to send welcome email:", error)
    return false
  }
}

// Send partner verification email
const sendPartnerVerificationEmail = async (email, name, status, comment) => {
  try {
    const transporter = createTransporter()

    const statusMessages = {
      verified: {
        subject: "Congratulations! Your Partner Account is Verified",
        message:
          "Your partner account has been successfully verified. You can now start receiving inquiries from clients.",
        color: "#28a745",
      },
      rejected: {
        subject: "Partner Account Verification Update",
        message: "Unfortunately, your partner account verification was not approved at this time.",
        color: "#dc3545",
      },
    }

    const statusInfo = statusMessages[status]

    const mailOptions = {
      from: `"Pixisphere" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: statusInfo.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusInfo.color};">${statusInfo.subject}</h2>
          <p>Hi ${name},</p>
          <p>${statusInfo.message}</p>
          ${
            comment
              ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid ${statusInfo.color}; margin: 20px 0;">
              <strong>Admin Comment:</strong><br>
              ${comment}
            </div>
          `
              : ""
          }
          ${
            status === "rejected"
              ? `
            <p>You can update your profile and resubmit for verification.</p>
          `
              : ""
          }
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from Pixisphere. Please do not reply.
          </p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    logger.info(`Partner verification email sent to ${email}`)
    return true
  } catch (error) {
    logger.error("Failed to send partner verification email:", error)
    return false
  }
}

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPartnerVerificationEmail,
}
