'use client';

import { 
  CpuChipIcon, 
  SparklesIcon, 
  DevicePhoneMobileIcon,
  LinkIcon,
  CogIcon,
  ArrowPathIcon,
  ChartBarIcon,
  LockClosedIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

// interface FeatureConfig {
//   name: string;
//   description: string;
//   highlight?: string;
//   icon: React.ReactNode;
// }

/* const features: FeatureConfig[] = [
  {
    name: "AI Document Assistant",
    description: "Let the AI do the heavy lifting. Generate deed drafts, add riders, and auto-fill recorder-approved data in seconds.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-primary">
        <path d="M12 2C9.243 2 7 4.243 7 7v2H5c-1.654 0-3 1.346-3 3v7c0 1.654 1.346 3 3 3h14c1.654 0 3-1.346 3-3v-7c0-1.654-1.346-3-3-3h-2V7c0-2.757-2.243-5-5-5zm-3 7V7c0-1.654 1.346-3 3-3s3 1.346 3 3v2H9zm3 5c-.736 0-1.333-.597-1.333-1.333 0-.736.597-1.334 1.333-1.334s1.333.598 1.333 1.334c0 .736-.597 1.333-1.333 1.333zm0 3.333c-1.84 0-3.666-.857-3.666-2.111v-.556c0-.368.299-.667.666-.667H18a.667.667 0 01.667.667v.556c0 1.254-1.826 2.111-3.667 2.111h-3z" />
      </svg>
    )
  },
  {
    name: "Recorder-Ready PDFs",
    description: "Generate recorder-ready documents with one click. Avoid rejections with pre-validated deed templates reviewed by California real estate counsel.",
    highlight: "Recorder-approved output"
  },
  {
    name: "Smart Field Assistance",
    description: "Context-aware AI suggestions for property addresses, legal descriptions, and complex legal formatting.",
    icon: SparklesIcon,
    badge: "New",
    highlight: true
  },
  {
    name: "iPhone-Style Interface",
    description: "Large, bubbly, touch-friendly design that makes complex legal processes feel effortless.",
    icon: DevicePhoneMobileIcon,
    badge: "UX",
    highlight: false
  }
]; */

export default function Features() {
  const aiFeatures = [
    {
      title: "AI-Enhanced Deed Wizard",
      description: "Interactive card selection with smart tooltips and real-time AI assistance for perfect document formatting.",
      icon: CpuChipIcon,
      badge: "AI Powered",
      highlight: true
    },
    {
      title: "Smart Field Assistance",
      description: "Context-aware AI suggestions for property addresses, legal descriptions, and complex legal formatting.",
      icon: SparklesIcon,
      badge: "New",
      highlight: true
    },
    {
      title: "iPhone-Style Interface",
      description: "Large, bubbly, touch-friendly design that makes complex legal processes feel effortless.",
      icon: DevicePhoneMobileIcon,
      badge: "UX",
      highlight: false
    }
  ];

  const apiFeatures = [
    {
      title: "Enterprise REST API",
      description: "Complete RESTful API with 50+ endpoints for seamless integration into your existing workflow.",
      icon: LinkIcon,
      badge: "API",
      highlight: false
    },
    {
      title: "SoftPro 360 Integration",
      description: "Direct webhook integration with SoftPro Process Automation for automatic deed generation.",
      icon: CogIcon,
      badge: "Integration",
      highlight: false
    },
    {
      title: "Qualia GraphQL Sync",
      description: "Bidirectional order import/export with Qualia's GraphQL API for complete workflow automation.",
      icon: ArrowPathIcon,
      badge: "GraphQL",
      highlight: true
    }
  ];

  const enterpriseFeatures = [
    {
      title: "Admin Dashboard",
      description: "Comprehensive analytics, user management, revenue tracking, and system health monitoring.",
      icon: ChartBarIcon,
      badge: "Admin",
      highlight: false
    },
    {
      title: "Client-Level Security",
      description: "Bring your legal team&#39;s requirements into the flow without new engineering work. Use role-based permissions and audit-ready logging for every interaction.",
      icon: LockClosedIcon,
      badge: "Security",
      highlight: false
    },
    {
      title: "99.9% Uptime SLA",
      description: "Enterprise-grade reliability with dual API architecture and background processing.",
      icon: BoltIcon,
      badge: "Enterprise",
      highlight: true
    }
  ];

  const FeatureCard = ({ feature, borderColor }: { 
    feature: { title: string; description: string; icon: React.ComponentType<{className?: string}>; badge: string; highlight: boolean }, 
    borderColor: string,
    key?: number
  }) => (
    <div className={`relative p-6 rounded-2xl border-2 ${borderColor} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-surface`}>
      <div className="absolute top-4 right-4">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
          feature.highlight 
            ? 'bg-tertiary text-white border-tertiary' 
            : 'bg-background text-text-secondary border-silver'
        }`}>
          {feature.badge}
        </span>
      </div>
      <feature.icon className="h-12 w-12 text-text-secondary mb-4 icon" />
      <h3 className="text-xl font-bold text-text-primary mb-3">{feature.title}</h3>
      <p className="text-text-secondary leading-relaxed">{feature.description}</p>
    </div>
  );

  return (
    <div className="bg-background">
      {/* AI Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-tertiary text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center gap-2 w-fit mx-auto">
              <CpuChipIcon className="h-4 w-4" />
              AI-Powered Innovation
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
              Intelligent Deed Creation
            </h2>
            <p className="text-text-secondary max-w-3xl mx-auto text-lg">
              Experience the future of legal document creation with our AI-enhanced wizard that guides, 
              suggests, and perfects your deeds in real-time.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {aiFeatures.map((feature, index) => (
              <FeatureCard 
                key={index} 
                feature={feature} 
                borderColor="border-secondary/20 hover:border-tertiary"
              />
            ))}
          </div>
        </div>
      </section>

      {/* API Features Section */}
      <section id="api" className="py-20 px-6 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center gap-2 w-fit mx-auto">
              <LinkIcon className="h-4 w-4" />
              Enterprise API Platform
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
              Seamless Integrations
            </h2>
            <p className="text-text-secondary max-w-3xl mx-auto text-lg">
              Connect DeedPro to your existing workflow with our comprehensive API. 
              Built for SoftPro, Qualia, and custom enterprise integrations.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {apiFeatures.map((feature, index) => (
              <FeatureCard 
                key={index} 
                feature={feature} 
                borderColor="border-primary/20 hover:border-secondary"
              />
            ))}
          </div>

          {/* API Code Example */}
          <div className="bg-primary rounded-2xl p-8 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">API Example: Generate Deed</h3>
              <span className="bg-tertiary text-white px-3 py-1 rounded-full text-sm font-bold">Live API</span>
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
              <a href="/docs/API_REFERENCE" className="bg-tertiary hover:bg-secondary text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                View API Docs
              </a>
              <a href="/api-key-request" className="border border-silver hover:border-tertiary hover:text-tertiary px-4 py-2 rounded-lg font-semibold transition-colors">
                Get API Key
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center gap-2 w-fit mx-auto">
              <LockClosedIcon className="h-4 w-4" />
              Security & Enterprise
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
              Built for Scale
            </h2>
            <p className="text-text-secondary max-w-3xl mx-auto text-lg">
              From individual escrow officers to enterprise title companies, 
              DeedPro scales with your business needs and security requirements.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {enterpriseFeatures.map((feature, index) => (
              <FeatureCard 
                key={index} 
                feature={feature} 
                borderColor="border-secondary/20 hover:border-tertiary"
              />
            ))}
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-text-secondary">API Endpoints</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-tertiary mb-2">99.9%</div>
              <div className="text-text-secondary">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-secondary mb-2">1,200+</div>
              <div className="text-text-secondary">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-tertiary mb-2">24/7</div>
              <div className="text-text-secondary">API Support</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 