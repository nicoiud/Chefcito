import { useCallback, useEffect, useState } from 'react';
import { loadFavoriteIds, saveFavoriteIds } from './favoritesStorage';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFavoriteIds().then((ids) => {
      setFavoriteIds(ids);
      setLoaded(true);
    });
  }, []);

  const toggleFavorite = useCallback((recipeId: string) => {
    setFavoriteIds((current) => {
      const next = current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId];
      saveFavoriteIds(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (recipeId: string) => favoriteIds.includes(recipeId),
    [favoriteIds]
  );

  return { favoriteIds, loaded, toggleFavorite, isFavorite };
}
