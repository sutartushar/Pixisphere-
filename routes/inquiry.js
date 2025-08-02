const express = require("express")
const { authenticate, authorize } = require("../middlewares/auth")
const { validateInquiry, validateObjectId } = require("../middlewares/validation")
const { createInquiry, getInquiry, updateInquiry, cancelInquiry } = require("../controllers/inquiryController")

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Inquiry
 *   description: Service inquiry management
 */

// All inquiry routes require authentication
router.use(authenticate)

router.post("/", authorize("client"), validateInquiry, createInquiry)
router.get("/:id", validateObjectId("id"), getInquiry)
router.put("/:id", authorize("client"), validateObjectId("id"), validateInquiry, updateInquiry)
router.post("/:id/cancel", authorize("client"), validateObjectId("id"), cancelInquiry)

module.exports = router
