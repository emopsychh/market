import { api } from './client'

export { api }

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  role: 'buyer' | 'seller' | 'admin'
  phone?: string
}

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login/', { email, password }),
  register: (data: { email: string; username: string; password: string; password_confirm: string; role?: string }) =>
    api.post('/auth/register/', data),
  me: () => api.get('/auth/me/'),
  updateMe: (data: { first_name?: string; last_name?: string; phone?: string; role?: string }) =>
    api.patch('/auth/me/', data),
  getAddresses: () => api.get('/auth/addresses/'),
  addAddress: (data: { city: string; street: string; building: string; apartment?: string; postal_code?: string; is_default?: boolean }) =>
    api.post('/auth/addresses/', data),
  updateAddress: (
    id: number,
    data: { city?: string; street?: string; building?: string; apartment?: string; postal_code?: string; is_default?: boolean },
  ) => api.put(`/auth/addresses/${id}/`, data),
  removeAddress: (id: number) => api.delete(`/auth/addresses/${id}/`),
}

export interface ProductListItem {
  id: number
  name: string
  price: string
  category: number
  category_name: string
  sizes: string[]
  colors: string[]
  gender?: 'male' | 'female' | 'unisex'
  first_image: string | null
  preview_images?: string[]
  images_count?: number
  status: string
}

export const productsApi = {
  list: (params?: { category?: number; size?: string; color?: string; min_price?: string; max_price?: string; search?: string }) =>
    api.get('/products/', { params }),
  detail: (id: number) => api.get(`/products/${id}/`),
  listMine: () => api.get('/products/mine/'),
  create: (data: {
    name: string
    description?: string
    price: string
    category: number
    sizes: string[]
    colors: string[]
    gender: 'male' | 'female' | 'unisex'
    status?: string
  }) => api.post('/products/create/', data),
  update: (id: number, data: {
    name: string
    description?: string
    price: string
    category: number
    sizes: string[]
    colors: string[]
    gender: 'male' | 'female' | 'unisex'
    status?: string
  }) => api.put(`/products/${id}/manage/`, data),
  remove: (id: number) => api.delete(`/products/${id}/manage/`),
}

export const cartApi = {
  get: () => api.get('/cart/'),
  addItem: (data: { product: number; size: string; color: string; quantity: number }) => api.post('/cart/items/', data),
  removeItem: (id: number) => api.delete(`/cart/items/${id}/`),
}

export const ordersApi = {
  list: () => api.get('/orders/'),
  create: (data: { address_id?: number } | { delivery_city: string; delivery_street: string; delivery_building: string; delivery_apartment?: string; delivery_postal_code?: string }) =>
    api.post('/orders/create/', data),
}

