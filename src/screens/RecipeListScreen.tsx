import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import type { RecipeCategory } from '../types/recipe';
import { useFavoritesContext } from '../storage/FavoritesContext';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, TOUCH_MIN } from '../theme/tokens';
import { Chip, Columna, Fila, Tarjeta, Txt } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeList'>;

/** Filtros por categoría, más "favoritas" que es transversal. */
const CATEGORIAS: { id: RecipeCategory | 'favoritas' | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todo' },
  { id: 'favoritas', label: '♥ Favoritas' },
  { id: 'plato-principal', label: 'Principales' },
  { id: 'entrada', label: 'Entradas' },
  { id: 'postre', label: 'Postres' },
  { id: 'panificados', label: 'Panificados' },
  { id: 'bebidas', label: 'Bebidas' },
];

export function RecipeListScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite, favoriteIds } = useFavoritesContext();
  const [filtro, setFiltro] = useState<(typeof CATEGORIAS)[number]['id']>('todas');

  const visibles = useMemo(() => {
    if (filtro === 'todas') return recipes;
    if (filtro === 'favoritas') return recipes.filter((r) => favoriteIds.includes(r.id));
    return recipes.filter((r) => r.category === filtro);
  }, [filtro, favoriteIds]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.fondo }}>
      <FlatList
        data={visibles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.xxl,
          paddingHorizontal: space.lg,
          gap: space.md,
        }}
        ListHeaderComponent={
          <Columna gap={space.lg} style={{ marginBottom: space.sm }}>
            <Fila justify="space-between" align="flex-start">
              <Columna gap={2}>
                <Txt variant="display">Chefcito</Txt>
                <Txt variant="chico" color={theme.color.textoSuave}>
                  {recipes.length} recetas para cocinar sin perderte
                </Txt>
              </Columna>
              <Pressable
                onPress={() => navigation.navigate('Diagnostics')}
                hitSlop={12}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.full,
                  backgroundColor: theme.color.superficieHundida,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt variant="cuerpo">🩺</Txt>
              </Pressable>
            </Fila>

            {/* Filtros: scroll horizontal para no comerse la pantalla. */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORIAS}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}
              renderItem={({ item }) => {
                const activo = filtro === item.id;
                return (
                  <Pressable
                    onPress={() => setFiltro(item.id)}
                    style={{
                      paddingHorizontal: space.lg,
                      height: 40,
                      justifyContent: 'center',
                      borderRadius: radius.full,
                      backgroundColor: activo
                        ? theme.color.acento
                        : theme.color.superficieHundida,
                    }}
                  >
                    <Txt
                      variant="chicoFuerte"
                      color={activo ? theme.color.textoSobreAcento : theme.color.textoSuave}
                    >
                      {item.label}
                    </Txt>
                  </Pressable>
                );
              }}
            />
          </Columna>
        }
        ListEmptyComponent={
          <Columna gap={space.sm} style={{ marginTop: space.xxxl, alignItems: 'center' }}>
            <Txt variant="subtitulo" align="center">
              Todavía no hay nada acá
            </Txt>
            <Txt variant="chico" color={theme.color.textoSuave} align="center">
              {filtro === 'favoritas'
                ? 'Tocá el corazón en una receta para guardarla.'
                : 'Probá con otro filtro.'}
            </Txt>
          </Columna>
        }
        renderItem={({ item }) => {
          const favorita = isFavorite(item.id);
          return (
            <Tarjeta onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}>
              <Fila gap={space.lg} align="flex-start">
                {/* El emoji hace de imagen: sin fotos, es lo que da identidad
                    a cada receta de un vistazo. */}
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: radius.md,
                    backgroundColor: theme.color.acentoTenue,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt style={{ fontSize: 30, lineHeight: 36 }}>{item.imageEmoji}</Txt>
                </View>

                <Columna gap={space.xs} style={{ flex: 1 }}>
                  <Txt variant="subtitulo" numberOfLines={1}>
                    {item.title}
                  </Txt>
                  <Txt variant="chico" color={theme.color.textoSuave} numberOfLines={2}>
                    {item.description}
                  </Txt>
                  <Fila gap={space.sm} style={{ marginTop: space.xs }}>
                    <Chip>{item.totalTimeMinutes} min</Chip>
                    <Chip>
                      {item.servings} {item.servings === 1 ? 'porción' : 'porciones'}
                    </Chip>
                  </Fila>
                </Columna>

                <Pressable
                  onPress={() => toggleFavorite(item.id)}
                  hitSlop={14}
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt style={{ fontSize: 20, lineHeight: 24 }}>{favorita ? '♥' : '♡'}</Txt>
                </Pressable>
              </Fila>
            </Tarjeta>
          );
        }}
      />
    </View>
  );
}
