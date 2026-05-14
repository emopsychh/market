import { api } from './client'

export { api }

export interface SellerApplicationPayload {
  seller_type: 'individual' | 'self_employed' | 'ie' | 'llc'
  display_name: string
  full_name: string
  phone: string
  city: string
  country: string
  description: string
  terms_accepted: boolean
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),
  register: (data: { email: string; username: string; password: string; password_confirm: string; role?: string }) =>
    api.post('/auth/register/', data),
  me: () => api.get('/auth/me/'),
  updateMe: (data: { first_name?: string; last_name?: string; phone?: string; role?: string; bio?: string }) =>
    api.patch('/auth/me/', data),
  changePassword: (data: { current_password: string; new_password: string; new_password_confirm: string }) =>
    api.post('/auth/password-change/', data),
  sellerApplication: (data: SellerApplicationPayload) => api.post('/auth/seller-application/', data),
  getAddresses: () => api.get('/auth/addresses/'),
  addAddress: (data: { city: string; street: string; building: string; apartment?: string; postal_code?: string; is_default?: boolean }) =>
    api.post('/auth/addresses/', data),
  updateAddress: (
    id: number,
    data: { city?: string; street?: string; building?: string; apartment?: string; postal_code?: string; is_default?: boolean },
  ) => api.put(`/auth/addresses/${id}/`, data),
  removeAddress: (id: number) => api.delete(`/auth/addresses/${id}/`),
}

export const categoriesApi = {
  list: (params?: { parent?: number }) => api.get('/categories/', { params }),
  detail: (id: number) => api.get(`/categories/${id}/`),
}

export interface ProductCreatePayload {
  name: string
  description?: string
  price: string
  category: number
  sizes: string[]
  colors: string[]
  gender: 'male' | 'female' | 'unisex'
  brand: string
  status?: string
}

export const productsApi = {
  list: (params?: { category?: number; size?: string; color?: string; min_price?: string; max_price?: string; search?: string; brand?: string }) =>
    api.get('/products/', { params }),
  listMine: () => api.get('/products/mine/'),
  detail: (id: number) => api.get(`/products/${id}/`),
  create: (data: ProductCreatePayload) => api.post('/products/create/', data),
  update: (id: number, data: ProductCreatePayload) => api.put(`/products/${id}/manage/`, data),
  remove: (id: number) => api.delete(`/products/${id}/manage/`),
  addImage: (productId: number, file: File) => {
    const body = new FormData()
    body.append('image', file)
    return api.post(`/products/${productId}/images/`, body)
  },
}

export const cartApi = {
  get: () => api.get('/cart/'),
  addItem: (data: { product: number; size: string; color: string; quantity: number }) =>
    api.post('/cart/items/', data),
  updateItem: (id: number, quantity: number) =>
    api.put(`/cart/items/${id}/`, { quantity }),
  removeItem: (id: number) => api.delete(`/cart/items/${id}/`),
}

export interface WishlistItemResponse {
  id: number
  product: {
    id: number
  }
  created_at: string
}

export const wishlistApi = {
  list: () => api.get('/products/wishlist/'),
  add: (productId: number) => api.post('/products/wishlist/', { product: productId }),
  remove: (productId: number) => api.delete(`/products/wishlist/${productId}/`),
}

export const ordersApi = {
  list: () => api.get('/orders/'),
  detail: (id: number) => api.get(`/orders/${id}/`),
  create: (data: { address_id?: number } | { delivery_city: string; delivery_street: string; delivery_building: string; delivery_apartment?: string; delivery_postal_code?: string }) =>
    api.post('/orders/create/', data),
}
