import axios from 'axios'
import { API_URL } from '../config'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../storage/tokens'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refresh = await getRefreshToken()
    if (!refresh) return null
    try {
      const res = await axios.post(
        `${API_URL}/auth/refresh/`,
        { refresh },
        { timeout: 15000 },
      )
      const access = (res.data as { access?: string }).access
      if (typeof access !== 'string' || !access) return null
      await setTokens({ access, refresh })
      return access
    } catch {
      await clearTokens()
      return null
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error?.config
    const status = error?.response?.status
    if (!original || status !== 401 || original.__retry) {
      throw error
    }
    original.__retry = true
    const newAccess = await refreshAccessToken()
    if (!newAccess) throw error
    original.headers = original.headers ?? {}
    original.headers.Authorization = `Bearer ${newAccess}`
    return api.request(original)
  },
)

