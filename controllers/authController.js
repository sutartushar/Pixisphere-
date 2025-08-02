const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/email")
const logger = require("../utils/logger")

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  })
}

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *               - profile
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [client, partner, admin]
 *               profile:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   phone:
 *                     type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
const signup = async (req, res) => {
  try {
    const { email, password, role, profile } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      })
    }

    // Create user
    const user = new User({
      email,
      password,
      role,
      profile,
    })

    // Generate OTP
    const otp = user.generateOTP()
    await user.save()

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, profile.firstName)

    logger.info(`User registered: ${email} (${role})`)

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email with the OTP sent.",
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        otpSent: emailSent,
      },
    })
  } catch (error) {
    logger.error("Signup error:", error)
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and activate account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      })
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified",
      })
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      })
    }

    // Mark user as verified and clear OTP
    user.isVerified = true
    user.otp = undefined
    await user.save()

    // Send welcome email
    await sendWelcomeEmail(user.email, user.profile.firstName, user.role)

    // Generate token
    const token = generateToken(user._id)

    logger.info(`User verified: ${email}`)

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isVerified: user.isVerified,
        },
      },
    })
  } catch (error) {
    logger.error("OTP verification error:", error)
    res.status(500).json({
      success: false,
      message: "Error verifying OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               passwor
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Account not verified
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check if account is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your account first",
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      })
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    logger.info(`User logged in: ${email}`)

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
        },
      },
    })
  } catch (error) {
    logger.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP for account verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: User not found or already verified
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      })
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified",
      })
    }

    // Generate new OTP
    const otp = user.generateOTP()
    await user.save()

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, user.profile.firstName)

    logger.info(`OTP resent to: ${email}`)

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: {
        otpSent: emailSent,
      },
    })
  } catch (error) {
    logger.error("Resend OTP error:", error)
    res.status(500).json({
      success: false,
      message: "Error sending OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isVerified: user.isVerified,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    })
  } catch (error) {
    logger.error("Get me error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving user profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

module.exports = {
  signup,
  verifyOTP,
  login,
  resendOTP,
  getMe,
}
