import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { useFavoritesContext } from '../storage/FavoritesContext';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { Boton, Chip, Columna, Etiqueta, Fila, Separador, Txt } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export function RecipeDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { recipeId } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const { isFavorite, toggleFavorite } = useFavoritesContext();

  if (!recipe) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt>No se encontró la receta.</Txt>
      </View>
    );
  }

  const favorita = isFavorite(recipe.id);
  const conTimer = recipe.steps.filter((s) => s.timerSeconds).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.fondo }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: space.lg,
        }}
      >
        {/* Encabezado: el emoji grande hace de portada. */}
        <Columna gap={space.lg}>
          <Fila justify="space-between" align="flex-start">
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: radius.lg,
                backgroundColor: theme.color.acentoTenue,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt style={{ fontSize: 44, lineHeight: 52 }}>{recipe.imageEmoji}</Txt>
            </View>

            <Pressable
              onPress={() => toggleFavorite(recipe.id)}
              hitSlop={14}
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.full,
                backgroundColor: favorita ? theme.color.acentoTenue : theme.color.superficieHundida,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt
                style={{ fontSize: 22, lineHeight: 26 }}
                color={favorita ? theme.color.acento : theme.color.textoSuave}
              >
                {favorita ? '♥' : '♡'}
              </Txt>
            </Pressable>
          </Fila>

          <Columna gap={space.sm}>
            <Txt variant="display">{recipe.title}</Txt>
            <Txt variant="cuerpo" color={theme.color.textoSuave}>
              {recipe.description}
            </Txt>
          </Columna>

          <Fila gap={space.sm} wrap>
            <Chip tono="acento">{recipe.totalTimeMinutes} min</Chip>
            <Chip>
              {recipe.servings} {recipe.servings === 1 ? 'porción' : 'porciones'}
            </Chip>
            <Chip>{recipe.steps.length} pasos</Chip>
            {conTimer > 0 ? <Chip>{conTimer} con timer</Chip> : null}
          </Fila>
        </Columna>

        <View style={{ height: space.xxl }} />

        <Columna gap={space.md}>
          <Etiqueta>Ingredientes</Etiqueta>
          <Columna gap={0}>
            {recipe.ingredients.map((ing, i) => (
              <View key={ing.id}>
                {i > 0 ? <Separador /> : null}
                <Fila justify="space-between" style={{ paddingVertical: space.md }}>
                  <Txt variant="cuerpo" style={{ flex: 1 }}>
                    {ing.name}
                  </Txt>
                  {ing.quantity ? (
                    <Txt variant="chico" color={theme.color.textoSuave}>
                      {ing.quantity}
                    </Txt>
                  ) : null}
                </Fila>
              </View>
            ))}
          </Columna>
        </Columna>

        <View style={{ height: space.xxl }} />

        <Columna gap={space.lg}>
          <Etiqueta>Preparación</Etiqueta>
          {recipe.steps.map((step) => (
            <Fila key={step.id} gap={space.md} align="flex-start">
              {/* El número va en un círculo tenue: ordena sin gritar. */}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  backgroundColor: theme.color.superficieHundida,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                }}
              >
                <Txt variant="chicoFuerte" color={theme.color.textoSuave}>
                  {step.order}
                </Txt>
              </View>
              <Columna gap={space.xs} style={{ flex: 1 }}>
                <Txt variant="cuerpo">{step.instruction}</Txt>
                {step.timerSeconds ? (
                  <Chip tono="acento">⏱ {Math.round(step.timerSeconds / 60)} min</Chip>
                ) : null}
              </Columna>
            </Fila>
          ))}
        </Columna>
      </ScrollView>

      {/* Acción principal fija abajo: es lo único que se hace en esta pantalla. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.md,
          backgroundColor: theme.color.fondo,
          borderTopWidth: 1,
          borderTopColor: theme.color.borde,
        }}
      >
        <Boton full onPress={() => navigation.navigate('CookMode', { recipeId: recipe.id })}>
          Empezar a cocinar
        </Boton>
      </View>
    </View>
  );
}
