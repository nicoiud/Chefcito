import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from './tokens';

/**
 * Tema activo, derivado del modo del sistema.
 *
 * Se sigue al sistema en vez de tener un interruptor propio: quien cocina de
 * noche ya puso el celular en oscuro, y una preferencia más para configurar
 * no aporta nada.
 */
const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
