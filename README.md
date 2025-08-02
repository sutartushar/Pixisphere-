# Pixisphere Backend API

AI-powered photography service marketplace backend built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Role-based Authentication** - JWT-based auth with client, partner, and admin roles
- **Partner Onboarding** - Complete verification workflow with document validation
- **Smart Lead Distribution** - AI-powered matching of clients with photographers
- **Portfolio Management** - Image upload and portfolio organization
- **Admin Dashboard** - Comprehensive management and moderation tools
- **Real-time Notifications** - Email notifications for key events
- **API Documentation** - Swagger/OpenAPI documentation
- **Rate Limiting** - Protection against abuse
- **Comprehensive Logging** - Winston-based logging system

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Email**: Nodemailer
- **Testing**: Jest & Supertest
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 6.0+
- Git

## 🚀 Quick Start

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/your-username/pixisphere-backend.git
cd pixisphere-backend
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Environment Setup

Create a `.env` file in the root directory:

\`\`\`env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pixisphere

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
\`\`\`

### 4. Start MongoDB

Make sure MongoDB is running on your system, or use Docker:

\`\`\`bash
docker run -d -p 27017:27017 --name mongodb mongo:6.0
\`\`\`

### 5. Seed Database (Optional)

\`\`\`bash
node scripts/seedData.js
\`\`\`

### 6. Start the Server

\`\`\`bash
# Development mode
npm run dev

# Production mode
npm start
\`\`\`

The API will be available at `http://localhost:5000`

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

This will start:
- API server on port 5000
- MongoDB on port 27017
- Mongo Express (DB admin) on port 8081

### Using Docker Only

\`\`\`bash
# Build image
docker build -t pixisphere-api .

# Run container
docker run -p 5000:5000 --env-file .env pixisphere-api
\`\`\`

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:5000/api-docs`
- **Health Check**: `http://localhost:5000/health`

## 🔑 Authentication

The API uses JWT-based authentication with three roles:

### Default Accounts (after seeding)

\`\`\`
Admin: admin@pixisphere.com / admin123
Client: client@example.com / client123
Partners: partner1@example.com to partner5@example.com / partner123
\`\`\`

### Authentication Flow

1. **Signup** → **Verify OTP** → **Login** → **Get JWT Token**
2. Include token in requests: `Authorization: Bearer <token>`

## 🛣️ API Routes

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/verify-otp` - Verify account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Client Routes
- `GET /api/client/partners` - Search partners
- `GET /api/client/partners/:id` - Get partner details
- `GET /api/client/inquiries` - Get client inquiries
- `GET /api/client/dashboard` - Client dashboard

### Partner Routes
- `POST /api/partner/profile` - Create/update profile
- `GET /api/partner/leads` - Get assigned leads
- `POST /api/partner/leads/:id/respond` - Respond to lead
- `POST /api/partner/portfolio` - Add portfolio item
- `GET /api/partner/dashboard` - Partner dashboard

### Admin Routes
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/verifications` - Pending verifications
- `PUT /api/admin/verify/:id` - Approve/reject partner
- `GET /api/admin/users` - Manage users

### Inquiry Routes
- `POST /api/inquiry` - Create inquiry
- `GET /api/inquiry/:id` - Get inquiry details
- `PUT /api/inquiry/:id` - Update inquiry
- `POST /api/inquiry/:id/cancel` - Cancel inquiry

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
\`\`\`

## 📊 Postman Collection

Import the `postman_collection.json` file into Postman for easy API testing.

## 🔧 Project Structure

\`\`\`
pixisphere-backend/
├── controllers/          # Route controllers
├── models/              # Mongoose models
├── routes/              # Express routes
├── middlewares/         # Custom middleware
├── services/            # Business logic services
├── utils/               # Utility functions
├── config/              # Configuration files
├── scripts/             # Database scripts
├── logs/                # Log files
├── tests/               # Test files
├── app.js               # Express app setup
├── package.json         # Dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose setup
└── README.md           # This file
\`\`\`

## 🚀 Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy with build command: `npm install`
4. Start command: `npm start`

### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts to deploy

### Environment Variables for Production

\`\`\`env
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
EMAIL_HOST=your_email_host
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
\`\`\`

## 🔒 Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcryptjs
- **Rate Limiting** to prevent abuse
- **Input Validation** with express-validator
- **CORS Protection** with configurable origins
- **Helmet.js** for security headers
- **MongoDB Injection Protection**

## 📈 Performance Features

- **Database Indexing** for optimized queries
- **Pagination** for large datasets
- **Caching** strategies for frequently accessed data
- **Connection Pooling** for database connections
- **Compression** for API responses

## 🐛 Error Handling

The API includes comprehensive error handling:
- **Validation Errors** - 400 with detailed field errors
- **Authentication Errors** - 401 with clear messages
- **Authorization Errors** - 403 with role requirements
- **Not Found Errors** - 404 with resource info
- **Server Errors** - 500 with error tracking

## 📝 Logging

Winston-based logging system:
- **Development**: Console + File logging
- **Production**: File logging only
- **Log Levels**: error, warn, info, debug
- **Log Files**: `logs/error.log`, `logs/combined.log`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@pixisphere.com
- Documentation: API docs at `/api-docs`

## 🎯 Roadmap

- [ ] Real-time chat between clients and partners
- [ ] Payment integration with Razorpay/Stripe
- [ ] Advanced analytics dashboard
- [ ] Mobile app API enhancements
- [ ] AI-powered photo editing suggestions
- [ ] Multi-language support
- [ ] Advanced search with filters
- [ ] Booking calendar integration

---

**Built with ❤️ for the photography community**
