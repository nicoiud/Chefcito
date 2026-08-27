import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { RecipeCard } from '../components/RecipeCard';
import { useFavoritesContext } from '../storage/FavoritesContext';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeList'>;

export function RecipeListScreen({ navigation }: Props) {
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const visibleRecipes = useMemo(
    () => (showOnlyFavorites ? recipes.filter((r) => isFavorite(r.id)) : recipes),
    [showOnlyFavorites, isFavorite]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chefcito 🍳</Text>
        <Pressable
          style={[styles.filterButton, showOnlyFavorites && styles.filterButtonActive]}
          onPress={() => setShowOnlyFavorites((current) => !current)}
        >
          <Text
            style={[styles.filterButtonText, showOnlyFavorites && styles.filterButtonTextActive]}
          >
            {showOnlyFavorites ? '❤️ Favoritas' : '🤍 Todas'}
          </Text>
        </Pressable>
      </View>
      <FlatList
        data={visibleRecipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Todavía no tenés recetas favoritas.</Text>
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            isFavorite={isFavorite(item.id)}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#212121',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
  },
  filterButtonActive: {
    backgroundColor: '#FFCDD2',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#616161',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#C62828',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
    marginTop: 40,
    fontSize: 14,
  },
});
