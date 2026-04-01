import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { wishlistApi, type WishlistItemResponse } from '../api'
import { useAuth } from './AuthContext'

interface WishlistContextType {
  ids: number[]
  isInWishlist: (productId: number) => boolean
  toggle: (productId: number) => Promise<void>
  refresh: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const [ids, setIds] = useState<number[]>([])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setIds([])
      return
    }
    try {
      const { data } = await wishlistApi.list()
      const list = (Array.isArray(data) ? data : []) as WishlistItemResponse[]
      setIds(list.map((item) => item.product.id))
    } catch {
      setIds([])
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isLoading) return
    refresh()
  }, [isLoading, refresh])

  const isInWishlist = useCallback(
    (productId: number) => ids.includes(productId),
    [ids],
  )

  const toggle = useCallback(
    async (productId: number) => {
      if (!isAuthenticated) return
      const has = ids.includes(productId)
      if (has) {
        await wishlistApi.remove(productId)
        setIds((prev) => prev.filter((id) => id !== productId))
      } else {
        await wishlistApi.add(productId)
        setIds((prev) => (prev.includes(productId) ? prev : [productId, ...prev]))
      }
    },
    [ids, isAuthenticated],
  )

  const value = useMemo(
    () => ({ ids, isInWishlist, toggle, refresh }),
    [ids, isInWishlist, toggle, refresh],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
