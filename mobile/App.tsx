import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { API_URL } from './src/config'

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>/mobile</Text>
      <Text style={styles.muted}>API: {API_URL}</Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  muted: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
  },
})
