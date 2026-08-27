import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { RecipeListScreen } from '../screens/RecipeListScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { CookModeScreen } from '../screens/CookModeScreen';

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
