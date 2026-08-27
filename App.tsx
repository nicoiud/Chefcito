import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FavoritesProvider } from './src/storage/FavoritesContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <FavoritesProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </FavoritesProvider>
    </SafeAreaProvider>
  );
}
