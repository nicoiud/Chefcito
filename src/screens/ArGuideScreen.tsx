import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { buildMarkers, getArSession } from '../ar';
import { projectToTopDown } from '../ar/topDownProjection';
import { partitionExpectedIngredients } from '../vision/useIngredientDetection';
import type { ArTrackingState } from '../ar/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ArGuide'>;

const MARKER_SIZE = 76;

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

const TRACKING_MESSAGES: Record<ArTrackingState, string> = {
  'buscando-superficie': 'Movés el celular despacio hasta que aparezca la mesada, y la tocás.',
  anclado: 'Guía anclada. Los marcadores muestran dónde va cada ingrediente.',
  perdido: 'Se perdió el seguimiento. Probá recalibrar apuntando a la mesada.',
};

export function ArGuideScreen({ route }: Props) {
  const { recipeId, stepIndex } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const step = recipe?.steps[stepIndex];

  const arSession = useMemo(() => getArSession(), []);
  const ArSceneView = useMemo(() => (arSession ? loadArSceneView() : null), [arSession]);

  const [area, setArea] = useState({ width: 0, height: 0 });
  // Recalibrar remonta la escena AR (cambiando su key), lo que reinicia la
  // selección de plano. La especificación lo pide porque el anclaje se
  // desestabiliza en mesadas reflectantes o muy uniformes.
  const [calibrations, setCalibrations] = useState(0);
  const [tracking, setTracking] = useState<ArTrackingState>('buscando-superficie');
  const [force2d, setForce2d] = useState(false);

  const expected = step?.ingredientIds ?? [];
  const { detectable, notDetectable } = useMemo(
    () => partitionExpectedIngredients(expected),
    [expected]
  );
  const markers = useMemo(() => buildMarkers(expected), [expected]);

  const projected = useMemo(
    () =>
      area.width > 0 && area.height > 0
        ? projectToTopDown(markers, {
            width: area.width,
            height: area.height,
            // El marcador se dibuja centrado en su punto, así que el margen
            // tiene que cubrir su radio o los laterales quedan cortados.
            padding: MARKER_SIZE / 2 + 14,
          })
        : [],
    [markers, area]
  );

  if (!recipe || !step) {
    return (
      <View style={styles.center}>
        <Text>No se encontró el paso de la receta.</Text>
      </View>
    );
  }

  const recalibrate = () => {
    setCalibrations((c) => c + 1);
    setTracking('buscando-superficie');
  };

  const showAr = ArSceneView !== null && !force2d;

  if (showAr) {
    return (
      <View style={styles.arContainer}>
        <ArSceneView
          key={`ar-${stepIndex}-${calibrations}`}
          markers={markers}
          onTrackingChange={setTracking}
        />

        <View style={styles.arOverlayTop} pointerEvents="none">
          <Text style={styles.arStepLabel}>Paso {step.order}</Text>
          <Text style={styles.arStepText} numberOfLines={3}>
            {step.instruction}
          </Text>
          <Text style={styles.arTracking}>{TRACKING_MESSAGES[tracking]}</Text>
        </View>

        <View style={styles.arOverlayBottom}>
          <Pressable style={styles.arButton} onPress={recalibrate}>
            <Text style={styles.arButtonText}>🎯 Recalibrar</Text>
          </Pressable>
          <Pressable style={styles.arButton} onPress={() => setForce2d(true)}>
            <Text style={styles.arButtonText}>🗺️ Ver en 2D</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepLabel}>Paso {step.order}</Text>
      <Text style={styles.stepText}>{step.instruction}</Text>

      <View style={styles.board} onLayout={(e: LayoutChangeEvent) => setArea(e.nativeEvent.layout)}>
        <Text style={styles.boardHint}>Tu mesada, vista desde arriba</Text>

        {projected.map((marker) => (
          <View
            key={marker.ingredientId}
            style={[
              styles.marker,
              marker.state === 'confirmado' && styles.markerConfirmed,
              {
                left: marker.screen.x - MARKER_SIZE / 2,
                top: marker.screen.y - MARKER_SIZE / 2,
              },
            ]}
          >
            <Text style={styles.markerLabel} numberOfLines={2}>
              {marker.label}
            </Text>
          </View>
        ))}

        {markers.length === 0 ? (
          <Text style={styles.emptyBoard}>Este paso no necesita ingredientes nuevos.</Text>
        ) : null}

        <View style={styles.userMark}>
          <Text style={styles.userMarkText}>vos</Text>
        </View>
      </View>

      <Pressable style={styles.recalibrate} onPress={recalibrate}>
        <Text style={styles.recalibrateText}>🎯 Recalibrar guía</Text>
      </Pressable>
      {calibrations > 0 ? (
        <Text style={styles.recalibrateNote}>
          Guía reanclada {calibrations} {calibrations === 1 ? 'vez' : 'veces'}.
        </Text>
      ) : null}

      {ArSceneView !== null && force2d ? (
        <Pressable style={styles.recalibrate} onPress={() => setForce2d(false)}>
          <Text style={styles.recalibrateText}>📱 Volver a la vista AR</Text>
        </Pressable>
      ) : null}

      {notDetectable.length > 0 ? (
        <Text style={styles.note}>
          {notDetectable.length === expected.length
            ? 'Ninguno de los ingredientes de este paso se puede verificar con la cámara.'
            : 'Algunos ingredientes de este paso no se verifican con la cámara.'}
        </Text>
      ) : null}

      <Text style={styles.engine}>
        {arSession
          ? `Motor AR disponible: ${arSession.name}`
          : 'Sin AR en este dispositivo — mostrando la guía en 2D.'}
      </Text>
      {detectable.length > 0 ? (
        <Text style={styles.engineSub}>
          Con la cámara abierta, los ingredientes reconocidos se marcan en verde.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  arContainer: { flex: 1, backgroundColor: '#000' },
  arOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  arStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFCC80',
    textTransform: 'uppercase',
  },
  arStepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
    lineHeight: 22,
  },
  arTracking: { fontSize: 12, color: '#E0E0E0', marginTop: 8, lineHeight: 17 },
  arOverlayBottom: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  arButton: {
    marginHorizontal: 6,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  arButtonText: { color: '#E65100', fontWeight: '700', fontSize: 14 },

  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9E9E9E',
    textTransform: 'uppercase',
  },
  stepText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#212121',
    marginTop: 4,
    lineHeight: 24,
  },
  board: {
    height: 320,
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: '#ECEFF1',
    borderWidth: 2,
    borderColor: '#CFD8DC',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  boardHint: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    color: '#90A4AE',
  },
  emptyBoard: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#90A4AE',
    fontSize: 13,
  },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: '#FFE0B2',
    borderWidth: 2,
    borderColor: '#FB8C00',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  markerConfirmed: { backgroundColor: '#C8E6C9', borderColor: '#43A047' },
  markerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#424242',
    textAlign: 'center',
  },
  userMark: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  userMarkText: { fontSize: 10, color: '#90A4AE', fontWeight: '600' },
  recalibrate: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
  },
  recalibrateText: { color: '#E65100', fontWeight: '700', fontSize: 14 },
  recalibrateNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 6,
  },
  note: { marginTop: 16, fontSize: 12, color: '#757575', lineHeight: 18 },
  engine: { marginTop: 20, fontSize: 11, color: '#BDBDBD' },
  engineSub: { marginTop: 4, fontSize: 11, color: '#BDBDBD' },
});
