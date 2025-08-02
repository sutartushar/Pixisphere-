const express = require("express")
const { authenticate } = require("../middlewares/auth")
const { validateSignup, validateLogin } = require("../middlewares/validation")
const { signup, verifyOTP, login, resendOTP, getMe } = require("../controllers/authController")

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management
 */

router.post("/signup", validateSignup, signup)
router.post("/verify-otp", verifyOTP)
router.post("/login", validateLogin, login)
router.post("/resend-otp", resendOTP)
router.get("/me", authenticate, getMe)

module.exports = router
