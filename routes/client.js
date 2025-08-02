const express = require("express")
const { authenticate, authorize } = require("../middlewares/auth")
const { validateObjectId, validatePagination } = require("../middlewares/validation")
const {
  searchPartners,
  getPartnerDetails,
  getInquiries,
  getInquiryDetails,
  selectPartner,
  getDashboard,
} = require("../controllers/clientController")

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Client
 *   description: Client operations and partner discovery
 */

// Public routes (no authentication required)
router.get("/partners", validatePagination, searchPartners)
router.get("/partners/:id", validateObjectId("id"), getPartnerDetails)

// Protected client routes
router.use(authenticate, authorize("client"))

router.get("/inquiries", validatePagination, getInquiries)
router.get("/inquiries/:id", validateObjectId("id"), getInquiryDetails)
router.post("/inquiries/:id/select-partner", validateObjectId("id"), selectPartner)
router.get("/dashboard", getDashboard)

module.exports = router
