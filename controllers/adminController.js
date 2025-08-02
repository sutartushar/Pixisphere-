const User = require("../models/User")
const Partner = require("../models/Partner")
const Inquiry = require("../models/Inquiry")
const Portfolio = require("../models/Portfolio")
const { sendPartnerVerificationEmail } = require("../utils/email")
const logger = require("../utils/logger")

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
const getDashboard = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments()
    const totalClients = await User.countDocuments({ role: "client" })
    const totalPartners = await User.countDocuments({ role: "partner" })
    const verifiedPartners = await Partner.countDocuments({ "verification.status": "verified" })
    const pendingVerifications = await Partner.countDocuments({ "verification.status": "pending" })
    const totalInquiries = await Inquiry.countDocuments()
    const activeInquiries = await Inquiry.countDocuments({
      status: { $in: ["new", "assigned", "responded"] },
    })
    const completedBookings = await Inquiry.countDocuments({ status: "booked" })

    // Recent activities
    const recentUsers = await User.find().select("email role profile createdAt").sort({ createdAt: -1 }).limit(5)

    const recentInquiries = await Inquiry.find().populate("clientId", "profile email").sort({ createdAt: -1 }).limit(5)

    const recentPartners = await Partner.find({ "verification.status": "pending" })
      .populate("userId", "profile email")
      .sort({ createdAt: -1 })
      .limit(5)

    // Monthly stats (simplified - you might want to use aggregation pipeline)
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthlyUsers = await User.countDocuments({
      createdAt: { $gte: currentMonth },
    })
    const monthlyInquiries = await Inquiry.countDocuments({
      createdAt: { $gte: currentMonth },
    })
    const monthlyBookings = await Inquiry.countDocuments({
      status: "booked",
      updatedAt: { $gte: currentMonth },
    })

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalClients,
          totalPartners,
          verifiedPartners,
          pendingVerifications,
          totalInquiries,
          activeInquiries,
          completedBookings,
        },
        monthly: {
          users: monthlyUsers,
          inquiries: monthlyInquiries,
          bookings: monthlyBookings,
        },
        recent: {
          users: recentUsers,
          inquiries: recentInquiries,
          partners: recentPartners,
        },
      },
    })
  } catch (error) {
    logger.error("Get admin dashboard error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/admin/verifications:
 *   get:
 *     summary: Get pending partner verifications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected]
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
 *         description: Verifications retrieved successfully
 */
const getVerifications = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 10 } = req.query

    const query = { "verification.status": status }

    const verifications = await Partner.find(query)
      .populate("userId", "profile email createdAt")
      .populate("verification.verifiedBy", "profile email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Partner.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        verifications,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    logger.error("Get verifications error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving verifications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/admin/verify/{id}:
 *   put:
 *     summary: Approve or reject partner verification
 *     tags: [Admin]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [verified, rejected]
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Verification status updated successfully
 *       404:
 *         description: Partner not found
 */
const updateVerification = async (req, res) => {
  try {
    const partnerId = req.params.id
    const adminId = req.user.id
    const { status, comment } = req.body

    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      {
        $set: {
          "verification.status": status,
          "verification.comment": comment,
          "verification.verifiedBy": adminId,
          "verification.verifiedAt": new Date(),
        },
      },
      { new: true },
    ).populate("userId", "profile email")

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      })
    }

    // Send verification email
    try {
      await sendPartnerVerificationEmail(partner.userId.email, partner.userId.profile.firstName, status, comment)
    } catch (emailError) {
      logger.error("Failed to send verification email:", emailError)
    }

    logger.info(`Partner ${partnerId} verification ${status} by admin ${adminId}`)

    res.status(200).json({
      success: true,
      message: `Partner ${status} successfully`,
      data: { partner },
    })
  } catch (error) {
    logger.error("Update verification error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating verification status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [client, partner, admin]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Users retrieved successfully
 */
const getUsers = async (req, res) => {
  try {
    const { role, isActive, isVerified, search, page = 1, limit = 10 } = req.query

    // Build query
    const query = {}

    if (role) query.role = role
    if (isActive !== undefined) query.isActive = isActive === "true"
    if (isVerified !== undefined) query.isVerified = isVerified === "true"

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { "profile.firstName": { $regex: search, $options: "i" } },
        { "profile.lastName": { $regex: search, $options: "i" } },
      ]
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    logger.error("Get users error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/admin/users/{id}/toggle-status:
 *   put:
 *     summary: Toggle user active status
 *     tags: [Admin]
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
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 */
const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id
    const adminId = req.user.id

    // Prevent admin from deactivating themselves
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify your own account status",
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    user.isActive = !user.isActive
    await user.save()

    logger.info(`User ${userId} status toggled to ${user.isActive} by admin ${adminId}`)

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          isActive: user.isActive,
        },
      },
    })
  } catch (error) {
    logger.error("Toggle user status error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating user status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/admin/partners/{id}/feature:
 *   put:
 *     summary: Toggle partner featured status
 *     tags: [Admin]
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
 *         description: Partner featured status updated successfully
 *       404:
 *         description: Partner not found
 */
const togglePartnerFeatured = async (req, res) => {
  try {
    const partnerId = req.params.id
    const adminId = req.user.id

    const partner = await Partner.findById(partnerId)
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      })
    }

    partner.isFeatured = !partner.isFeatured
    await partner.save()

    logger.info(`Partner ${partnerId} featured status toggled to ${partner.isFeatured} by admin ${adminId}`)

    res.status(200).json({
      success: true,
      message: `Partner ${partner.isFeatured ? "featured" : "unfeatured"} successfully`,
      data: {
        partner: {
          id: partner._id,
          businessName: partner.businessInfo.businessName,
          isFeatured: partner.isFeatured,
        },
      },
    })
  } catch (error) {
    logger.error("Toggle partner featured error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating partner featured status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/admin/inquiries:
 *   get:
 *     summary: Get all inquiries with filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, assigned, responded, booked, closed, cancelled]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
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
 *         description: Inquiries retrieved successfully
 */
const getInquiries = async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 10 } = req.query

    // Build query
    const query = {}
    if (status) query.status = status
    if (category) query.category = category
    if (priority) query.priority = priority

    const inquiries = await Inquiry.find(query)
      .populate("clientId", "profile email")
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
    logger.error("Get admin inquiries error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiries",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

module.exports = {
  getDashboard,
  getVerifications,
  updateVerification,
  getUsers,
  toggleUserStatus,
  togglePartnerFeatured,
  getInquiries,
}
