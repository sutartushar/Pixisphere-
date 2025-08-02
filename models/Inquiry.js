const mongoose = require("mongoose")

/**
 * @swagger
 * components:
 *   schemas:
 *     Inquiry:
 *       type: object
 *       properties:
 *         clientId:
 *           type: string
 *           format: objectId
 *         category:
 *           type: string
 *           enum: [wedding, maternity, portrait, event, commercial, fashion, product, real-estate]
 *         eventDetails:
 *           type: object
 *           properties:
 *             eventDate:
 *               type: string
 *               format: date
 *             eventTime:
 *               type: string
 *             duration:
 *               type: number
 *             guestCount:
 *               type: number
 *         budget:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *             max:
 *               type: number
 *         location:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             venue:
 *               type: string
 *         requirements:
 *           type: string
 *         referenceImages:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [new, assigned, responded, booked, closed, cancelled]
 *         assignedPartners:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               partnerId:
 *                 type: string
 *                 format: objectId
 *               assignedAt:
 *                 type: string
 *                 format: date-time
 *               response:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                   quotation:
 *                     type: number
 *                   respondedAt:
 *                     type: string
 *                     format: date-time
 */

const inquirySchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: ["wedding", "maternity", "portrait", "event", "commercial", "fashion", "product", "real-estate"],
      required: [true, "Category is required"],
    },
    eventDetails: {
      eventDate: {
        type: Date,
        required: [true, "Event date is required"],
      },
      eventTime: {
        type: String,
        required: [true, "Event time is required"],
      },
      duration: {
        type: Number,
        required: [true, "Event duration is required"],
        min: [1, "Duration must be at least 1 hour"],
      },
      guestCount: {
        type: Number,
        min: [1, "Guest count must be at least 1"],
      },
    },
    budget: {
      min: {
        type: Number,
        required: [true, "Minimum budget is required"],
        min: [0, "Budget cannot be negative"],
      },
      max: {
        type: Number,
        required: [true, "Maximum budget is required"],
        min: [0, "Budget cannot be negative"],
      },
    },
    location: {
      city: {
        type: String,
        required: [true, "City is required"],
      },
      state: {
        type: String,
        required: [true, "State is required"],
      },
      venue: {
        type: String,
        required: [true, "Venue is required"],
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    requirements: {
      type: String,
      maxlength: [1000, "Requirements cannot exceed 1000 characters"],
    },
    referenceImages: [
      {
        type: String,
        validate: {
          validator: (v) => /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v),
          message: "Please provide a valid image URL",
        },
      },
    ],
    status: {
      type: String,
      enum: ["new", "assigned", "responded", "booked", "closed", "cancelled"],
      default: "new",
    },
    assignedPartners: [
      {
        partnerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Partner",
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        response: {
          message: {
            type: String,
            maxlength: [500, "Response message cannot exceed 500 characters"],
          },
          quotation: {
            type: Number,
            min: [0, "Quotation cannot be negative"],
          },
          respondedAt: {
            type: Date,
          },
          isAccepted: {
            type: Boolean,
            default: false,
          },
        },
      },
    ],
    selectedPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    source: {
      type: String,
      enum: ["web", "mobile", "referral", "social"],
      default: "web",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better query performance
inquirySchema.index({ clientId: 1 })
inquirySchema.index({ category: 1 })
inquirySchema.index({ status: 1 })
inquirySchema.index({ "eventDetails.eventDate": 1 })
inquirySchema.index({ "location.city": 1 })
inquirySchema.index({ "assignedPartners.partnerId": 1 })
inquirySchema.index({ createdAt: -1 })

// Virtual populate for client details
inquirySchema.virtual("client", {
  ref: "User",
  localField: "clientId",
  foreignField: "_id",
  justOne: true,
})

// Validate budget range
inquirySchema.pre("save", function (next) {
  if (this.budget.min > this.budget.max) {
    next(new Error("Minimum budget cannot be greater than maximum budget"))
  }
  next()
})

// Validate event date is in future
inquirySchema.pre("save", function (next) {
  if (this.eventDetails.eventDate < new Date()) {
    next(new Error("Event date must be in the future"))
  }
  next()
})

module.exports = mongoose.model("Inquiry", inquirySchema)
