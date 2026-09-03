import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { buildMarkers, getArSession } from '../ar';
import { describirIngrediente } from '../ar/markerLabels';
import { projectToTopDown } from '../ar/topDownProjection';
import { partitionExpectedIngredients } from '../vision/useIngredientDetection';
import { ArErrorBoundary } from '../ar/ArErrorBoundary';
import { useArReadiness } from '../ar/useArReadiness';
import { useDetectionAnchors } from '../ar/useDetectionAnchors';
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

/**
 * Un mensaje por estado, y cada uno dice qué hacer. "Se perdió el
 * seguimiento" no le sirve a nadie: lo que hace falta es saber si hay que
 * prender la luz, ir más despacio, o tocar la pantalla.
 */
export const MENSAJES: Record<ArTrackingState, { titulo: string; detalle: string; ok: boolean }> = {
  'buscando-superficie': {
    titulo: 'Buscando los ingredientes',
    detalle: 'Apuntá a la mesada y movés el celular despacio, de lado a lado.',
    ok: false,
  },
  'superficie-lista': {
    titulo: 'Reconociendo la mesada',
    detalle: 'Ya tengo la superficie. Apuntá a los ingredientes del paso.',
    ok: true,
  },
  anclado: {
    titulo: 'Ingredientes marcados',
    detalle: 'Cada marcador está apoyado sobre lo que la cámara reconoció.',
    ok: true,
  },
  'poca-textura': {
    titulo: 'Falta luz o la mesada es muy lisa',
    detalle: 'Prendé una luz, o apuntá a una zona con algo apoyado encima.',
    ok: false,
  },
  'mucho-movimiento': {
    titulo: 'Vas muy rápido',
    detalle: 'Movés el celular más despacio para que pueda seguir el entorno.',
    ok: false,
  },
  perdido: {
    titulo: 'Se perdió el seguimiento',
    detalle: 'Apuntá de nuevo a la mesada, o tocá Reiniciar para empezar de cero.',
    ok: false,
  },
};

/**
 * Si en este tiempo no se ancló nada, la pantalla ofrece la guía 2D en vez
 * de dejar al usuario mirando una cámara que no reacciona.
 */
const SEGUNDOS_ANTES_DE_OFRECER_2D = 15;

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
  const [tardando, setTardando] = useState(false);
  const { readiness, pedirPermiso } = useArReadiness();

  const esperados = step?.ingredientIds ?? [];
  const { notDetectable } = useMemo(
    () => partitionExpectedIngredients(esperados),
    [esperados]
  );
  // El arco calculado sigue siendo la guía 2D: ahí no hay cámara que
  // reconozca nada, así que se muestra una disposición sugerida.
  const markersSugeridos = useMemo(() => buildMarkers(esperados), [esperados]);

  // En AR, en cambio, los marcadores salen de lo que la cámara reconoce.
  // La receta manda para el rótulo: usa sus propios nombres y es la única
  // que sabe cuánto va de cada cosa.
  const describir = useCallback(
    (id: string) => describirIngrediente(id, recipe?.ingredients ?? []),
    [recipe]
  );

  const {
    markers: markersDetectados,
    vistos,
    onDetections,
    onHitTestReady,
  } = useDetectionAnchors(esperados, describir);
  const [detectorError, setDetectorError] = useState<string | null>(null);

  // Si después de un rato no ancló nada, la pantalla lo dice y ofrece la
  // guía 2D. Antes se quedaba en "buscando" para siempre, sin salida.
  useEffect(() => {
    if (tracking === 'anclado') {
      setTardando(false);
      return;
    }
    const t = setTimeout(() => setTardando(true), SEGUNDOS_ANTES_DE_OFRECER_2D * 1000);
    return () => clearTimeout(t);
  }, [tracking, calibraciones]);

  const proyectados = useMemo(
    () =>
      area.width > 0 && area.height > 0
        ? projectToTopDown(markersSugeridos, {
            width: area.width,
            height: area.height,
            // El marcador se dibuja centrado, así que el margen tiene que
            // cubrir su radio o los laterales quedan cortados.
            padding: MARKER_SIZE / 2 + 16,
          })
        : [],
    [markersSugeridos, area]
  );

  if (!recipe || !step) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt>No se encontró el paso.</Txt>
      </View>
    );
  }

  const nombreDe = (id: string) => describirIngrediente(id, recipe.ingredients).label;

  const recalibrar = () => {
    setCalibraciones((c) => c + 1);
    setTracking('buscando-superficie');
  };

  const mostrarAr =
    ArSceneView !== null && !forzar2d && arError === null && readiness === 'listo';

  // Sin permiso de cámara ARCore no recibe imagen y no detecta nada nunca.
  // Antes se montaba igual y el usuario veía una pantalla negra eterna.
  if (ArSceneView !== null && !forzar2d && arError === null && readiness === 'sin-permiso') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: space.xl,
          backgroundColor: theme.color.fondo,
        }}
      >
        <Columna gap={space.lg}>
          <Txt style={{ fontSize: 44, lineHeight: 52 }}>📐</Txt>
          <Txt variant="titulo">La guía necesita la cámara</Txt>
          <Txt variant="cuerpo" color={theme.color.textoSuave}>
            La realidad aumentada apoya los marcadores sobre tu mesada, y para eso tiene que
            verla. Las imágenes se procesan en tu celular.
          </Txt>
          <Boton full onPress={pedirPermiso}>
            Permitir cámara
          </Boton>
          <Boton variant="fantasma" full onPress={() => setForzar2d(true)}>
            Ver la guía en 2D
          </Boton>
        </Columna>
      </View>
    );
  }

  if (mostrarAr) {
    const msg = MENSAJES[tracking];
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ArErrorBoundary onError={setArError}>
          <ArSceneView
            key={`ar-${stepIndex}-${calibraciones}`}
            markers={markersDetectados}
            onTrackingChange={setTracking}
            onHitTestReady={onHitTestReady}
            onDetections={onDetections}
            onDetectorError={setDetectorError}
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
                  backgroundColor: msg.ok ? theme.color.exito : theme.color.alerta,
                }}
              />
              <Txt variant="chico" color="#FFFFFF">
                {msg.titulo}
              </Txt>
            </Fila>
            <Txt variant="chico" color="rgba(255,255,255,0.7)">
              {msg.detalle}
            </Txt>
            {tardando && vistos.length === 0 ? (
              <Txt variant="chico" color="rgba(255,255,255,0.7)">
                Si no aparece nada, tu celular puede no tener AR: tocá "Ver en 2D" y seguís
                igual, con la misma información.
              </Txt>
            ) : null}
            {detectorError ? (
              <Txt variant="chico" color={theme.color.alerta}>
                El reconocimiento no arrancó ({detectorError}). La AR sigue andando, pero sin
                marcar ingredientes.
              </Txt>
            ) : null}

            {/* Qué falta y qué ya está, sobre la cámara: antes había que
                salir a otra pantalla para saberlo. */}
            {esperados.length > 0 ? (
              <Fila gap={space.sm} wrap>
                {esperados.map((id) => {
                  const visto = vistos.includes(id);
                  return (
                    <View
                      key={id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.xs,
                        paddingHorizontal: space.md,
                        paddingVertical: space.xs,
                        borderRadius: radius.full,
                        backgroundColor: visto
                          ? theme.color.exito
                          : 'rgba(255,255,255,0.16)',
                      }}
                    >
                      <Txt variant="chicoFuerte" color="#FFFFFF">
                        {visto ? '✓' : '○'} {nombreDe(id)}
                      </Txt>
                    </View>
                  );
                })}
              </Fila>
            ) : null}
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
            Reiniciar
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
          Disposición sugerida
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

        {markersSugeridos.length === 0 ? (
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

      {ArSceneView !== null && forzar2d ? (
        <Fila justify="center">
          <Boton onPress={() => setForzar2d(false)}>Volver a AR</Boton>
        </Fila>
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

      {/* Decir por qué no hay AR: "no anda" no le sirve a nadie. */}
      <Txt variant="chico" color={theme.color.textoTenue}>
        {!arSession
          ? 'Este build no trae el módulo de AR — mostrando la guía en 2D.'
          : readiness === 'sin-soporte'
            ? 'Tu celular no tiene ARCore (o falta instalar "Servicios de Google Play para RA"), así que va la guía en 2D.'
            : readiness === 'verificando'
              ? 'Verificando si el dispositivo soporta AR…'
              : `Motor AR: ${arSession.name}`}
      </Txt>
    </ScrollView>
  );
}
