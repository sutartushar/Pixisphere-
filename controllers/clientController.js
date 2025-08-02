const Inquiry = require("../models/Inquiry")
const Partner = require("../models/Partner")
const Portfolio = require("../models/Portfolio")
const matchingService = require("../services/matchingService")
const logger = require("../utils/logger")

/**
 * @swagger
 * /api/client/partners:
 *   get:
 *     summary: Search and browse partners
 *     tags: [Client]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [wedding, maternity, portrait, event, commercial, fashion, product, real-estate]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, price, experience, bookings]
 *     responses:
 *       200:
 *         description: Partners retrieved successfully
 */
const searchPartners = async (req, res) => {
  try {
    const { category, city, minPrice, maxPrice, rating, featured, page = 1, limit = 12, sortBy = "rating" } = req.query

    // Build search query
    const query = {
      "verification.status": "verified",
      isActive: true,
    }

    if (category) {
      query["businessInfo.categories"] = category
    }

    if (city) {
      query["location.city"] = { $regex: new RegExp(city, "i") }
    }

    if (minPrice || maxPrice) {
      query["businessInfo.priceRange.min"] = {}
      if (minPrice) query["businessInfo.priceRange.min"].$gte = Number.parseFloat(minPrice)
      if (maxPrice) query["businessInfo.priceRange.max"] = { $lte: Number.parseFloat(maxPrice) }
    }

    if (rating) {
      query["rating.average"] = { $gte: Number.parseFloat(rating) }
    }

    if (featured === "true") {
      query.isFeatured = true
    }

    // Build sort options
    let sortOptions = {}
    switch (sortBy) {
      case "rating":
        sortOptions = { "rating.average": -1, "rating.count": -1 }
        break
      case "price":
        sortOptions = { "businessInfo.priceRange.min": 1 }
        break
      case "experience":
        sortOptions = { "businessInfo.experience": -1 }
        break
      case "bookings":
        sortOptions = { totalBookings: -1 }
        break
      default:
        sortOptions = { isFeatured: -1, "rating.average": -1 }
    }

    // Execute search with pagination
    const partners = await Partner.find(query)
      .populate("userId", "profile")
      .populate({
        path: "portfolio",
        options: { limit: 3, sort: { isFeatured: -1, createdAt: -1 } },
      })
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Partner.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        partners,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
        filters: {
          category,
          city,
          minPrice,
          maxPrice,
          rating,
          featured,
          sortBy,
        },
      },
    })
  } catch (error) {
    logger.error("Search partners error:", error)
    res.status(500).json({
      success: false,
      message: "Error searching partners",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/client/partners/{id}:
 *   get:
 *     summary: Get partner details
 *     tags: [Client]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner details retrieved successfully
 *       404:
 *         description: Partner not found
 */
const getPartnerDetails = async (req, res) => {
  try {
    const partnerId = req.params.id

    const partner = await Partner.findById(partnerId).populate("userId", "profile").populate("portfolio")

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      })
    }

    // Increment view count (optional)
    // You could track partner profile views here

    res.status(200).json({
      success: true,
      data: { partner },
    })
  } catch (error) {
    logger.error("Get partner details error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving partner details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/client/inquiries:
 *   get:
 *     summary: Get client inquiries
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, assigned, responded, booked, closed, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Inquiries retrieved successfully
 */
const getInquiries = async (req, res) => {
  try {
    const clientId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

    // Build query
    const query = { clientId }
    if (status) {
      query.status = status
    }

    // Get inquiries with pagination
    const inquiries = await Inquiry.find(query)
      .populate({
        path: "assignedPartners.partnerId",
        populate: {
          path: "userId",
          select: "profile",
        },
      })
      .populate("selectedPartner")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Inquiry.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        inquiries,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    logger.error("Get client inquiries error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiries",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/client/inquiries/{id}:
 *   get:
 *     summary: Get inquiry details
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inquiry details retrieved successfully
 *       404:
 *         description: Inquiry not found
 */
const getInquiryDetails = async (req, res) => {
  try {
    const clientId = req.user.id
    const inquiryId = req.params.id

    const inquiry = await Inquiry.findOne({
      _id: inquiryId,
      clientId,
    })
      .populate({
        path: "assignedPartners.partnerId",
        populate: {
          path: "userId",
          select: "profile",
        },
      })
      .populate("selectedPartner")

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      })
    }

    res.status(200).json({
      success: true,
      data: { inquiry },
    })
  } catch (error) {
    logger.error("Get inquiry details error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiry details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/client/inquiries/{id}/select-partner:
 *   post:
 *     summary: Select a partner for booking
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerId
 *             properties:
 *               partnerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Partner selected successfully
 *       404:
 *         description: Inquiry or partner not found
 */
const selectPartner = async (req, res) => {
  try {
    const clientId = req.user.id
    const inquiryId = req.params.id
    const { partnerId } = req.body

    // Find and update inquiry
    const inquiry = await Inquiry.findOneAndUpdate(
      {
        _id: inquiryId,
        clientId,
        "assignedPartners.partnerId": partnerId,
      },
      {
        $set: {
          selectedPartner: partnerId,
          status: "booked",
          "assignedPartners.$.response.isAccepted": true,
        },
      },
      { new: true },
    )
      .populate("selectedPartner")
      .populate({
        path: "assignedPartners.partnerId",
        populate: {
          path: "userId",
          select: "profile",
        },
      })

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found or partner not assigned to this inquiry",
      })
    }

    // Update partner's total bookings
    await Partner.findByIdAndUpdate(partnerId, {
      $inc: { totalBookings: 1 },
    })

    logger.info(`Client ${clientId} selected partner ${partnerId} for inquiry ${inquiryId}`)

    res.status(200).json({
      success: true,
      message: "Partner selected successfully",
      data: { inquiry },
    })
  } catch (error) {
    logger.error("Select partner error:", error)
    res.status(500).json({
      success: false,
      message: "Error selecting partner",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/client/dashboard:
 *   get:
 *     summary: Get client dashboard stats
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 */
const getDashboard = async (req, res) => {
  try {
    const clientId = req.user.id

    // Get stats
    const totalInquiries = await Inquiry.countDocuments({ clientId })
    const activeInquiries = await Inquiry.countDocuments({
      clientId,
      status: { $in: ["new", "assigned", "responded"] },
    })
    const completedBookings = await Inquiry.countDocuments({
      clientId,
      status: "booked",
    })

    // Recent inquiries
    const recentInquiries = await Inquiry.find({ clientId })
      .populate({
        path: "assignedPartners.partnerId",
        populate: {
          path: "userId",
          select: "profile",
        },
      })
      .sort({ createdAt: -1 })
      .limit(5)

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalInquiries,
          activeInquiries,
          completedBookings,
        },
        recentInquiries,
      },
    })
  } catch (error) {
    logger.error("Get client dashboard error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

module.exports = {
  searchPartners,
  getPartnerDetails,
  getInquiries,
  getInquiryDetails,
  selectPartner,
  getDashboard,
}
