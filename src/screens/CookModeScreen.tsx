import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { StepTimer } from '../components/StepTimer';
import { featureFlags } from '../config/featureFlags';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, TOUCH_MIN } from '../theme/tokens';
import { Boton, Columna, Etiqueta, Fila, Progreso, Txt } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'CookMode'>;

/**
 * Modo cocinar.
 *
 * Es la pantalla que se mira de lejos, con las manos ocupadas. Por eso la
 * instrucción arranca siempre en el mismo lugar y con tipografía grande
 * (así el ojo no la busca de nuevo en cada paso), el avance se lee como
 * barra en vez de texto, y los controles son grandes y están al alcance del
 * pulgar, abajo.
 */
export function CookModeScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { recipeId } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const [stepIndex, setStepIndex] = useState(0);

  if (!recipe) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt>No se encontró la receta.</Txt>
      </View>
    );
  }

  const steps = recipe.steps;
  const step = steps[stepIndex];
  const primero = stepIndex === 0;
  const ultimo = stepIndex === steps.length - 1;

  const ingredientesDelPaso = (step.ingredientIds ?? [])
    .map((id) => recipe.ingredients.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.fondo }}>
      {/* Cabecera propia: la del stack se oculta para ganar altura. */}
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg }}>
        <Fila justify="space-between" align="center">
          <Pressable
            onPress={() => navigation.goBack()}
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
            <Txt variant="cuerpoFuerte" color={theme.color.textoSuave}>
              ✕
            </Txt>
          </Pressable>
          <Columna gap={0} style={{ flex: 1, marginLeft: space.md }}>
            <Txt variant="chicoFuerte" numberOfLines={1}>
              {recipe.title}
            </Txt>
            <Txt variant="chico" color={theme.color.textoSuave}>
              Paso {step.order} de {steps.length}
            </Txt>
          </Columna>
        </Fila>

        <View style={{ marginTop: space.md }}>
          <Progreso valor={(stepIndex + 1) / steps.length} />
        </View>
      </View>

      {/* La instrucción es la protagonista y queda anclada arriba: cambia de
          largo entre pasos, pero siempre empieza a la misma altura. */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.xl,
          paddingTop: space.xxl,
          paddingBottom: space.xl,
          gap: space.xl,
        }}
      >
        <Txt variant="paso">{step.instruction}</Txt>

        {ingredientesDelPaso.length > 0 ? (
          <Columna gap={space.sm}>
            <Etiqueta>Para este paso</Etiqueta>
            <Fila gap={space.sm} wrap>
              {ingredientesDelPaso.map((ing) => (
                <View
                  key={ing.id}
                  style={{
                    backgroundColor: theme.color.superficieHundida,
                    borderRadius: radius.md,
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm,
                  }}
                >
                  <Txt variant="chicoFuerte">{ing.name}</Txt>
                  {ing.quantity ? (
                    <Txt variant="chico" color={theme.color.textoSuave}>
                      {ing.quantity}
                    </Txt>
                  ) : null}
                </View>
              ))}
            </Fila>
          </Columna>
        ) : null}

        {step.timerSeconds ? <StepTimer durationSeconds={step.timerSeconds} /> : null}
      </ScrollView>

      {/* Controles abajo, al alcance del pulgar. */}
      <View
        style={{
          paddingHorizontal: space.lg,
          paddingBottom: insets.bottom + space.md,
          gap: space.md,
        }}
      >
        {featureFlags.cameraIngredientDetection || featureFlags.voiceAssistant ||
        featureFlags.arGuidance ? (
          <Fila gap={space.sm} justify="center" wrap>
            {featureFlags.cameraIngredientDetection ? (
              <Herramienta
                label="Verificar"
                icono="📷"
                onPress={() => navigation.navigate('IngredientCheck', { recipeId, stepIndex })}
              />
            ) : null}
            {featureFlags.voiceAssistant ? (
              <Herramienta
                label="Preguntar"
                icono="🎙"
                onPress={() => navigation.navigate('VoiceAssistant', { recipeId, stepIndex })}
              />
            ) : null}
            {featureFlags.arGuidance ? (
              <Herramienta
                label="Guía"
                icono="🎯"
                onPress={() => navigation.navigate('ArGuide', { recipeId, stepIndex })}
              />
            ) : null}
          </Fila>
        ) : null}

        <Fila gap={space.md}>
          <Boton
            variant="fantasma"
            disabled={primero}
            onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
            style={{ flex: 1 }}
          >
            Anterior
          </Boton>
          <Boton
            onPress={() => (ultimo ? navigation.goBack() : setStepIndex((i) => i + 1))}
            style={{ flex: 1.4 }}
          >
            {ultimo ? '¡Listo!' : 'Siguiente'}
          </Boton>
        </Fila>
      </View>
    </View>
  );
}

function Herramienta({
  label,
  icono,
  onPress,
}: {
  label: string;
  icono: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH_MIN,
        paddingHorizontal: space.lg,
        borderRadius: radius.full,
        backgroundColor: theme.color.superficieHundida,
        borderWidth: 1,
        borderColor: theme.color.borde,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Txt variant="chico">{icono}</Txt>
      <Txt variant="chicoFuerte">{label}</Txt>
    </Pressable>
  );
}
