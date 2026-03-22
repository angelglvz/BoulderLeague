import { Redirect } from 'expo-router'

// Redirige siempre a la pantalla de bienvenida
// En Fase 2.5 aquí irá la lógica de sesión activa
export default function Index() {
  return <Redirect href="/(auth)/welcome" />
}
