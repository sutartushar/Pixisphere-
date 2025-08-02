const Partner = require("../models/Partner")
const logger = require("../utils/logger")

class MatchingService {
  /**
   * Find matching partners for an inquiry
   * @param {Object} inquiry - The inquiry object
   * @param {number} limit - Maximum number of partners to return
   * @returns {Array} Array of matching partner IDs
   */
  async findMatchingPartners(inquiry, limit = 5) {
    try {
      const { category, location, budget, eventDetails } = inquiry

      // Build matching criteria
      const matchCriteria = {
        "verification.status": "verified",
        isActive: true,
        "businessInfo.categories": category,
        "location.city": { $regex: new RegExp(location.city, "i") },
      }

      // Budget filtering
      if (budget && budget.max) {
        matchCriteria.$or = [
          { "businessInfo.priceRange.min": { $lte: budget.max } },
          { "businessInfo.priceRange.max": { $gte: budget.min || 0 } },
        ]
      }

      // Find matching partners
      const partners = await Partner.find(matchCriteria)
        .populate("userId", "profile isActive")
        .sort({
          isFeatured: -1,
          "rating.average": -1,
          totalBookings: -1,
          createdAt: -1,
        })
        .limit(limit)

      // Apply additional scoring logic
      const scoredPartners = partners.map((partner) => ({
        partner,
        score: this.calculateMatchScore(partner, inquiry),
      }))

      // Sort by score and return partner IDs
      return scoredPartners.sort((a, b) => b.score - a.score).map((item) => item.partner._id)
    } catch (error) {
      logger.error("Error in findMatchingPartners:", error)
      throw error
    }
  }

  /**
   * Calculate match score for a partner
   * @param {Object} partner - Partner object
   * @param {Object} inquiry - Inquiry object
   * @returns {number} Match score
   */
  calculateMatchScore(partner, inquiry) {
    let score = 0

    // Base score for verified partners
    score += 10

    // Featured partners get bonus
    if (partner.isFeatured) {
      score += 20
    }

    // Rating bonus
    if (partner.rating.average > 0) {
      score += partner.rating.average * 5
    }

    // Experience bonus
    score += Math.min(partner.businessInfo.experience * 2, 20)

    // Location match (same city)
    if (partner.location.city.toLowerCase() === inquiry.location.city.toLowerCase()) {
      score += 15
    }

    // Budget compatibility
    if (inquiry.budget) {
      const partnerMin = partner.businessInfo.priceRange.min
      const partnerMax = partner.businessInfo.priceRange.max
      const inquiryMin = inquiry.budget.min
      const inquiryMax = inquiry.budget.max

      // Check if there's budget overlap
      if (partnerMin <= inquiryMax && partnerMax >= inquiryMin) {
        score += 10

        // Bonus for perfect budget fit
        if (partnerMin >= inquiryMin && partnerMax <= inquiryMax) {
          score += 5
        }
      }
    }

    // Booking history bonus
    if (partner.totalBookings > 0) {
      score += Math.min(partner.totalBookings, 10)
    }

    // Category specialization (if partner has fewer categories, they might be more specialized)
    if (partner.businessInfo.categories.length <= 3) {
      score += 5
    }

    return score
  }

  /**
   * Get partner availability for a specific date
   * @param {string} partnerId - Partner ID
   * @param {Date} eventDate - Event date
   * @returns {boolean} Availability status
   */
  async checkPartnerAvailability(partnerId, eventDate) {
    try {
      // This is a simplified version
      // In a real application, you would check against a booking calendar

      // For now, we'll assume partners are available
      // You could integrate with a calendar system or booking model

      return true
    } catch (error) {
      logger.error("Error checking partner availability:", error)
      return false
    }
  }

  /**
   * Distribute inquiry to matched partners
   * @param {string} inquiryId - Inquiry ID
   * @param {Array} partnerIds - Array of partner IDs
   * @returns {Object} Distribution result
   */
  async distributeInquiry(inquiryId, partnerIds) {
    try {
      const Inquiry = require("../models/Inquiry")

      const assignedPartners = partnerIds.map((partnerId) => ({
        partnerId,
        assignedAt: new Date(),
      }))

      await Inquiry.findByIdAndUpdate(inquiryId, {
        $set: {
          assignedPartners,
          status: "assigned",
        },
      })

      logger.info(`Inquiry ${inquiryId} distributed to ${partnerIds.length} partners`)

      return {
        success: true,
        assignedCount: partnerIds.length,
        partnerIds,
      }
    } catch (error) {
      logger.error("Error distributing inquiry:", error)
      throw error
    }
  }
}

module.exports = new MatchingService()
