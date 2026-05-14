import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Выбор витрины по полу товара (не URL категории; дальше подключите фильтр к API/страницам). */
export type ShopGender = 'male' | 'female'

const STORAGE_KEY = 'ngm_shop_gender'

function readStored(): ShopGender | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'male' || v === 'female') return v
  return null
}

function persist(value: ShopGender | null) {
  if (typeof window === 'undefined') return
  if (value === null) localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, value)
}

interface ShopGenderContextValue {
  shopGender: ShopGender | null
  setShopGender: (value: ShopGender | null) => void
  selectMale: () => void
  selectFemale: () => void
}

const ShopGenderContext = createContext<ShopGenderContextValue | null>(null)

export function ShopGenderProvider({ children }: { children: ReactNode }) {
  const [shopGender, setShopGenderState] = useState<ShopGender | null>(() => readStored())

  const setShopGender = useCallback((value: ShopGender | null) => {
    setShopGenderState(value)
    persist(value)
  }, [])

  const selectMale = useCallback(() => {
    setShopGenderState('male')
    persist('male')
  }, [])

  const selectFemale = useCallback(() => {
    setShopGenderState('female')
    persist('female')
  }, [])

  const value = useMemo(
    () => ({
      shopGender,
      setShopGender,
      selectMale,
      selectFemale,
    }),
    [shopGender, setShopGender, selectMale, selectFemale],
  )

  return <ShopGenderContext.Provider value={value}>{children}</ShopGenderContext.Provider>
}

export function useShopGender(): ShopGenderContextValue {
  const ctx = useContext(ShopGenderContext)
  if (!ctx) throw new Error('useShopGender must be used within ShopGenderProvider')
  return ctx
}
