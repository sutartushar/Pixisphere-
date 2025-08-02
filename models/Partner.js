const mongoose = require("mongoose")

/**
 * @swagger
 * components:
 *   schemas:
 *     Partner:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: objectId
 *         businessInfo:
 *           type: object
 *           properties:
 *             businessName:
 *               type: string
 *             description:
 *               type: string
 *             categories:
 *               type: array
 *               items:
 *                 type: string
 *             experience:
 *               type: number
 *             priceRange:
 *               type: object
 *               properties:
 *                 min:
 *                   type: number
 *                 max:
 *                   type: number
 *         location:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             pincode:
 *               type: string
 *             address:
 *               type: string
 *         documents:
 *           type: object
 *           properties:
 *             aadharNumber:
 *               type: string
 *             panNumber:
 *               type: string
 *             gstNumber:
 *               type: string
 *         verification:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [pending, verified, rejected]
 *             comment:
 *               type: string
 *             verifiedBy:
 *               type: string
 *               format: objectId
 *             verifiedAt:
 *               type: string
 *               format: date-time
 */

const partnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessInfo: {
      businessName: {
        type: String,
        required: [true, "Business name is required"],
      },
      description: {
        type: String,
        required: [true, "Business description is required"],
        maxlength: [1000, "Description cannot exceed 1000 characters"],
      },
      categories: [
        {
          type: String,
          enum: ["wedding", "maternity", "portrait", "event", "commercial", "fashion", "product", "real-estate"],
          required: true,
        },
      ],
      experience: {
        type: Number,
        required: [true, "Experience in years is required"],
        min: [0, "Experience cannot be negative"],
      },
      priceRange: {
        min: {
          type: Number,
          required: [true, "Minimum price is required"],
          min: [0, "Price cannot be negative"],
        },
        max: {
          type: Number,
          required: [true, "Maximum price is required"],
          min: [0, "Price cannot be negative"],
        },
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
      pincode: {
        type: String,
        required: [true, "Pincode is required"],
        match: [/^[1-9][0-9]{5}$/, "Please enter a valid pincode"],
      },
      address: {
        type: String,
        required: [true, "Address is required"],
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    documents: {
      aadharNumber: {
        type: String,
        required: [true, "Aadhar number is required"],
        match: [/^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/, "Please enter a valid Aadhar number"],
      },
      panNumber: {
        type: String,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number"],
      },
      gstNumber: {
        type: String,
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Please enter a valid GST number"],
      },
    },
    verification: {
      status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
      comment: {
        type: String,
        maxlength: [500, "Comment cannot exceed 500 characters"],
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: {
        type: Date,
      },
    },
    portfolio: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portfolio",
      },
    ],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better query performance
partnerSchema.index({ userId: 1 })
partnerSchema.index({ "verification.status": 1 })
partnerSchema.index({ "businessInfo.categories": 1 })
partnerSchema.index({ "location.city": 1 })
partnerSchema.index({ "location.state": 1 })
partnerSchema.index({ isFeatured: 1 })
partnerSchema.index({ "rating.average": -1 })

// Virtual populate for user details
partnerSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
})

// Validate price range
partnerSchema.pre("save", function (next) {
  if (this.businessInfo.priceRange.min > this.businessInfo.priceRange.max) {
    next(new Error("Minimum price cannot be greater than maximum price"))
  }
  next()
})

module.exports = mongoose.model("Partner", partnerSchema)
