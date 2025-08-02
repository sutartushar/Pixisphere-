const Partner = require("../models/Partner")
const Portfolio = require("../models/Portfolio")
const Inquiry = require("../models/Inquiry")
const User = require("../models/User")
const logger = require("../utils/logger")

/**
 * @swagger
 * /api/partner/profile:
 *   post:
 *     summary: Create or update partner profile
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Partner'
 *     responses:
 *       201:
 *         description: Partner profile created successfully
 *       400:
 *         description: Validation error
 */
const createOrUpdateProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const profileData = req.body

    // Check if partner profile already exists
    let partner = await Partner.findOne({ userId })

    if (partner) {
      // Update existing profile
      Object.assign(partner, profileData)
      partner.verification.status = "pending" // Reset verification status on update
      await partner.save()

      logger.info(`Partner profile updated: ${userId}`)
    } else {
      // Create new profile
      partner = new Partner({
        userId,
        ...profileData,
      })
      await partner.save()

      logger.info(`Partner profile created: ${userId}`)
    }

    // Populate user details
    await partner.populate("userId", "profile email")

    res.status(201).json({
      success: true,
      message: partner.isNew ? "Partner profile created successfully" : "Partner profile updated successfully",
      data: { partner },
    })
  } catch (error) {
    logger.error("Create/Update partner profile error:", error)
    res.status(500).json({
      success: false,
      message: "Error managing partner profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/profile:
 *   get:
 *     summary: Get partner profile
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Partner profile retrieved successfully
 *       404:
 *         description: Partner profile not found
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id

    const partner = await Partner.findOne({ userId }).populate("userId", "profile email").populate("portfolio")

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    res.status(200).json({
      success: true,
      data: { partner },
    })
  } catch (error) {
    logger.error("Get partner profile error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving partner profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/leads:
 *   get:
 *     summary: Get assigned leads for partner
 *     tags: [Partner]
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 */
const getLeads = async (req, res) => {
  try {
    const userId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

    // Find partner
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    // Build query
    const query = {
      "assignedPartners.partnerId": partner._id,
    }

    if (status) {
      query.status = status
    }

    // Get leads with pagination
    const leads = await Inquiry.find(query)
      .populate("clientId", "profile email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Inquiry.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        leads,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    logger.error("Get partner leads error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving leads",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/leads/{id}/respond:
 *   post:
 *     summary: Respond to a lead
 *     tags: [Partner]
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
 *               - message
 *               - quotation
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 500
 *               quotation:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Response submitted successfully
 *       404:
 *         description: Lead not found
 */
const respondToLead = async (req, res) => {
  try {
    const userId = req.user.id
    const leadId = req.params.id
    const { message, quotation } = req.body

    // Find partner
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    // Find and update inquiry
    const inquiry = await Inquiry.findOneAndUpdate(
      {
        _id: leadId,
        "assignedPartners.partnerId": partner._id,
      },
      {
        $set: {
          "assignedPartners.$.response": {
            message,
            quotation,
            respondedAt: new Date(),
          },
          status: "responded",
        },
      },
      { new: true },
    ).populate("clientId", "profile email")

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or not assigned to you",
      })
    }

    logger.info(`Partner ${partner._id} responded to inquiry ${leadId}`)

    res.status(200).json({
      success: true,
      message: "Response submitted successfully",
      data: { inquiry },
    })
  } catch (error) {
    logger.error("Respond to lead error:", error)
    res.status(500).json({
      success: false,
      message: "Error submitting response",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/portfolio:
 *   post:
 *     summary: Add portfolio item
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Portfolio'
 *     responses:
 *       201:
 *         description: Portfolio item added successfully
 */
const addPortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id
    const portfolioData = req.body

    // Find partner
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    // Create portfolio item
    const portfolio = new Portfolio({
      partnerId: partner._id,
      ...portfolioData,
    })

    await portfolio.save()

    // Add to partner's portfolio array
    partner.portfolio.push(portfolio._id)
    await partner.save()

    logger.info(`Portfolio item added for partner ${partner._id}`)

    res.status(201).json({
      success: true,
      message: "Portfolio item added successfully",
      data: { portfolio },
    })
  } catch (error) {
    logger.error("Add portfolio item error:", error)
    res.status(500).json({
      success: false,
      message: "Error adding portfolio item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/portfolio:
 *   get:
 *     summary: Get partner portfolio
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portfolio retrieved successfully
 */
const getPortfolio = async (req, res) => {
  try {
    const userId = req.user.id

    // Find partner
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    // Get portfolio items
    const portfolio = await Portfolio.find({ partnerId: partner._id }).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      data: { portfolio },
    })
  } catch (error) {
    logger.error("Get portfolio error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving portfolio",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/portfolio/{id}:
 *   put:
 *     summary: Update portfolio item
 *     tags: [Partner]
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
 *             $ref: '#/components/schemas/Portfolio'
 *     responses:
 *       200:
 *         description: Portfolio item updated successfully
 */
const updatePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id
    const portfolioId = req.params.id
    const updateData = req.body

    // Find partner
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    // Update portfolio item
    const portfolio = await Portfolio.findOneAndUpdate({ _id: portfolioId, partnerId: partner._id }, updateData, {
      new: true,
      runValidators: true,
    })

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
      })
    }

    logger.info(`Portfolio item ${portfolioId} updated for partner ${partner._id}`)

    res.status(200).json({
      success: true,
      message: "Portfolio item updated successfully",
      data: { portfolio },
    })
  } catch (error) {
    logger.error("Update portfolio item error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating portfolio item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/portfolio/{id}:
 *   delete:
 *     summary: Delete portfolio item
 *     tags: [Partner]
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
 *         description: Portfolio item deleted successfully
 */
const deletePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id
    const portfolioId = req.params.id

    // Find partner
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    // Delete portfolio item
    const portfolio = await Portfolio.findOneAndDelete({
      _id: portfolioId,
      partnerId: partner._id,
    })

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
      })
    }

    // Remove from partner's portfolio array
    partner.portfolio.pull(portfolioId)
    await partner.save()

    logger.info(`Portfolio item ${portfolioId} deleted for partner ${partner._id}`)

    res.status(200).json({
      success: true,
      message: "Portfolio item deleted successfully",
    })
  } catch (error) {
    logger.error("Delete portfolio item error:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting portfolio item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/partner/dashboard:
 *   get:
 *     summary: Get partner dashboard stats
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id

    // Find partner
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found",
      })
    }

    // Get stats
    const totalLeads = await Inquiry.countDocuments({
      "assignedPartners.partnerId": partner._id,
    })

    const respondedLeads = await Inquiry.countDocuments({
      "assignedPartners.partnerId": partner._id,
      status: "responded",
    })

    const bookedLeads = await Inquiry.countDocuments({
      "assignedPartners.partnerId": partner._id,
      status: "booked",
    })

    const portfolioCount = await Portfolio.countDocuments({
      partnerId: partner._id,
    })

    // Recent leads
    const recentLeads = await Inquiry.find({
      "assignedPartners.partnerId": partner._id,
    })
      .populate("clientId", "profile email")
      .sort({ createdAt: -1 })
      .limit(5)

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalLeads,
          respondedLeads,
          bookedLeads,
          portfolioCount,
          verificationStatus: partner.verification.status,
          rating: partner.rating.average,
          totalBookings: partner.totalBookings,
        },
        recentLeads,
      },
    })
  } catch (error) {
    logger.error("Get partner dashboard error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

module.exports = {
  createOrUpdateProfile,
  getProfile,
  getLeads,
  respondToLead,
  addPortfolioItem,
  getPortfolio,
  updatePortfolioItem,
  deletePortfolioItem,
  getDashboard,
}
