'use client';

export default function Features() {
  const aiFeatures = [
    {
      title: "AI-Enhanced Deed Wizard",
      description: "Interactive card selection with smart tooltips and real-time AI assistance for perfect document formatting.",
      icon: "🤖",
      badge: "AI Powered"
    },
    {
      title: "Smart Field Assistance",
      description: "Context-aware AI suggestions for property addresses, legal descriptions, and complex legal formatting.",
      icon: "✨",
      badge: "New"
    },
    {
      title: "iPhone-Style Interface",
      description: "Large, bubbly, touch-friendly design that makes complex legal processes feel effortless.",
      icon: "📱",
      badge: "UX"
    }
  ];

  const apiFeatures = [
    {
      title: "Enterprise REST API",
      description: "Complete RESTful API with 50+ endpoints for seamless integration into your existing workflow.",
      icon: "🔗",
      badge: "API"
    },
    {
      title: "SoftPro 360 Integration",
      description: "Direct webhook integration with SoftPro Process Automation for automatic deed generation.",
      icon: "⚙️",
      badge: "Integration"
    },
    {
      title: "Qualia GraphQL Sync",
      description: "Bidirectional order import/export with Qualia's GraphQL API for complete workflow automation.",
      icon: "🔄",
      badge: "GraphQL"
    }
  ];

  const enterpriseFeatures = [
    {
      title: "Admin Dashboard",
      description: "Comprehensive analytics, user management, revenue tracking, and system health monitoring.",
      icon: "📊",
      badge: "Admin"
    },
    {
      title: "Client-Level Security",
      description: "API key authentication with scope-based permissions and comprehensive audit logging.",
      icon: "🔒",
      badge: "Security"
    },
    {
      title: "99.9% Uptime SLA",
      description: "Enterprise-grade reliability with dual API architecture and background processing.",
      icon: "⚡",
      badge: "Enterprise"
    }
  ];

  const FeatureCard = ({ feature, gradient }: { 
    feature: { title: string; description: string; icon: string; badge: string }, 
    gradient: string 
  }) => (
    <div className={`relative p-6 rounded-2xl border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${gradient}`}>
      <div className="absolute top-4 right-4">
        <span className="bg-white/90 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold">
          {feature.badge}
        </span>
      </div>
      <div className="text-4xl mb-4">{feature.icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
    </div>
  );

  return (
    <div className="bg-gray-50">
      {/* AI Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🤖 AI-Powered Innovation
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Intelligent Deed Creation
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg">
              Experience the future of legal document creation with our AI-enhanced wizard that guides, 
              suggests, and perfects your deeds in real-time.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {aiFeatures.map((feature, index) => (
              <FeatureCard 
                key={index} 
                feature={feature} 
                gradient="from-green-50 to-blue-50 border-green-200"
              />
            ))}
          </div>
        </div>
      </section>

      {/* API Features Section */}
      <section id="api" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🔗 Enterprise API Platform
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Seamless Integrations
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg">
              Connect DeedPro to your existing workflow with our comprehensive API. 
              Built for SoftPro, Qualia, and custom enterprise integrations.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {apiFeatures.map((feature, index) => (
              <FeatureCard 
                key={index} 
                feature={feature} 
                gradient="from-blue-50 to-purple-50 border-blue-200"
              />
            ))}
          </div>

          {/* API Code Example */}
          <div className="bg-gray-900 rounded-2xl p-8 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">API Example: Generate Deed</h3>
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">Live API</span>
            </div>
            <pre className="text-green-400 text-sm overflow-x-auto">
{`POST /api/v1/softpro/webhook
Headers: {
  "X-API-Key": "your_api_key",
  "Content-Type": "application/json"
}

{
  "order_id": "SP12345",
  "property_address": "123 Main St, Los Angeles, CA",
  "buyer_name": "John Doe",
  "seller_name": "Jane Smith", 
  "deed_type": "Grant Deed"
}

Response: {
  "status": "success",
  "deed_id": "sp_12345_20240123",
  "deed_pdf_url": "https://api.deedpro.io/deeds/generated.pdf",
  "message": "Deed generated successfully"
}`}
            </pre>
            <div className="mt-6 flex gap-4">
              <a href="/docs" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors">
                View API Docs
              </a>
              <a href="#" className="border border-gray-600 hover:border-gray-400 px-4 py-2 rounded-lg font-semibold transition-colors">
                Get API Key
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🏢 Enterprise Ready
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Built for Scale
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg">
              From individual escrow officers to enterprise title companies, 
              DeedPro scales with your business needs and security requirements.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {enterpriseFeatures.map((feature, index) => (
              <FeatureCard 
                key={index} 
                feature={feature} 
                gradient="from-purple-50 to-pink-50 border-purple-200"
              />
            ))}
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600">API Endpoints</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-green-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-purple-600 mb-2">1,200+</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600">API Support</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 