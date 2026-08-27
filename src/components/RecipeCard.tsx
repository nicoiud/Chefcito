import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Recipe } from '../types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

export function RecipeCard({ recipe, isFavorite, onPress, onToggleFavorite }: RecipeCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.emoji}>{recipe.imageEmoji}</Text>
      <View style={styles.info}>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {recipe.description}
        </Text>
        <Text style={styles.meta}>
          {recipe.totalTimeMinutes} min · {recipe.servings} porciones
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
      >
        <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emoji: {
    fontSize: 36,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  description: {
    fontSize: 13,
    color: '#616161',
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  favoriteIcon: {
    fontSize: 22,
    marginLeft: 8,
  },
});
