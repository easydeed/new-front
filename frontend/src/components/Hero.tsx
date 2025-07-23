'use client';

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex-1 text-center lg:text-left max-w-3xl lg:pr-12">
        <div className="mb-6">
          <span className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🚀 AI-Powered • Enterprise Ready
          </span>
        </div>
        
        <h1 className="text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent leading-tight mb-6">
          DeedPro
        </h1>
        
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 leading-tight mb-6">
          AI-Enhanced Real Estate Document Platform with Enterprise API
        </h2>
        
        <p className="text-gray-600 text-xl mb-4 leading-relaxed">
          Transform deed creation with AI assistance, seamless SoftPro & Qualia integrations, 
          and an enterprise API that connects your entire workflow.
        </p>
        
        <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">✨ AI Wizard</span>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">🔗 API Integrations</span>
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">🏢 Enterprise Ready</span>
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">📱 iPhone-Style UX</span>
        </div>
        
        <div className="flex gap-4 flex-wrap justify-center lg:justify-start mb-8">
          <a 
            href="/create-deed" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-semibold text-lg"
          >
            Try AI Wizard →
          </a>
          <a 
            href="#api" 
            className="bg-gray-100 text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-200 transition-all font-semibold text-lg border border-gray-200"
          >
            Explore API
          </a>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center lg:justify-start text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span>Trusted by 1,200+ escrow officers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500">🔗</span>
            <span>Integrates with SoftPro & Qualia</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-500">⚡</span>
            <span>99.9% API uptime</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 mt-12 lg:mt-0 max-w-2xl">
        <div className="relative">
          {/* Main Dashboard Screenshot Placeholder */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl overflow-hidden border">
            <div className="bg-gray-800 h-8 flex items-center justify-start px-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 text-center text-gray-400 text-xs">DeedPro AI Wizard</div>
            </div>
            <div className="p-8 h-96 flex flex-col items-center justify-center text-gray-500">
              <div className="text-6xl mb-4">🏠</div>
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">AI-Enhanced Deed Wizard</div>
                <div className="text-sm">Interactive cards • Smart tooltips • Real-time assistance</div>
              </div>
              <div className="mt-6 flex gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
          
          {/* Floating API badge */}
          <div className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-12 hover:rotate-0 transition-transform">
            <div className="text-xs font-bold">API READY</div>
            <div className="text-xs">RESTful + GraphQL</div>
          </div>
          
          {/* Integration badges */}
          <div className="absolute -bottom-6 -left-4 bg-white rounded-lg shadow-lg p-3 border">
            <div className="text-xs text-gray-600 mb-1">Integrates with:</div>
            <div className="flex gap-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">SoftPro 360</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Qualia</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 