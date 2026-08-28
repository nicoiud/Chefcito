import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { buildMarkers, getArSession } from '../ar';
import { projectToTopDown } from '../ar/topDownProjection';
import { partitionExpectedIngredients } from '../vision/useIngredientDetection';
import { ArErrorBoundary } from '../ar/ArErrorBoundary';
import type { ArTrackingState } from '../ar/types';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { Boton, Columna, Etiqueta, Fila, Txt } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'ArGuide'>;

const MARKER_SIZE = 84;

/**
 * Carga la vista AR solo cuando el módulo nativo existe. El require es
 * dinámico a propósito: `ArSceneView` importa Viro en su nivel superior y
 * evaluarlo en Expo Go rompería la pantalla.
 */
function loadArSceneView(): React.ComponentType<any> | null {
  try {
    return require('../ar/ArSceneView').ArSceneView;
  } catch {
    return null;
  }
}

const MENSAJES: Record<ArTrackingState, { titulo: string; detalle: string }> = {
  'buscando-superficie': {
    titulo: 'Buscando la mesada',
    detalle: 'Movés el celular despacio hasta que aparezca, y la tocás.',
  },
  anclado: {
    titulo: 'Guía anclada',
    detalle: 'Los marcadores muestran dónde va cada ingrediente.',
  },
  perdido: {
    titulo: 'Se perdió el seguimiento',
    detalle: 'Apuntá de nuevo a la mesada y tocá Recalibrar.',
  },
};

export function ArGuideScreen({ route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { recipeId, stepIndex } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const step = recipe?.steps[stepIndex];

  const arSession = useMemo(() => getArSession(), []);
  const ArSceneView = useMemo(() => (arSession ? loadArSceneView() : null), [arSession]);

  const [area, setArea] = useState({ width: 0, height: 0 });
  const [calibraciones, setCalibraciones] = useState(0);
  const [tracking, setTracking] = useState<ArTrackingState>('buscando-superficie');
  const [forzar2d, setForzar2d] = useState(false);
  const [arError, setArError] = useState<string | null>(null);

  const esperados = step?.ingredientIds ?? [];
  const { notDetectable } = useMemo(
    () => partitionExpectedIngredients(esperados),
    [esperados]
  );
  const markers = useMemo(() => buildMarkers(esperados), [esperados]);

  const proyectados = useMemo(
    () =>
      area.width > 0 && area.height > 0
        ? projectToTopDown(markers, {
            width: area.width,
            height: area.height,
            // El marcador se dibuja centrado, así que el margen tiene que
            // cubrir su radio o los laterales quedan cortados.
            padding: MARKER_SIZE / 2 + 16,
          })
        : [],
    [markers, area]
  );

  if (!recipe || !step) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt>No se encontró el paso.</Txt>
      </View>
    );
  }

  const recalibrar = () => {
    setCalibraciones((c) => c + 1);
    setTracking('buscando-superficie');
  };

  const mostrarAr = ArSceneView !== null && !forzar2d && arError === null;

  if (mostrarAr) {
    const msg = MENSAJES[tracking];
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ArErrorBoundary onError={setArError}>
          <ArSceneView
            key={`ar-${stepIndex}-${calibraciones}`}
            markers={markers}
            onTrackingChange={setTracking}
          />
        </ArErrorBoundary>

        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 56,
            paddingHorizontal: space.lg,
            paddingBottom: space.lg,
            backgroundColor: theme.color.veloCamara,
          }}
        >
          <Columna gap={space.sm}>
            <Txt variant="etiqueta" color="rgba(255,255,255,0.65)">
              Paso {step.order}
            </Txt>
            <Txt variant="cuerpoFuerte" color="#FFFFFF" numberOfLines={3}>
              {step.instruction}
            </Txt>
            <Fila gap={space.sm}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    tracking === 'anclado' ? theme.color.exito : theme.color.alerta,
                }}
              />
              <Txt variant="chico" color="#FFFFFF">
                {msg.titulo}
              </Txt>
            </Fila>
            <Txt variant="chico" color="rgba(255,255,255,0.7)">
              {msg.detalle}
            </Txt>
          </Columna>
        </View>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + space.lg,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: space.md,
            paddingHorizontal: space.lg,
          }}
        >
          <Boton variant="secundario" onPress={recalibrar}>
            Recalibrar
          </Boton>
          <Boton variant="secundario" onPress={() => setForzar2d(true)}>
            Ver en 2D
          </Boton>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.color.fondo }}
      contentContainerStyle={{
        padding: space.lg,
        paddingBottom: insets.bottom + space.xxl,
        gap: space.lg,
      }}
    >
      <Columna gap={space.sm}>
        <Etiqueta>Paso {step.order}</Etiqueta>
        <Txt variant="subtitulo">{step.instruction}</Txt>
      </Columna>

      {/* Plano cenital: la misma disposición que se anclaría en AR. */}
      <View
        onLayout={(e: LayoutChangeEvent) => setArea(e.nativeEvent.layout)}
        style={{
          height: 340,
          borderRadius: radius.lg,
          backgroundColor: theme.color.superficieHundida,
          borderWidth: 2,
          borderColor: theme.color.borde,
          borderStyle: 'dashed',
          overflow: 'hidden',
        }}
      >
        <Txt
          variant="etiqueta"
          color={theme.color.textoTenue}
          align="center"
          style={{ marginTop: space.md }}
        >
          Tu mesada, desde arriba
        </Txt>

        {proyectados.map((m) => (
          <View
            key={m.ingredientId}
            style={{
              position: 'absolute',
              left: m.screen.x - MARKER_SIZE / 2,
              top: m.screen.y - MARKER_SIZE / 2,
              width: MARKER_SIZE,
              height: MARKER_SIZE,
              borderRadius: MARKER_SIZE / 2,
              backgroundColor:
                m.state === 'confirmado' ? theme.color.exitoTenue : theme.color.acentoTenue,
              borderWidth: 2,
              borderColor: m.state === 'confirmado' ? theme.color.exito : theme.color.acento,
              alignItems: 'center',
              justifyContent: 'center',
              padding: space.xs,
            }}
          >
            <Txt
              variant="chicoFuerte"
              align="center"
              numberOfLines={2}
              color={m.state === 'confirmado' ? theme.color.exito : theme.color.acentoFuerte}
            >
              {m.label}
            </Txt>
          </View>
        ))}

        {markers.length === 0 ? (
          <Txt
            variant="chico"
            color={theme.color.textoTenue}
            align="center"
            style={{ marginTop: 140 }}
          >
            Este paso no necesita ingredientes nuevos.
          </Txt>
        ) : null}

        <Txt
          variant="chico"
          color={theme.color.textoTenue}
          align="center"
          style={{ position: 'absolute', bottom: space.md, left: 0, right: 0 }}
        >
          vos
        </Txt>
      </View>

      <Fila gap={space.md} justify="center" wrap>
        <Boton variant="secundario" onPress={recalibrar}>
          Recalibrar
        </Boton>
        {ArSceneView !== null && forzar2d ? (
          <Boton onPress={() => setForzar2d(false)}>Volver a AR</Boton>
        ) : null}
      </Fila>

      {calibraciones > 0 ? (
        <Txt variant="chico" color={theme.color.textoSuave} align="center">
          Guía reanclada {calibraciones} {calibraciones === 1 ? 'vez' : 'veces'}.
        </Txt>
      ) : null}

      {arError ? (
        <View
          style={{
            backgroundColor: theme.color.alertaTenue,
            borderRadius: radius.md,
            padding: space.md,
          }}
        >
          <Txt variant="chico" color={theme.color.alerta}>
            La vista AR no pudo iniciarse ({arError}). Te muestro la guía en 2D, que tiene la
            misma información.
          </Txt>
        </View>
      ) : null}

      {notDetectable.length > 0 ? (
        <Txt variant="chico" color={theme.color.textoSuave}>
          {notDetectable.length === esperados.length
            ? 'Ninguno de estos ingredientes se verifica con la cámara.'
            : 'Algunos de estos ingredientes no se verifican con la cámara.'}
        </Txt>
      ) : null}

      <Txt variant="chico" color={theme.color.textoTenue}>
        {arSession
          ? `Motor AR: ${arSession.name}`
          : 'Sin AR en este dispositivo — mostrando la guía en 2D.'}
      </Txt>
    </ScrollView>
  );
}
