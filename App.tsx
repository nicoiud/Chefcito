import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FavoritesProvider } from './src/storage/FavoritesContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function Contenido() {
  const theme = useTheme();

  // Las fuentes se cargan antes de dibujar: si no, la primera pantalla
  // aparece con la tipografía del sistema y salta al cambiar.
  const [listo] = useFonts({
    'BricolageGrotesque-Bold': require('./assets/fonts/BricolageGrotesque-Bold.ttf'),
    'BricolageGrotesque-SemiBold': require('./assets/fonts/BricolageGrotesque-SemiBold.ttf'),
    'Outfit-Regular': require('./assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Medium': require('./assets/fonts/Outfit-Medium.ttf'),
    'Outfit-SemiBold': require('./assets/fonts/Outfit-SemiBold.ttf'),
    'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
  });

  if (!listo) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.color.fondo,
        }}
      >
        <ActivityIndicator color={theme.color.acento} />
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FavoritesProvider>
          <Contenido />
        </FavoritesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
