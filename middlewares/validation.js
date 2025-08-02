const { body, param, query, validationResult } = require("express-validator")

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    })
  }
  next()
}

// User validation rules
const validateSignup = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("role").isIn(["client", "partner", "admin"]).withMessage("Role must be client, partner, or admin"),
  body("profile.firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("profile.lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("profile.phone")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please provide a valid Indian phone number"),
  handleValidationErrors,
]

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
]

// Partner validation rules
const validatePartnerProfile = [
  body("businessInfo.businessName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Business name must be between 2 and 100 characters"),
  body("businessInfo.description")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("businessInfo.categories").isArray({ min: 1 }).withMessage("At least one category is required"),
  body("businessInfo.categories.*")
    .isIn(["wedding", "maternity", "portrait", "event", "commercial", "fashion", "product", "real-estate"])
    .withMessage("Invalid category"),
  body("businessInfo.experience").isInt({ min: 0 }).withMessage("Experience must be a non-negative number"),
  body("businessInfo.priceRange.min").isFloat({ min: 0 }).withMessage("Minimum price must be a non-negative number"),
  body("businessInfo.priceRange.max").isFloat({ min: 0 }).withMessage("Maximum price must be a non-negative number"),
  body("location.city").trim().isLength({ min: 2, max: 50 }).withMessage("City must be between 2 and 50 characters"),
  body("location.state").trim().isLength({ min: 2, max: 50 }).withMessage("State must be between 2 and 50 characters"),
  body("location.pincode")
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage("Please provide a valid pincode"),
  body("location.address")
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage("Address must be between 10 and 200 characters"),
  body("documents.aadharNumber")
    .matches(/^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/)
    .withMessage("Please provide a valid Aadhar number"),
  body("documents.panNumber")
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage("Please provide a valid PAN number"),
  body("documents.gstNumber")
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage("Please provide a valid GST number"),
  handleValidationErrors,
]

// Inquiry validation rules
const validateInquiry = [
  body("category")
    .isIn(["wedding", "maternity", "portrait", "event", "commercial", "fashion", "product", "real-estate"])
    .withMessage("Invalid category"),
  body("eventDetails.eventDate")
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error("Event date must be in the future")
      }
      return true
    }),
  body("eventDetails.eventTime")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Please provide a valid time in HH:MM format"),
  body("eventDetails.duration").isInt({ min: 1 }).withMessage("Duration must be at least 1 hour"),
  body("eventDetails.guestCount").optional().isInt({ min: 1 }).withMessage("Guest count must be at least 1"),
  body("budget.min").isFloat({ min: 0 }).withMessage("Minimum budget must be a non-negative number"),
  body("budget.max").isFloat({ min: 0 }).withMessage("Maximum budget must be a non-negative number"),
  body("location.city").trim().isLength({ min: 2, max: 50 }).withMessage("City must be between 2 and 50 characters"),
  body("location.state").trim().isLength({ min: 2, max: 50 }).withMessage("State must be between 2 and 50 characters"),
  body("location.venue")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Venue must be between 2 and 100 characters"),
  body("requirements").optional().isLength({ max: 1000 }).withMessage("Requirements cannot exceed 1000 characters"),
  body("referenceImages").optional().isArray().withMessage("Reference images must be an array"),
  body("referenceImages.*").optional().isURL().withMessage("Each reference image must be a valid URL"),
  handleValidationErrors,
]

// Portfolio validation rules
const validatePortfolio = [
  body("title").trim().isLength({ min: 2, max: 100 }).withMessage("Title must be between 2 and 100 characters"),
  body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
  body("category")
    .isIn(["wedding", "maternity", "portrait", "event", "commercial", "fashion", "product", "real-estate"])
    .withMessage("Invalid category"),
  body("images").isArray({ min: 1 }).withMessage("At least one image is required"),
  body("images.*.url").isURL().withMessage("Each image must have a valid URL"),
  body("images.*.caption").optional().isLength({ max: 200 }).withMessage("Caption cannot exceed 200 characters"),
  body("images.*.index").isInt({ min: 0 }).withMessage("Image index must be a non-negative number"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be between 1 and 30 characters"),
  handleValidationErrors,
]

// Common parameter validations
const validateObjectId = (paramName) => [
  param(paramName).isMongoId().withMessage(`${paramName} must be a valid MongoDB ObjectId`),
  handleValidationErrors,
]

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  handleValidationErrors,
]

module.exports = {
  validateSignup,
  validateLogin,
  validatePartnerProfile,
  validateInquiry,
  validatePortfolio,
  validateObjectId,
  validatePagination,
  handleValidationErrors,
}
