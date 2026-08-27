import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { buildMarkers, getArSession } from '../ar';
import { projectToTopDown } from '../ar/topDownProjection';
import { partitionExpectedIngredients } from '../vision/useIngredientDetection';

type Props = NativeStackScreenProps<RootStackParamList, 'ArGuide'>;

const MARKER_SIZE = 76;

export function ArGuideScreen({ route }: Props) {
  const { recipeId, stepIndex } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const step = recipe?.steps[stepIndex];

  const arSession = useMemo(() => getArSession(), []);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // Recalibrar vuelve a anclar la guía: la especificación lo pide porque el
  // seguimiento se desestabiliza en mesadas reflectantes o muy uniformes.
  const [calibrations, setCalibrations] = useState(0);

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

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepLabel}>Paso {step.order}</Text>
      <Text style={styles.stepText}>{step.instruction}</Text>

      <View style={styles.board} onLayout={onLayout}>
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

      <Pressable style={styles.recalibrate} onPress={() => setCalibrations((c) => c + 1)}>
        <Text style={styles.recalibrateText}>🎯 Recalibrar guía</Text>
      </Pressable>
      {calibrations > 0 ? (
        <Text style={styles.recalibrateNote}>
          Guía reanclada {calibrations} {calibrations === 1 ? 'vez' : 'veces'}.
        </Text>
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
          ? `Motor AR: ${arSession.name}`
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
  markerConfirmed: {
    backgroundColor: '#C8E6C9',
    borderColor: '#43A047',
  },
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
  userMarkText: {
    fontSize: 10,
    color: '#90A4AE',
    fontWeight: '600',
  },
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
  note: {
    marginTop: 16,
    fontSize: 12,
    color: '#757575',
    lineHeight: 18,
  },
  engine: { marginTop: 20, fontSize: 11, color: '#BDBDBD' },
  engineSub: { marginTop: 4, fontSize: 11, color: '#BDBDBD' },
});
