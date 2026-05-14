export interface BrandOption {
  slug: string
  name: string
  logo: string
  scale?: number
}

/** Логотипы в `public/brands/` — короткие имена файлов `{slug}.svg` */
export const BRAND_OPTIONS: BrandOption[] = [
  { slug: 'adidas', name: 'Adidas', logo: '/brands/adidas.svg' },
  { slug: 'armani', name: 'Armani', logo: '/brands/armani.svg' },
  { slug: 'asos', name: 'ASOS', logo: '/brands/asos.svg' },
  { slug: 'balenciaga', name: 'Balenciaga', logo: '/brands/balenciaga.svg' },
  { slug: 'burberry', name: 'Burberry', logo: '/brands/burberry.svg' },
  { slug: 'calvin-klein', name: 'Calvin Klein', logo: '/brands/calvin-klein.svg' },
  { slug: 'cartier', name: 'Cartier', logo: '/brands/cartier.svg' },
  { slug: 'chanel', name: 'Chanel', logo: '/brands/chanel.svg' },
  { slug: 'columbia', name: 'Columbia', logo: '/brands/columbia.svg' },
  { slug: 'converse', name: 'Converse', logo: '/brands/converse.svg' },
  { slug: 'crocs', name: 'Crocs', logo: '/brands/crocs.svg' },
  { slug: 'dior', name: 'Dior', logo: '/brands/dior.svg' },
  { slug: 'dolce-gabbana', name: 'Dolce & Gabbana', logo: '/brands/dolce-gabbana.svg' },
  { slug: 'fendi', name: 'Fendi', logo: '/brands/fendi.svg' },
  { slug: 'gucci', name: 'Gucci', logo: '/brands/gucci.svg' },
  { slug: 'hugo-boss', name: 'Hugo Boss', logo: '/brands/hugo-boss.svg' },
  { slug: 'kenzo', name: 'Kenzo', logo: '/brands/kenzo.svg' },
  { slug: 'louis-vuitton', name: 'Louis Vuitton', logo: '/brands/louis-vuitton.svg' },
  { slug: 'lvmh', name: 'LVMH', logo: '/brands/lvmh.svg' },
  { slug: 'lyle-scott', name: 'Lyle & Scott', logo: '/brands/lyle-scott.svg' },
  { slug: 'miu-miu', name: 'Miu Miu', logo: '/brands/miu-miu.svg' },
  { slug: 'new-balance', name: 'New Balance', logo: '/brands/new-balance.svg' },
  { slug: 'nike', name: 'Nike', logo: '/brands/nike.svg' },
  { slug: 'puma', name: 'Puma', logo: '/brands/puma.svg' },
  { slug: 'quiksilver', name: 'Quiksilver', logo: '/brands/quiksilver.svg' },
  { slug: 'ralph-lauren', name: 'Ralph Lauren', logo: '/brands/ralph-lauren.svg' },
  { slug: 'reebok', name: 'Reebok', logo: '/brands/reebok.svg' },
  { slug: 'under-armour', name: 'Under Armour', logo: '/brands/under-armour.svg' },
  { slug: 'valentino', name: 'Valentino', logo: '/brands/valentino.svg' },
]

export const BRAND_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  BRAND_OPTIONS.map((brand) => [brand.slug, brand.name]),
)
