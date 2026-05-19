// lib/brandSizes.ts
// -- Brand size conversion utility -----------------------------------------
// Offset = how much to ADD to get from that brand to Nike baseline
// Nike is the baseline (offset 0)
// e.g. Adidas runs 0.5 large -> to get Nike equivalent, add 0.5

export const BRANDS = [
  { key: 'nike',       label: 'Nike',        offset: 0,    domain: 'nike.com' },
  { key: 'adidas',     label: 'Adidas',      offset: 0.5,  domain: 'adidas.com' },
  { key: 'newbalance', label: 'New Balance', offset: 0,    domain: 'newbalance.com' },
  { key: 'puma',       label: 'Puma',        offset: 0.5,  domain: 'puma.com' },
  { key: 'converse',   label: 'Converse',    offset: -1.5, domain: 'converse.com' },
] as const

export type BrandKey = (typeof BRANDS)[number]['key']
export type BrandSizes = Partial<Record<BrandKey, number>>

// Convert a known brand size -> Nike baseline
export function toNikeSize(size: number, fromBrand: BrandKey): number {
  const brand = BRANDS.find(b => b.key === fromBrand)
  if (!brand) return size
  return Math.round((size + brand.offset) * 2) / 2
}

// Convert Nike baseline -> target brand size
export function fromNikeSize(nikeSize: number, toBrand: BrandKey): number {
  const brand = BRANDS.find(b => b.key === toBrand)
  if (!brand) return nikeSize
  return Math.round((nikeSize - brand.offset) * 2) / 2
}

// Given a brand_sizes map, derive the Nike baseline
// Uses the first brand entry that has a size stored
export function deriveNikeBaseline(brandSizes: BrandSizes): number | null {
  for (const brand of BRANDS) {
    const size = brandSizes[brand.key]
    if (size != null) return toNikeSize(size, brand.key)
  }
  return null
}

// Build all brand conversions from a stored brand_sizes map
export function getAllConversions(brandSizes: BrandSizes): Record<BrandKey, number> | null {
  const baseline = deriveNikeBaseline(brandSizes)
  if (baseline == null) return null

  const result = {} as Record<BrandKey, number>
  for (const brand of BRANDS) {
    result[brand.key] = fromNikeSize(baseline, brand.key)
  }
  return result
}

// Detect which brand an external_url belongs to
export function detectBrand(url: string): BrandKey | null {
  if (!url) return null
  const lower = url.toLowerCase()
  for (const brand of BRANDS) {
    if (lower.includes(brand.domain)) return brand.key
  }
  return null
}

// Build a size-aware URL for a brand site
// Different brands use different URL patterns for size selection
export function buildSizeUrl(url: string, brandKey: BrandKey, size: number): string {
  if (!url) return url
  try {
    const u = new URL(url)
    switch (brandKey) {
      case 'nike':
        u.searchParams.set('size', String(size))
        break
      case 'adidas':
        u.searchParams.set('size', String(size))
        break
      case 'newbalance':
        u.searchParams.set('size', String(size))
        break
      case 'puma':
        u.searchParams.set('size', String(size))
        break
      case 'converse':
        u.searchParams.set('size', String(size))
        break
    }
    return u.toString()
  } catch {
    // If URL parsing fails, append as query string
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}size=${size}`
  }
}
