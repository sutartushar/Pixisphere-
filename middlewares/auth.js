const jwt = require("jsonwebtoken")
const User = require("../models/User")
const logger = require("../utils/logger")

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token. User not found.",
        })
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated.",
        })
      }

      req.user = user
      next()
    } catch (jwtError) {
      logger.error("JWT verification failed:", jwtError)
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      })
    }
  } catch (error) {
    logger.error("Authentication middleware error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
    })
  }
}

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please authenticate first.",
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      })
    }

    next()
  }
}

// Optional authentication (for public routes that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next()
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select("-password")

      if (user && user.isActive) {
        req.user = user
      }
    } catch (jwtError) {
      // Silently fail for optional auth
      logger.warn("Optional auth failed:", jwtError.message)
    }

    next()
  } catch (error) {
    logger.error("Optional auth middleware error:", error)
    next()
  }
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
}
