const express = require("express")
const { authenticate, authorize } = require("../middlewares/auth")
const {
  validatePartnerProfile,
  validatePortfolio,
  validateObjectId,
  validatePagination,
} = require("../middlewares/validation")
const {
  createOrUpdateProfile,
  getProfile,
  getLeads,
  respondToLead,
  addPortfolioItem,
  getPortfolio,
  updatePortfolioItem,
  deletePortfolioItem,
  getDashboard,
} = require("../controllers/partnerController")

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Partner
 *   description: Partner management and operations
 */

// All partner routes require authentication and partner role
router.use(authenticate, authorize("partner"))

// Profile management
router.post("/profile", validatePartnerProfile, createOrUpdateProfile)
router.get("/profile", getProfile)

// Lead management
router.get("/leads", validatePagination, getLeads)
router.post("/leads/:id/respond", validateObjectId("id"), respondToLead)

// Portfolio management
router.post("/portfolio", validatePortfolio, addPortfolioItem)
router.get("/portfolio", getPortfolio)
router.put("/portfolio/:id", validateObjectId("id"), validatePortfolio, updatePortfolioItem)
router.delete("/portfolio/:id", validateObjectId("id"), deletePortfolioItem)

// Dashboard
router.get("/dashboard", getDashboard)

module.exports = router
