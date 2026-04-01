export interface BrandOption {
  slug: string
  name: string
  logo: string
  scale?: number
}

export const BRAND_OPTIONS: BrandOption[] = [
  { slug: 'adidas', name: 'Adidas', logo: '/brands/adidas-4-logo-svg-vector.svg', scale: 1.2 },
  { slug: 'burberry', name: 'Burberry', logo: '/brands/burberry-1-logo-svg-vector.svg', scale: 2.35 },
  { slug: 'calvin-klein', name: 'Calvin Klein', logo: '/brands/calvin-klein-logo.svg', scale: 1.2 },
  { slug: 'gucci', name: 'Gucci', logo: '/brands/gucci-1-logo-svg-vector.svg', scale: 1.8 },
  { slug: 'louis-vuitton', name: 'Louis Vuitton', logo: '/brands/louis-vuitton-1-logo-svg-vector.svg', scale: 1.35 },
  { slug: 'new-balance', name: 'New Balance', logo: '/brands/new-balance-2-logo-svg-vector.svg', scale: 2.05 },
  { slug: 'vogue', name: 'Vogue', logo: '/brands/vogue-logo-svg-vector.svg', scale: 2.45 },
  { slug: 'zara', name: 'Zara', logo: '/brands/zara-logo-svg-vector.svg', scale: 1.1 },
]

export const BRAND_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  BRAND_OPTIONS.map((brand) => [brand.slug, brand.name]),
)
