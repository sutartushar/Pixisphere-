const express = require("express")
const { authenticate, authorize } = require("../middlewares/auth")
const { validateObjectId, validatePagination } = require("../middlewares/validation")
const {
  getDashboard,
  getVerifications,
  updateVerification,
  getUsers,
  toggleUserStatus,
  togglePartnerFeatured,
  getInquiries,
} = require("../controllers/adminController")

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations and management
 */

// All admin routes require authentication and admin role
router.use(authenticate, authorize("admin"))

// Dashboard
router.get("/dashboard", getDashboard)

// Partner verification management
router.get("/verifications", validatePagination, getVerifications)
router.put("/verify/:id", validateObjectId("id"), updateVerification)

// User management
router.get("/users", validatePagination, getUsers)
router.put("/users/:id/toggle-status", validateObjectId("id"), toggleUserStatus)

// Partner management
router.put("/partners/:id/feature", validateObjectId("id"), togglePartnerFeatured)

// Inquiry management
router.get("/inquiries", validatePagination, getInquiries)

module.exports = router
