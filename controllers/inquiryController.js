const Inquiry = require("../models/Inquiry")
const matchingService = require("../services/matchingService")
const logger = require("../utils/logger")

/**
 * @swagger
 * /api/inquiry:
 *   post:
 *     summary: Create a new service inquiry
 *     tags: [Inquiry]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Inquiry'
 *     responses:
 *       201:
 *         description: Inquiry created successfully
 *       400:
 *         description: Validation error
 */
const createInquiry = async (req, res) => {
  try {
    const clientId = req.user.id
    const inquiryData = req.body

    // Create inquiry
    const inquiry = new Inquiry({
      clientId,
      ...inquiryData,
    })

    await inquiry.save()

    // Find matching partners
    try {
      const matchingPartnerIds = await matchingService.findMatchingPartners(inquiry, 5)

      if (matchingPartnerIds.length > 0) {
        // Distribute inquiry to matching partners
        await matchingService.distributeInquiry(inquiry._id, matchingPartnerIds)

        logger.info(`Inquiry ${inquiry._id} created and distributed to ${matchingPartnerIds.length} partners`)
      } else {
        logger.warn(`No matching partners found for inquiry ${inquiry._id}`)
      }
    } catch (matchingError) {
      logger.error("Error in partner matching:", matchingError)
      // Continue with inquiry creation even if matching fails
    }

    // Populate client details for response
    await inquiry.populate("clientId", "profile email")

    res.status(201).json({
      success: true,
      message: "Inquiry created successfully",
      data: { inquiry },
    })
  } catch (error) {
    logger.error("Create inquiry error:", error)
    res.status(500).json({
      success: false,
      message: "Error creating inquiry",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/inquiry/{id}:
 *   get:
 *     summary: Get inquiry details
 *     tags: [Inquiry]
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
const getInquiry = async (req, res) => {
  try {
    const inquiryId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    const query = { _id: inquiryId }

    // Role-based access control
    if (userRole === "client") {
      query.clientId = userId
    } else if (userRole === "partner") {
      // Partners can only see inquiries assigned to them
      const Partner = require("../models/Partner")
      const partner = await Partner.findOne({ userId })
      if (partner) {
        query["assignedPartners.partnerId"] = partner._id
      } else {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }
    }
    // Admins can see all inquiries

    const inquiry = await Inquiry.findOne(query)
      .populate("clientId", "profile email")
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
    logger.error("Get inquiry error:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiry",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/inquiry/{id}:
 *   put:
 *     summary: Update inquiry
 *     tags: [Inquiry]
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
 *             $ref: '#/components/schemas/Inquiry'
 *     responses:
 *       200:
 *         description: Inquiry updated successfully
 *       404:
 *         description: Inquiry not found
 */
const updateInquiry = async (req, res) => {
  try {
    const inquiryId = req.params.id
    const clientId = req.user.id
    const updateData = req.body

    // Only allow clients to update their own inquiries
    // and only if status is 'new' or 'assigned'
    const inquiry = await Inquiry.findOneAndUpdate(
      {
        _id: inquiryId,
        clientId,
        status: { $in: ["new", "assigned"] },
      },
      updateData,
      { new: true, runValidators: true },
    )
      .populate("clientId", "profile email")
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
        message: "Inquiry not found or cannot be updated",
      })
    }

    logger.info(`Inquiry ${inquiryId} updated by client ${clientId}`)

    res.status(200).json({
      success: true,
      message: "Inquiry updated successfully",
      data: { inquiry },
    })
  } catch (error) {
    logger.error("Update inquiry error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating inquiry",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * @swagger
 * /api/inquiry/{id}/cancel:
 *   post:
 *     summary: Cancel inquiry
 *     tags: [Inquiry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Inquiry cancelled successfully
 *       404:
 *         description: Inquiry not found
 */
const cancelInquiry = async (req, res) => {
  try {
    const inquiryId = req.params.id
    const clientId = req.user.id
    const { reason } = req.body

    const inquiry = await Inquiry.findOneAndUpdate(
      {
        _id: inquiryId,
        clientId,
        status: { $nin: ["booked", "closed", "cancelled"] },
      },
      {
        $set: {
          status: "cancelled",
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      },
      { new: true },
    )

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found or cannot be cancelled",
      })
    }

    logger.info(`Inquiry ${inquiryId} cancelled by client ${clientId}`)

    res.status(200).json({
      success: true,
      message: "Inquiry cancelled successfully",
      data: { inquiry },
    })
  } catch (error) {
    logger.error("Cancel inquiry error:", error)
    res.status(500).json({
      success: false,
      message: "Error cancelling inquiry",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

module.exports = {
  createInquiry,
  getInquiry,
  updateInquiry,
  cancelInquiry,
}
