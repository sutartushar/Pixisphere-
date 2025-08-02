const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

const User = require("../models/User")
const Partner = require("../models/Partner")
const Portfolio = require("../models/Portfolio")
const Inquiry = require("../models/Inquiry")

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    // Clear existing data
    await User.deleteMany({})
    await Partner.deleteMany({})
    await Portfolio.deleteMany({})
    await Inquiry.deleteMany({})
    console.log("Cleared existing data")

    // Create admin user
    const adminUser = new User({
      email: "admin@pixisphere.com",
      password: "admin123",
      role: "admin",
      profile: {
        firstName: "Admin",
        lastName: "User",
        phone: "9876543210",
      },
      isVerified: true,
    })
    await adminUser.save()
    console.log("Admin user created")

    // Create sample client
    const clientUser = new User({
      email: "client@example.com",
      password: "client123",
      role: "client",
      profile: {
        firstName: "John",
        lastName: "Doe",
        phone: "9876543211",
      },
      isVerified: true,
    })
    await clientUser.save()
    console.log("Client user created")

    // Create sample partners
    const partnerUsers = []
    const partners = []

    for (let i = 1; i <= 5; i++) {
      const partnerUser = new User({
        email: `partner${i}@example.com`,
        password: "partner123",
        role: "partner",
        profile: {
          firstName: `Partner${i}`,
          lastName: "User",
          phone: `987654321${i}`,
        },
        isVerified: true,
      })
      await partnerUser.save()
      partnerUsers.push(partnerUser)

      const partner = new Partner({
        userId: partnerUser._id,
        businessInfo: {
          businessName: `Photography Studio ${i}`,
          description: `Professional photography services with ${i + 2} years of experience`,
          categories: ["wedding", "portrait", "event"],
          experience: i + 2,
          priceRange: {
            min: 10000 + i * 5000,
            max: 50000 + i * 10000,
          },
        },
        location: {
          city: ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata"][i - 1],
          state: ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal"][i - 1],
          pincode: `40000${i}`,
          address: `${i}th Floor, Photography Building, Studio Street`,
        },
        documents: {
          aadharNumber: `${2000 + i}${1000 + i}${2000 + i}${3000 + i}`,
          panNumber: `ABCDE${1000 + i}F`,
          gstNumber: `22ABCDE${1000 + i}F1Z5`,
        },
        verification: {
          status: i <= 3 ? "verified" : "pending",
        },
        rating: {
          average: 3.5 + i * 0.3,
          count: i * 10,
        },
        isFeatured: i <= 2,
        totalBookings: i * 5,
      })
      await partner.save()
      partners.push(partner)
    }
    console.log("Partner users and profiles created")

    // Create sample portfolios
    for (let i = 0; i < partners.length; i++) {
      const portfolio = new Portfolio({
        partnerId: partners[i]._id,
        title: `Wedding Collection ${i + 1}`,
        description: "Beautiful wedding photography showcasing love and emotions",
        category: "wedding",
        images: [
          {
            url: `https://picsum.photos/800/600?random=${i * 3 + 1}`,
            caption: "Bride and Groom Portrait",
            index: 0,
          },
          {
            url: `https://picsum.photos/800/600?random=${i * 3 + 2}`,
            caption: "Wedding Ceremony",
            index: 1,
          },
          {
            url: `https://picsum.photos/800/600?random=${i * 3 + 3}`,
            caption: "Reception Moments",
            index: 2,
          },
        ],
        tags: ["wedding", "portrait", "ceremony", "reception"],
        isFeatured: i < 2,
      })
      await portfolio.save()

      // Add portfolio to partner
      partners[i].portfolio.push(portfolio._id)
      await partners[i].save()
    }
    console.log("Sample portfolios created")

    // Create sample inquiries
    const inquiry = new Inquiry({
      clientId: clientUser._id,
      category: "wedding",
      eventDetails: {
        eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        eventTime: "18:00",
        duration: 8,
        guestCount: 200,
      },
      budget: {
        min: 25000,
        max: 75000,
      },
      location: {
        city: "Mumbai",
        state: "Maharashtra",
        venue: "Grand Ballroom, Hotel Taj",
      },
      requirements: "Looking for a professional wedding photographer with experience in Indian weddings",
      referenceImages: ["https://picsum.photos/400/300?random=100", "https://picsum.photos/400/300?random=101"],
      assignedPartners: [
        {
          partnerId: partners[0]._id,
          assignedAt: new Date(),
          response: {
            message: "We would love to capture your special day!",
            quotation: 45000,
            respondedAt: new Date(),
          },
        },
        {
          partnerId: partners[1]._id,
          assignedAt: new Date(),
        },
      ],
      status: "responded",
    })
    await inquiry.save()
    console.log("Sample inquiry created")

    console.log("Seed data created successfully!")
    console.log("\nLogin credentials:")
    console.log("Admin: admin@pixisphere.com / admin123")
    console.log("Client: client@example.com / client123")
    console.log("Partners: partner1@example.com to partner5@example.com / partner123")
  } catch (error) {
    console.error("Error seeding data:", error)
  } finally {
    await mongoose.disconnect()
  }
}

seedData()
