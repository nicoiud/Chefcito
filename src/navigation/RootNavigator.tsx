import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { RecipeListScreen } from '../screens/RecipeListScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { CookModeScreen } from '../screens/CookModeScreen';
import { IngredientCheckScreen } from '../screens/IngredientCheckScreen';
import { VoiceAssistantScreen } from '../screens/VoiceAssistantScreen';
import { ArGuideScreen } from '../screens/ArGuideScreen';
import { DiagnosticsScreen } from '../screens/DiagnosticsScreen';
import { featureFlags } from '../config/featureFlags';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme : DefaultTheme).colors,
      primary: theme.color.acento,
      background: theme.color.fondo,
      card: theme.color.fondo,
      text: theme.color.texto,
      border: theme.color.borde,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: theme.color.acento,
          headerStyle: { backgroundColor: theme.color.fondo },
          headerTitleStyle: { fontFamily: fonts.displaySemi, fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.color.fondo },
        }}
      >
        <Stack.Screen
          name="RecipeList"
          component={RecipeListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RecipeDetail"
          component={RecipeDetailScreen}
          options={{ title: '', headerTransparent: true }}
        />
        <Stack.Screen
          name="CookMode"
          component={CookModeScreen}
          options={{ headerShown: false }}
        />
        {featureFlags.cameraIngredientDetection ? (
          <Stack.Screen
            name="IngredientCheck"
            component={IngredientCheckScreen}
            options={{ title: 'Verificar', headerTransparent: true, headerTintColor: '#fff' }}
          />
        ) : null}
        {featureFlags.voiceAssistant ? (
          <Stack.Screen
            name="VoiceAssistant"
            component={VoiceAssistantScreen}
            options={{ title: 'Asistente' }}
          />
        ) : null}
        {featureFlags.arGuidance ? (
          <Stack.Screen
            name="ArGuide"
            component={ArGuideScreen}
            options={{ title: 'Guía de mesada' }}
          />
        ) : null}
        <Stack.Screen
          name="Diagnostics"
          component={DiagnosticsScreen}
          options={{ title: 'Diagnóstico' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
