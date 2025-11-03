export function extractStreetAddress(addressComponents: any[]): string {
  const streetNumber = getComponent(addressComponents, "street_number")
  const route = getComponent(addressComponents, "route")
  return `${streetNumber} ${route}`.trim()
}

export function getComponent(addressComponents: any[], type: string): string {
  const component = addressComponents.find((c) => c.types.includes(type))
  return component?.long_name || ""
}

export function getCountyFallback(addressComponents: any[]): string {
  // Try administrative_area_level_2 first (county)
  let county = getComponent(addressComponents, "administrative_area_level_2")

  // If not found, try administrative_area_level_1 (state) as fallback
  if (!county) {
    county = getComponent(addressComponents, "administrative_area_level_1")
  }

  return county
}

export function formatAddress(components: {
  street: string
  city: string
  state: string
  zip: string
}): string {
  return `${components.street}, ${components.city}, ${components.state} ${components.zip}`
}
