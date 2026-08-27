import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { RecipeListScreen } from '../screens/RecipeListScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { CookModeScreen } from '../screens/CookModeScreen';
import { IngredientCheckScreen } from '../screens/IngredientCheckScreen';
import { VoiceAssistantScreen } from '../screens/VoiceAssistantScreen';
import { ArGuideScreen } from '../screens/ArGuideScreen';
import { featureFlags } from '../config/featureFlags';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTintColor: '#FB8C00' }}>
        <Stack.Screen
          name="RecipeList"
          component={RecipeListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RecipeDetail"
          component={RecipeDetailScreen}
          options={{ title: 'Receta' }}
        />
        <Stack.Screen
          name="CookMode"
          component={CookModeScreen}
          options={{ title: 'Modo cocinar', headerBackTitle: 'Salir' }}
        />
        {featureFlags.cameraIngredientDetection ? (
          <Stack.Screen
            name="IngredientCheck"
            component={IngredientCheckScreen}
            options={{ title: 'Verificar ingredientes' }}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
