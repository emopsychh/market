export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  // для Android-эмулятора, если backend на хост-машине
  'http://10.0.2.2:8000/api'

