# Google Places Autocomplete Setup

## 1. Add Google Maps Script to Layout

### Option A: Script tag in `app/layout.tsx`

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Option B: Next.js Script component (recommended)

```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  )
}
```

### Option C: Only load on builder pages

```tsx
// app/create-deed/[type]/page.tsx
import Script from 'next/script'
import { DeedBuilder } from '@/features/builder/DeedBuilder'

export default function CreateDeedPage({ params }: { params: { type: string } }) {
  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="beforeInteractive"
      />
      <DeedBuilder deedType={params.type} />
    </>
  )
}
```

---

## 2. Environment Variable

Add to `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 3. TypeScript Types

Add Google Maps types:

```bash
npm install --save-dev @types/google.maps
```

Or add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["google.maps"]
  }
}
```

---

## 4. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Places API**
4. Enable **Maps JavaScript API**
5. Create an API key with restrictions:
   - HTTP referrers: `localhost:*`, `yourdomain.com/*`
   - API restrictions: Places API, Maps JavaScript API

---

## 5. Alternative: useLoadScript Hook (from @react-google-maps/api)

If you prefer a hook-based approach:

```bash
npm install @react-google-maps/api
```

```tsx
// hooks/useGoogleMaps.ts
import { useLoadScript } from '@react-google-maps/api'

const libraries: ("places")[] = ["places"]

export function useGoogleMaps() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  })

  return { isLoaded, loadError }
}
```

Then wrap PropertySection:

```tsx
// In InputPanel.tsx or PropertySection.tsx
import { useGoogleMaps } from '@/hooks/useGoogleMaps'

export function PropertySection(props) {
  const { isLoaded } = useGoogleMaps()
  
  if (!isLoaded) {
    return <div>Loading maps...</div>
  }
  
  return <PropertySectionContent {...props} />
}
```
