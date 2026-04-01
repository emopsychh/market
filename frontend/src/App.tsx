import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { WishlistProvider } from './contexts/WishlistContext'
import { Layout } from './components/Layout/Layout'
import { HomePage } from './pages/HomePage'
import { ProductsPage } from './pages/ProductsPage'
import { CartPage } from './pages/CartPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductNewPage } from './pages/ProductNewPage'
import { ProductEditPage } from './pages/ProductEditPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/new" element={<ProductNewPage />} />
                <Route path="products/:id/edit" element={<ProductEditPage />} />
                <Route path="products/:id" element={<ProductDetailPage />} />
                <Route path="categories" element={<Navigate to="/" replace />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  )
}

export default App
