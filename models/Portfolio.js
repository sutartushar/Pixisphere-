const mongoose = require("mongoose")

/**
 * @swagger
 * components:
 *   schemas:
 *     Portfolio:
 *       type: object
 *       properties:
 *         partnerId:
 *           type: string
 *           format: objectId
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [wedding, maternity, portrait, event, commercial, fashion, product, real-estate]
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               caption:
 *                 type: string
 *               index:
 *                 type: number
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *         isFeatured:
 *           type: boolean
 */

const portfolioSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Portfolio title is required"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    category: {
      type: String,
      enum: ["wedding", "maternity", "portrait", "event", "commercial", "fashion", "product", "real-estate"],
      required: [true, "Category is required"],
    },
    images: [
      {
        url: {
          type: String,
          required: [true, "Image URL is required"],
          validate: {
            validator: (v) => /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v),
            message: "Please provide a valid image URL",
          },
        },
        caption: {
          type: String,
          maxlength: [200, "Caption cannot exceed 200 characters"],
        },
        index: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
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
portfolioSchema.index({ partnerId: 1 })
portfolioSchema.index({ category: 1 })
portfolioSchema.index({ tags: 1 })
portfolioSchema.index({ isFeatured: 1 })
portfolioSchema.index({ isActive: 1 })
portfolioSchema.index({ createdAt: -1 })

// Virtual populate for partner details
portfolioSchema.virtual("partner", {
  ref: "Partner",
  localField: "partnerId",
  foreignField: "_id",
  justOne: true,
})

// Ensure images are sorted by index
portfolioSchema.pre("save", function (next) {
  if (this.images && this.images.length > 0) {
    this.images.sort((a, b) => a.index - b.index)
  }
  next()
})

module.exports = mongoose.model("Portfolio", portfolioSchema)
