import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export async function getAccessToken(): Promise<string | null> {
  return (await SecureStore.getItemAsync(ACCESS_KEY)) || null
}

export async function getRefreshToken(): Promise<string | null> {
  return (await SecureStore.getItemAsync(REFRESH_KEY)) || null
}

export async function setTokens(tokens: { access: string; refresh: string }): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.access)
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh)
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}

