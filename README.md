# DeedPro - Enterprise Real Estate Document Platform

A comprehensive full-stack platform for creating, managing, and recording real estate transfer documents with enterprise-grade external integrations, AI-powered assistance, and professional admin dashboard with comprehensive monitoring and management capabilities.

## 🏗️ Architecture

- **Frontend**: Next.js (React + TypeScript) with AI-enhanced wizard interface
- **Backend**: FastAPI (Python) with dual API architecture
- **Database**: PostgreSQL with Supabase integration
- **AI Assistance**: OpenAI integration for smart form field suggestions
- **External Integrations**: SoftPro 360 & Qualia API connections
- **Payments**: Stripe-powered subscription management
- **Deployment**: Vercel (Frontend) + Render (Backend + External API)

## 🚀 Features

### Core Platform
- **iPhone-Style Interface**: Large, bubbly, intuitive design for effortless navigation
- **Enhanced Deed Wizard**: Step-by-step creation with smart tooltips and AI assistance
- **Interactive Card Selection**: Touch-friendly deed type selection (no dropdowns!)
- **Account Management**: Profile, payment methods, and subscription management
- **Document Generation**: Professional deed creation with legal template merging
- **Real-time Sync**: All data synchronized across devices via robust API

### User Registration & Authentication 🔐
- **Comprehensive Registration**: Beautiful, bubbly iPhone-inspired registration form
- **JWT Authentication**: Secure token-based authentication with bcrypt password hashing
- **Form Validation**: Password strength, email format, and state code validation
- **Terms Agreement**: Required terms and conditions acceptance
- **Test Accounts**: Pre-seeded accounts for all plan tiers (Free, Professional, Enterprise)
- **Secure Login**: Professional login page with success handling and error management

### Freemium Business Model 💳
- **Three-Tier Plans**: Free (5 deeds/month), Professional ($29/month), Enterprise ($99/month)
- **Stripe Integration**: Complete checkout sessions and subscription management
- **Plan Limits Enforcement**: Real-time checking with visual usage indicators
- **Upgrade Prompts**: Seamless upgrade flow when limits are reached
- **Billing Portal**: Stripe customer portal for subscription management
- **Webhook Handling**: Automatic plan updates via Stripe webhooks

### Enterprise Admin Dashboard 🎯
- **Sidebar Navigation**: Professional fixed sidebar with real-time stats and quick actions
- **Comprehensive Metrics**: 6-panel overview with users, deeds, revenue, API calls, system health, and integrations
- **Audit Logs**: Complete action tracking with timestamps, IP addresses, and user agent logging
- **Notification Center**: Real-time alerts with unread counters and action links
- **Performance Benchmarks**: Visual trend analysis for API calls and response times over time
- **Export/Reporting**: CSV/PDF export capabilities across all admin sections
- **Backup & Recovery**: One-click manual backups and scheduled restore points
- **Feedback & Support**: Embedded forms for issue reporting and feature requests
- **Role-Based Permissions**: Admin, Viewer, and User role management with filtering

### AI-Powered Intelligence 🤖
- **Smart Field Assistance**: AI suggestions for property addresses, legal descriptions
- **Context-Aware Help**: Deed-type specific guidance and formatting
- **Professional Formatting**: Automatic legal document formatting and validation
- **Interactive Tooltips**: Hover-activated help for complex legal concepts
- **Mock Responses**: Works with or without OpenAI API key for development

### Enterprise Integrations 🏢
- **SoftPro 360 Integration**: Webhook endpoints for Process Automation
- **Qualia GraphQL API**: Bidirectional order import/export capabilities
- **Client-Level Authentication**: Secure API keys with scope-based permissions
- **Background Processing**: Non-blocking deed generation for external systems
- **Comprehensive Logging**: Full audit trail for all integration activities

### Security & Scalability
- **Dual API Architecture**: Separate internal and external APIs (ports 8000/8001)
- **Zero-Conflict Design**: External integrations don't affect core functionality
- **Rate Limiting Ready**: Production-ready security measures
- **Error Handling**: Robust error recovery and fallback mechanisms

## 📁 Project Structure

```
deeds/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── register/     # User registration with comprehensive validation
│   │   │   ├── login/        # JWT authentication with test account helper
│   │   │   ├── dashboard/    # Main dashboard page
│   │   │   ├── create-deed/  # AI-Enhanced Deed Wizard with plan limits
│   │   │   ├── account-settings/ # Account & subscription management
│   │   │   ├── admin/        # Enterprise Admin Dashboard
│   │   │   ├── past-deeds/   # Deed history
│   │   │   └── shared-deeds/ # Collaboration features
│   │   ├── components/       # Reusable React components
│   │   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   │   ├── AdminSidebar.tsx # Admin navigation with notifications
│   │   │   ├── Features.tsx  # Landing page features
│   │   │   └── [others]      # Hero, Footer, Navbar, Pricing
│   │   └── styles/           # Enhanced CSS stylesheets
│   │       └── dashboard.css # Main styles with AI/tooltip animations
│   └── package.json
├── backend/                  # Main FastAPI backend (Port 8000)
│   ├── main.py              # Core API endpoints and routes with auth & Stripe
│   ├── auth.py              # JWT authentication and password utilities
│   ├── database.py          # Database utilities and models  
│   ├── ai_assist.py         # AI assistance endpoints
│   ├── requirements.txt     # Python dependencies (updated with auth packages)
│   ├── scripts/
│   │   └── init_db.py       # Database initialization with test accounts
│   ├── external_api.py      # External Integrations API (Port 8001)
│   ├── external_requirements.txt # External API dependencies
│   ├── start_external_api.py # External API startup script
│   ├── EXTERNAL_API_README.md # External API documentation
│   └── .env                 # Environment variables (includes Stripe & JWT keys)
└── templates/               # HTML templates for document generation
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Git

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open [http://localhost:3000](http://localhost:3000)
   - Navigate to `/dashboard` for the main interface

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. **Install dependencies:**
   ```bash
   # Core API dependencies
   pip install -r requirements.txt
   
   # External API dependencies (optional)
   pip install -r external_requirements.txt
   ```

5. **Configure environment variables:**
   ```bash
   # Copy and configure main API
   cp .env.example .env
   # Add your credentials (see Environment Variables section)
   ```

6. **Initialize the database with registration system:**
   ```bash
   # Run database initialization script
   python scripts/init_db.py
   # This creates user tables, plan limits, and test accounts
   ```

7. **Start the APIs:**
   
   **Main API (Port 8000):**
   ```bash
   python main.py
   # Or: uvicorn main:app --reload
   ```
   
   **External Integrations API (Port 8001):**
   ```bash
   python start_external_api.py
   # Or: uvicorn external_api:external_app --port 8001 --reload
   ```

8. **Access the APIs:**
   - **Main API docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **External API docs**: [http://localhost:8001/docs](http://localhost:8001/docs)
   - **Health checks**: `/health` on both APIs
   - **Registration**: [http://localhost:3000/register](http://localhost:3000/register)
   - **Login**: [http://localhost:3000/login](http://localhost:3000/login)

### 🧪 Test Accounts
The database initialization creates these test accounts:
- **Free Plan**: test@escrow.com (password: testpass123)
- **Professional Plan**: pro@title.com (password: propass123)  
- **Enterprise Plan**: admin@deedpro.com (password: adminpass123)

## 🔧 Environment Variables

### Backend (.env)

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe Payments & Subscriptions
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_PROFESSIONAL_PRICE_ID=your_professional_price_id
STRIPE_ENTERPRISE_PRICE_ID=your_enterprise_price_id

# Frontend URL (for Stripe redirects)
FRONTEND_URL=http://localhost:3000

# AI Assistance (Optional - works with mock responses if not provided)
OPENAI_API_KEY=your_openai_api_key

# External API Configuration (for SoftPro/Qualia integrations)
EXTERNAL_API_SECRET_KEY=your_external_api_secret
QUALIA_USERNAME=your_qualia_username
QUALIA_PASSWORD=your_qualia_password
QUALIA_API_URL=https://api.qualia.com/graphql

# Security & Performance
ALLOWED_ORIGINS=*
API_RATE_LIMIT=100
LOG_LEVEL=INFO
```

### Frontend (.env.local)

```env
# Backend API URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_EXTERNAL_API_URL=http://localhost:8001

# Stripe (for frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## 🚀 Deployment

### Frontend (Vercel)

1. **Connect GitHub repository to Vercel**
2. **Set build settings:**
   - Framework: Next.js
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `.next`

3. **Add environment variables in Vercel dashboard:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-main-api.render.com
   NEXT_PUBLIC_EXTERNAL_API_URL=https://your-external-api.render.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
   ```

### Backend APIs (Render)

#### Main API Service
1. **Create Web Service:**
   - Name: `deedpro-main-api`
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### External Integrations API Service  
1. **Create Web Service:**
   - Name: `deedpro-external-api`
   - Root directory: `backend`
   - Build command: `pip install -r external_requirements.txt`
   - Start command: `python start_external_api.py`
   - Environment variable: `EXTERNAL_API_PORT=$PORT`

2. **Add environment variables to both services:**
   - All variables from your `.env` file
   - Ensure API keys and secrets are set for production

### Domain Configuration

```
Production URLs:
├── Frontend: https://deedpro.vercel.app
├── Main API: https://deedpro-main-api.render.com
└── External API: https://deedpro-external-api.render.com
```

## 📋 API Endpoints

### Main API (Port 8000) - Core Platform

#### Users & Authentication
- `POST /users/register` - Comprehensive user registration with validation
- `POST /users/login` - JWT authentication with secure token generation
- `GET /users/profile` - Get current user profile with plan information
- `POST /users/upgrade` - Initiate plan upgrade via Stripe checkout
- `GET /users/{email}` - Get user by email (legacy)
- `GET /user/me` - Get current user profile (legacy)

#### Deed Management
- `POST /deeds` - Create a new deed
- `GET /deeds` - List user's deeds with filtering
- `GET /deeds/{deed_id}` - Get specific deed details
- `PUT /deeds/{deed_id}/status` - Update deed status
- `DELETE /deeds/{deed_id}` - Delete a deed
- `GET /deeds/{deed_id}/download` - Generate and download deed PDF

#### Shared Deeds & Collaboration
- `POST /shared-deeds` - Share deed for approval
- `GET /shared-deeds` - List shared deeds
- `POST /shared-deeds/{id}/resend` - Resend approval email
- `DELETE /shared-deeds/{id}` - Revoke shared deed access
- `GET /approve/{token}` - Public approval view
- `POST /approve/{token}` - Submit approval response

#### Payment & Subscriptions
- `POST /payments/webhook` - Handle Stripe webhook events (checkout, invoices, cancellations)
- `POST /payments/create-portal-session` - Create Stripe customer portal session
- `POST /payment-methods` - Add payment method via Stripe (legacy)
- `GET /payment-methods` - List payment methods (legacy)
- `DELETE /payment-methods/{id}` - Remove payment method (legacy)
- `POST /subscriptions` - Create subscription (legacy)
- `GET /subscriptions` - Get current subscription (legacy)

#### AI Assistance 🤖
- `POST /api/ai/assist` - Get AI suggestions for form fields

#### Enterprise Admin Panel 👑
- `GET /admin/dashboard` - Comprehensive admin overview with 6-panel metrics
- `GET /admin/users` - List all users with role filtering and pagination
- `GET /admin/users/{id}` - Detailed user information with API usage tracking
- `PUT /admin/users/{id}` - Update user roles and permissions (admin only)
- `DELETE /admin/users/{id}` - Deactivate user account
- `GET /admin/deeds` - List all deeds with AI/API usage indicators
- `GET /admin/audit-logs` - Comprehensive audit trail with search/filter
- `GET /admin/notifications` - Real-time system alerts and warnings
- `GET /admin/revenue` - Revenue analytics with subscription breakdowns
- `GET /admin/analytics` - Platform analytics with performance trends
- `GET /admin/system-health` - System monitoring with performance benchmarks
- `POST /admin/backup` - Create manual system backup
- `GET /admin/backups` - List backup history and restore points
- `POST /admin/export` - Export data (CSV/PDF) across all sections
- `POST /admin/feedback` - Submit admin feedback and feature requests

### External Integrations API (Port 8001) - Enterprise

#### SoftPro 360 Integration
- `POST /api/v1/softpro/webhook` - Receive SoftPro order data
- `GET /api/v1/softpro/orders/{id}/deed` - Get deed by SoftPro order ID

#### Qualia Integration  
- `POST /api/v1/qualia/import-order` - Import order from Qualia
- `POST /api/v1/qualia/export-deed` - Export deed to Qualia

#### General Integration Endpoints
- `GET /health` - External API health check
- `GET /api/v1/status` - API status with partner info
- `POST /api/v1/test-connection` - Test API key and connection
- `GET /api/v1/deeds` - List deeds for authenticated partner
- `GET /api/v1/keys/info` - Get API key information

### Property Data
- `GET /property/search?address={address}` - Search property information

## 🎨 UI/UX Features

### iPhone-Inspired Design Philosophy
- **Large, Bubbly Interface**: Generous padding, rounded corners, and touch-friendly elements
- **Card-Based Selection**: Interactive cards instead of dropdowns for intuitive selection
- **Smart Tooltips**: Hover-activated help bubbles with detailed explanations
- **Visual Feedback**: Smooth animations and hover effects for enhanced interaction
- **One-Tap Actions**: Streamlined workflows with minimal clicks required

### Advanced User Assistance
- **Interactive Tooltips**: 💡 indicators show helpful explanations on hover
- **AI-Powered Suggestions**: ✨ Smart field assistance with "Use This" quick actions
- **Context-Aware Help**: Deed-type specific guidance and legal explanations
- **Visual Progress**: Enhanced step indicators with completion states
- **Error Prevention**: Smart formatting and validation before submission

### Accessibility & Responsiveness
- **Touch-Optimized**: Large target areas perfect for mobile and tablet use
- **High Contrast**: Professional color scheme with excellent readability
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Friendly**: Semantic HTML and ARIA labels
- **Cross-Device Sync**: Consistent experience across all platforms

## 🔒 Security

### Core Security Measures
- **Environment Variables**: All sensitive data stored securely
- **CORS Configuration**: Properly configured for production environments
- **API Key Authentication**: Client-level authentication with scope-based permissions
- **Database Security**: Parameterized queries prevent SQL injection
- **HTTPS Only**: All production traffic encrypted in transit

### External Integration Security
- **Dual API Architecture**: Core and external APIs completely separated
- **Scope-Based Access**: Fine-grained permissions for external partners
- **Rate Limiting**: Production-ready throttling and abuse prevention
- **Audit Logging**: Comprehensive logging for all external API access
- **IP Whitelisting**: Restrict access to known partner IP addresses

### Payment Security
- **Stripe Integration**: PCI-compliant payment processing
- **Webhook Verification**: Secure webhook signature validation
- **Token-Based**: No sensitive payment data stored locally
- **Subscription Management**: Secure recurring payment handling

### Deployment Security
- **Secret Management**: Environment variables for all credentials
- **Zero-Exposure Design**: External APIs don't affect core functionality
- **Error Handling**: Secure error messages without data leakage
- **Health Monitoring**: Real-time security and performance monitoring

## 📖 Usage

### For End Users
1. **Dashboard**: Overview of recent deeds, quick actions, and analytics
2. **AI-Enhanced Deed Wizard**: 
   - Select deed type using interactive cards with helpful tooltips
   - Get AI assistance for complex fields like legal descriptions
   - Review and generate professional documents
3. **Collaboration**: Share deeds for approval with external parties
4. **Account Management**: Manage profile, payments, and subscription settings

### For Administrators  
1. **Enterprise Admin Dashboard**: 
   - **Sidebar Navigation**: Professional fixed sidebar with real-time stats
   - **Comprehensive Overview**: 6-panel metrics (users, deeds, revenue, API calls, health, integrations)
   - **Audit Logs**: Complete action tracking with IP addresses, timestamps, and search/filter
   - **Notification Center**: Real-time alerts with unread counters and action links
2. **Advanced User Management**: 
   - **Role-Based Filtering**: Admin, Viewer, User role management
   - **API Usage Tracking**: Monitor API calls and integration usage per user
   - **Company & Role Tracking**: Enhanced user profiles with business context
3. **Revenue & Analytics**: 
   - **Subscription Breakdowns**: Enterprise API, Professional, Starter plan analytics
   - **Performance Trends**: Visual charts showing growth over time
   - **Export Capabilities**: CSV/PDF reports for all admin sections
4. **System Management**: 
   - **Performance Benchmarks**: Visual trend analysis for API response times
   - **Backup & Recovery**: One-click manual backups and restore points
   - **Health Monitoring**: Real-time system status with 99.9% uptime tracking
   - **Feedback Integration**: Built-in forms for admin issue reporting and feature requests

### For External Partners (SoftPro/Qualia)
1. **Webhook Integration**: Automatic deed generation from order data
2. **API Access**: Programmatic access with secure API keys
3. **Document Exchange**: Bidirectional document sharing and status updates
4. **Real-time Processing**: Background deed generation with instant responses

### AI Assistance Features
- **Smart Formatting**: AI helps format addresses, names, and legal text
- **Context-Aware Suggestions**: Deed-type specific recommendations
- **Professional Output**: Ensures legal document standards and formatting
- **Learning Tool**: Tooltips educate users about legal concepts and requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for DeedPro.io.

## 🤝 Getting Started with Integrations

### SoftPro 360 Partnership
1. **Apply for Partnership**: https://www.softprocorp.com/become-a-partner/
2. **Contact Support**: support@softprocorp.com (mention you're a current user)
3. **Developer Resources**: https://devforum.softprocorp.com
4. **Setup Process**: See `backend/EXTERNAL_API_README.md` for detailed instructions

### Qualia API Access
1. **Contact Qualia**: https://qualia.com/contact
2. **API Terms**: https://qualia.com/api-terms  
3. **Email Support**: api@qualia.com
4. **Integration Guide**: Full documentation in external API README

## 🔧 Development Commands

### PowerShell Commands (Windows)
```powershell
# Start both APIs simultaneously
cd backend
Start-Job { python main.py }
Start-Job { python start_external_api.py }

# Or start individually
python main.py          # Main API (Port 8000)
python start_external_api.py  # External API (Port 8001)
```

### Testing External Integrations
```bash
# Test SoftPro webhook
curl -X POST "http://localhost:8001/api/v1/softpro/webhook" \
  -H "X-API-Key: softpro_api_key_123" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "SP12345", "property_address": "123 Main St", "buyer_name": "John Doe", "seller_name": "Jane Smith"}'

# Test AI assistance  
curl -X POST "http://localhost:8000/api/ai/assist" \
  -H "Content-Type: application/json" \
  -d '{"deed_type": "Grant Deed", "field": "property_address", "input": "123 main st los angeles"}'
```

## 🆘 Support & Documentation

### Main Documentation
- **API Documentation**: http://localhost:8000/docs (Main API)
- **External API Docs**: http://localhost:8001/docs (External Integrations)
- **External API Guide**: `backend/EXTERNAL_API_README.md`
- **Registration & Stripe Setup**: `SETUP_GUIDE.md` - Complete implementation guide
- **Development Navigation**: `DEVELOPMENT_GUIDE.md` - Developer workflow guide

### Support Channels
- **Technical Issues**: Check API documentation and error logs
- **Integration Help**: Refer to external API README and partner resources
- **AI Features**: Works with mock responses if OpenAI key not configured
- **Deployment Issues**: Check environment variables and build logs

### Quick Troubleshooting
- **APIs not starting**: Check Python dependencies and virtual environment
- **CORS issues**: Verify ALLOWED_ORIGINS environment variable
- **AI not working**: AI assistance works with mock responses by default
- **External API 401 errors**: Check API key format and scope permissions
- **Admin Dashboard**: Access at `/admin` - features sidebar navigation with comprehensive enterprise tools
- **Notification Bell**: Shows unread count in admin sidebar for real-time system alerts

## 🎯 Enterprise Admin Features Summary

### **Real-Time Monitoring**
- **6-Panel Overview**: Users, Deeds, Revenue, API Calls, System Health, and Active Integrations
- **Live Notification Center**: Bell icon with unread counters and actionable alerts
- **Performance Benchmarks**: Visual trend analysis showing API response times and call volumes
- **System Health Tracking**: 99.9% uptime monitoring with service status indicators

### **Comprehensive User Management**
- **Role-Based Filtering**: Admin, Viewer, User role management with permission controls
- **API Usage Tracking**: Monitor API calls per user with monthly usage statistics
- **Company Profiles**: Enhanced user data with company information and business roles
- **Integration Monitoring**: Track SoftPro and Qualia usage per user account

### **Advanced Analytics & Reporting**
- **Audit Trail**: Complete action logging with IP addresses, timestamps, and user agents
- **Export Capabilities**: CSV/PDF generation for users, deeds, audit logs, and system metrics
- **Revenue Analytics**: Subscription breakdowns with Enterprise API, Professional, and Starter plans
- **Performance Trends**: Visual charts showing growth patterns and system optimization opportunities

### **Enterprise Operations**
- **Backup & Recovery**: One-click manual backups with scheduled restore points and history tracking
- **Feedback Integration**: Built-in forms for admin issue reporting and feature request submission
- **Emergency Support**: 24/7 contact information and direct support channel access
- **System Actions**: Maintenance mode, service restart, log viewing, and emergency stop controls

### **Security & Compliance**
- **Comprehensive Audit Logs**: Track all admin actions with search, filter, and export capabilities
- **IP Address Tracking**: Monitor access patterns and security with unique location tracking
- **Success Rate Analytics**: Monitor system reliability with action success rate calculations
- **Role-Based Access**: Granular permission management for different admin access levels