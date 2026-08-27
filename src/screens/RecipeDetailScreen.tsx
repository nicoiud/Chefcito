import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { useFavoritesContext } from '../storage/FavoritesContext';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const { isFavorite, toggleFavorite } = useFavoritesContext();

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>No se encontró la receta.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>{recipe.imageEmoji}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.meta}>
            {recipe.totalTimeMinutes} min · {recipe.servings} porciones
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => toggleFavorite(recipe.id)}>
          <Text style={styles.favoriteIcon}>{isFavorite(recipe.id) ? '❤️' : '🤍'}</Text>
        </Pressable>
      </View>

      <Text style={styles.description}>{recipe.description}</Text>

      <Pressable
        style={styles.cookButton}
        onPress={() => navigation.navigate('CookMode', { recipeId: recipe.id })}
      >
        <Text style={styles.cookButtonText}>👩‍🍳 Empezar a cocinar</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Ingredientes</Text>
      {recipe.ingredients.map((ingredient) => (
        <View key={ingredient.id} style={styles.ingredientRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.ingredientText}>
            {ingredient.name}
            {ingredient.quantity ? ` — ${ingredient.quantity}` : ''}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Pasos</Text>
      {recipe.steps.map((step) => (
        <View key={step.id} style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{step.order}</Text>
          </View>
          <Text style={styles.stepText}>{step.instruction}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#212121',
  },
  meta: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 2,
  },
  favoriteIcon: {
    fontSize: 26,
  },
  description: {
    fontSize: 14,
    color: '#616161',
    marginTop: 12,
    lineHeight: 20,
  },
  cookButton: {
    marginTop: 20,
    backgroundColor: '#FB8C00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginTop: 24,
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    marginRight: 8,
    color: '#FB8C00',
    fontWeight: '700',
  },
  ingredientText: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE0B2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
  },
  stepText: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
    lineHeight: 20,
  },
});
