import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { cartApi } from '../api'
import { useAuth } from './AuthContext'

interface CartContextType {
  itemCount: number
  refreshCartCount: () => Promise<void>
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const [itemCount, setItemCount] = useState(0)

  const refreshCartCount = useCallback(async () => {
    if (!isAuthenticated) {
      setItemCount(0)
      return
    }
    try {
      const { data } = await cartApi.get()
      const items = Array.isArray((data as { items?: unknown }).items)
        ? ((data as { items: Array<{ quantity?: number }> }).items ?? [])
        : []
      const count = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
      setItemCount(count)
    } catch {
      setItemCount(0)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isLoading) return
    refreshCartCount()
  }, [isLoading, refreshCartCount])

  return (
    <CartContext.Provider value={{ itemCount, refreshCartCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
