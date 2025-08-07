# 🌐 Frontend Architecture Guide

## 🎯 Overview

Complete guide to the DeedPro frontend architecture built with Next.js 13+ App Router, TypeScript, and Tailwind CSS.

**Technology Stack:**
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks and context
- **Authentication**: JWT tokens with secure storage
- **API Integration**: RESTful API calls to FastAPI backend

---

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── app/                           # Next.js 13 App Router
│   │   ├── page.tsx                  # Homepage (landing page)
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Global styles
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   ├── register/
│   │   │   └── page.tsx              # User registration
│   │   ├── dashboard/
│   │   │   └── page.tsx              # User dashboard
│   │   ├── create-deed/
│   │   │   └── page.tsx              # Deed creation wizard
│   │   ├── past-deeds/
│   │   │   └── page.tsx              # Deed history
│   │   ├── shared-deeds/
│   │   │   └── page.tsx              # Collaboration features
│   │   ├── account-settings/
│   │   │   └── page.tsx              # User settings & billing
│   │   └── admin/
│   │       └── page.tsx              # Admin dashboard
│   ├── components/                    # Reusable React components
│   │   ├── Navbar.tsx                # Navigation header
│   │   ├── Sidebar.tsx               # Dashboard sidebar
│   │   ├── AdminSidebar.tsx          # Admin navigation
│   │   ├── Hero.tsx                  # Landing page hero
│   │   ├── Features.tsx              # Feature showcase
│   │   ├── Pricing.tsx               # Dynamic pricing display
│   │   ├── Footer.tsx                # Site footer
│   │   └── Particles.tsx             # Background animation
│   └── styles/
│       └── dashboard.css             # Dashboard-specific styles
├── package.json                      # Dependencies and scripts
├── next.config.js                    # Next.js configuration
├── tailwind.config.js               # Tailwind CSS configuration
└── tsconfig.json                     # TypeScript configuration
```

---

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--charcoal-blue: #2C3E50
--slate-navy: #34495E
--soft-charcoal: #4A5568

/* Accent Colors */
--tropical-teal: #1ABC9C
--electric-indigo: #6C5CE7
--sunset-orange: #E17055

/* Status Colors */
--success: #27AE60
--warning: #F39C12
--error: #E74C3C
--info: #3498DB

/* Neutral Colors */
--surface: #FFFFFF
--text-primary: #2D3748
--text-secondary: #718096
--border: #E2E8F0
```

### Typography
```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif

/* Font Weights */
--font-light: 300
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700

/* Font Sizes */
--text-xs: 0.75rem
--text-sm: 0.875rem
--text-base: 1rem
--text-lg: 1.125rem
--text-xl: 1.25rem
--text-2xl: 1.5rem
--text-3xl: 1.875rem
--text-4xl: 2.25rem
```

### Spacing
```css
/* Consistent spacing scale */
--space-1: 0.25rem
--space-2: 0.5rem
--space-3: 0.75rem
--space-4: 1rem
--space-5: 1.25rem
--space-6: 1.5rem
--space-8: 2rem
--space-10: 2.5rem
--space-12: 3rem
--space-16: 4rem
--space-20: 5rem
```

---

## 🏗️ Component Architecture

### Page Components

#### Homepage (`page.tsx`)
```typescript
interface PricingPlan {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export default function Home() {
  const [pricing, setPricing] = useState<PricingPlan[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetches dynamic pricing from backend
  useEffect(() => {
    fetchPricing();
  }, []);

  return (
    <div className="min-h-screen bg-charcoal-blue">
      <Particles />
      <main className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <Pricing pricing={pricing} />
        <Footer />
      </main>
    </div>
  );
}
```

#### Dashboard (`dashboard/page.tsx`)
```typescript
export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {/* Dashboard content with stats grid */}
        <div className="stats-grid">
          <StatCard icon="document" value="12" label="Total Deeds" />
          <StatCard icon="clock" value="3" label="In Progress" />
          <StatCard icon="check" value="8" label="Completed" />
          <StatCard icon="pending" value="1" label="Pending Review" />
        </div>
      </div>
    </div>
  );
}
```

#### Create Deed Wizard (`create-deed/page.tsx`)
```typescript
export default function CreateDeed() {
  const [currentStep, setCurrentStep] = useState(1);
  const [deedData, setDeedData] = useState({});
  const [hasWidgetAccess, setHasWidgetAccess] = useState(false);

  // Check user's widget access on load
  useEffect(() => {
    checkWidgetAccess();
  }, []);

  const steps = [
    { id: 1, title: 'Deed Type', component: DeedTypeStep },
    { id: 2, title: 'Property Info', component: PropertyStep },
    { id: 3, title: 'Parties', component: PartiesStep },
    { id: 4, title: 'Review', component: ReviewStep }
  ];

  return (
    <div className="deed-wizard">
      <StepIndicator currentStep={currentStep} steps={steps} />
      <StepContent step={currentStep} data={deedData} />
      <NavigationButtons onNext={handleNext} onPrev={handlePrev} />
    </div>
  );
}
```

#### Admin Dashboard (`admin/page.tsx`)
```typescript
interface AdminMetrics {
  users: UserMetrics;
  deeds: DeedMetrics;
  revenue: RevenueMetrics;
  system: SystemMetrics;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'deeds', label: 'Deeds', icon: 'document' },
    { id: 'pricing', label: 'Pricing', icon: 'dollar' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' }
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="admin-main">
        {activeTab === 'overview' && <OverviewTab metrics={metrics} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'deeds' && <DeedsTab />}
        {activeTab === 'pricing' && <PricingTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>
    </div>
  );
}
```

### Reusable Components

#### Sidebar (`components/Sidebar.tsx`)
```typescript
interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

export default function Sidebar() {
  const menuItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/dashboard' },
    { id: 'create', label: 'Create Deed', icon: 'plus', href: '/create-deed' },
    { id: 'past', label: 'Past Deeds', icon: 'document', href: '/past-deeds' },
    { id: 'shared', label: 'Shared Deeds', icon: 'share', href: '/shared-deeds', badge: 2 },
    { id: 'settings', label: 'Settings', icon: 'settings', href: '/account-settings' }
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>DeedPro</h2>
      </div>
      <ul className="sidebar-menu">
        {menuItems.map(item => (
          <SidebarMenuItem key={item.id} item={item} />
        ))}
      </ul>
    </nav>
  );
}
```

#### Dynamic Pricing (`components/Pricing.tsx`)
```typescript
interface PricingProps {
  pricing: PricingPlan[];
}

export default function Pricing({ pricing }: PricingProps) {
  if (!pricing.length) {
    return <PricingFallback />;
  }

  return (
    <section id="pricing" className="pricing-section">
      <div className="pricing-header">
        <h2>Choose Your Plan</h2>
        <p>Flexible pricing for every need</p>
      </div>
      <div className="pricing-grid">
        {pricing.map(plan => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </section>
  );
}
```

---

## 🔐 Authentication System

### JWT Token Management
```typescript
// Token storage and retrieval
const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
  // Set default Authorization header for API calls
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

const removeAuthToken = () => {
  localStorage.removeItem('authToken');
  delete axios.defaults.headers.common['Authorization'];
};

// Check if user is authenticated
const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};
```

### Protected Routes
```typescript
// Higher-order component for protected routes
const withAuth = (WrappedComponent: ComponentType) => {
  return function AuthenticatedComponent(props: any) {
    const router = useRouter();

    useEffect(() => {
      if (!isAuthenticated()) {
        router.push('/login');
      }
    }, [router]);

    if (!isAuthenticated()) {
      return <LoadingSpinner />;
    }

    return <WrappedComponent {...props} />;
  };
};

// Usage
export default withAuth(Dashboard);
```

---

## 🌐 API Integration

### API Client Setup
```typescript
// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API Service Functions
```typescript
// User API services
export const userAPI = {
  register: (userData: UserRegister) =>
    apiClient.post('/users/register', userData),
    
  login: (credentials: LoginCredentials) =>
    apiClient.post('/users/login', credentials),
    
  getProfile: () =>
    apiClient.get('/users/profile'),
    
  updateProfile: (updates: UserUpdate) =>
    apiClient.put('/users/profile', updates),
    
  upgradePlan: (plan: string) =>
    apiClient.post('/users/upgrade', { plan })
};

// Deed API services
export const deedAPI = {
  create: (deedData: DeedCreate) =>
    apiClient.post('/deeds', deedData),
    
  list: (filters?: DeedFilters) =>
    apiClient.get('/deeds', { params: filters }),
    
  get: (id: number) =>
    apiClient.get(`/deeds/${id}`),
    
  update: (id: number, updates: DeedUpdate) =>
    apiClient.put(`/deeds/${id}`, updates),
    
  delete: (id: number) =>
    apiClient.delete(`/deeds/${id}`),
    
  download: (id: number) =>
    apiClient.get(`/deeds/${id}/download`)
};

// Pricing API services
export const pricingAPI = {
  getPlans: () =>
    apiClient.get('/pricing'),
    
  createPlan: (planData: PlanCreate) =>
    apiClient.post('/admin/create-plan', planData),
    
  syncFromStripe: () =>
    apiClient.post('/admin/sync-pricing')
};
```

---

## 🎨 Styling System

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'charcoal-blue': '#2C3E50',
        'slate-navy': '#34495E',
        'soft-charcoal': '#4A5568',
        'tropical-teal': '#1ABC9C',
        'electric-indigo': '#6C5CE7',
        'sunset-orange': '#E17055',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      boxShadow: {
        'glow-teal': '0 0 20px rgba(26, 188, 156, 0.3)',
        'glow-indigo': '0 0 20px rgba(108, 92, 231, 0.3)',
      }
    },
  },
  plugins: [],
};
```

### Custom CSS Classes
```css
/* Dashboard-specific styles */
.main-content {
  @apply flex-1 p-8 bg-gray-50 min-h-screen transition-all duration-300;
}

.main-content.expanded {
  @apply ml-16;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8;
}

.stat-card {
  @apply bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow;
}

.stat-card.progress {
  @apply border-l-4 border-yellow-500;
}

.stat-card.completed {
  @apply border-l-4 border-green-500;
}

.stat-card.pending {
  @apply border-l-4 border-blue-500;
}

/* Animation classes */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes pulseGlow {
  0%, 100% { 
    box-shadow: 0 0 20px rgba(26, 188, 156, 0.3); 
  }
  50% { 
    box-shadow: 0 0 30px rgba(26, 188, 156, 0.5); 
  }
}
```

---

## 📱 Responsive Design

### Breakpoint System
```css
/* Mobile First Approach */
/* sm: 640px and up */
/* md: 768px and up */
/* lg: 1024px and up */
/* xl: 1280px and up */
/* 2xl: 1536px and up */

.responsive-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}

.responsive-text {
  @apply text-sm sm:text-base lg:text-lg;
}

.responsive-padding {
  @apply p-4 sm:p-6 lg:p-8;
}
```

### Mobile Navigation
```typescript
const MobileNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="mobile-nav lg:hidden">
      <button onClick={() => setIsOpen(!isOpen)}>
        <HamburgerIcon />
      </button>
      {isOpen && (
        <div className="mobile-menu">
          <NavItems />
        </div>
      )}
    </nav>
  );
};
```

---

## 🔄 State Management

### React Hooks Pattern
```typescript
// Custom hook for API data fetching
const useApiData = <T>(endpoint: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(endpoint);
        setData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return { data, loading, error };
};

// Usage
const UserProfile = () => {
  const { data: user, loading, error } = useApiData<User>('/users/profile');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return <NotFound />;

  return <ProfileDisplay user={user} />;
};
```

### Form State Management
```typescript
const useForm = <T extends Record<string, any>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const setValue = (name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const setError = (name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return { values, errors, setValue, setError, reset };
};
```

---

## 🚀 Performance Optimization

### Code Splitting
```typescript
// Dynamic imports for large components
const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const ChartComponent = dynamic(() => import('./Chart'), {
  loading: () => <ChartSkeleton />
});
```

### Image Optimization
```typescript
import Image from 'next/image';

const OptimizedImage = ({ src, alt, ...props }) => (
  <Image
    src={src}
    alt={alt}
    width={400}
    height={300}
    priority={false}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,..."
    {...props}
  />
);
```

### Memoization
```typescript
const MemoizedComponent = memo(({ data, onUpdate }) => {
  const processedData = useMemo(() => {
    return expensiveDataProcessing(data);
  }, [data]);

  const handleClick = useCallback((id: string) => {
    onUpdate(id);
  }, [onUpdate]);

  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onClick={handleClick} />
      ))}
    </div>
  );
});
```

---

## 🧪 Testing Strategy

### Component Testing
```typescript
// Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should submit form with valid credentials', async () => {
    const mockOnSubmit = jest.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});
```

---

## 🔧 Build Configuration

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['deedpro-main-api.onrender.com'],
    formats: ['image/webp', 'image/avif'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async redirects() {
    return [
      {
        source: '/old-dashboard',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 📞 Development Guidelines

### Code Style
- Use TypeScript for all new components
- Follow React Hooks patterns
- Implement proper error boundaries
- Use semantic HTML elements
- Follow accessibility best practices

### Component Guidelines
- Keep components small and focused
- Use composition over inheritance
- Implement proper prop validation
- Document complex logic with comments
- Follow consistent naming conventions

### Performance Guidelines
- Implement lazy loading for large components
- Use React.memo for expensive renders
- Optimize images with Next.js Image component
- Minimize bundle size with tree shaking
- Use proper caching strategies

---

**Last Updated:** January 2025  
**Frontend Version:** Next.js 13+ App Router
