import React, { createContext, useContext } from 'react';
import { useFavorites } from './useFavorites';

type FavoritesContextValue = ReturnType<typeof useFavorites>;

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const value = useFavorites();
  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavoritesContext(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext debe usarse dentro de un FavoritesProvider');
  }
  return context;
}
