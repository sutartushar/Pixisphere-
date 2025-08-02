const mongoose = require("mongoose")
const logger = require("../utils/logger")

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.NODE_ENV === "test" ? process.env.MONGODB_TEST_URI : process.env.MONGODB_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    )

    logger.info(`MongoDB Connected: ${conn.connection.host}`)
    return conn
  } catch (error) {
    logger.error("Database connection error:", error)
    process.exit(1)
  }
}

const disconnectDB = async () => {
  try {
    await mongoose.connection.close()
    logger.info("MongoDB Disconnected")
  } catch (error) {
    logger.error("Database disconnection error:", error)
  }
}

module.exports = { connectDB, disconnectDB }
