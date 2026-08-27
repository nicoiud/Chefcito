import React, { useCallback, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { getDisplayName } from '../vision';
import { useIngredientDetection } from '../vision/useIngredientDetection';
import type { DetectionFrame } from '../vision/types';

type Props = NativeStackScreenProps<RootStackParamList, 'IngredientCheck'>;

export function IngredientCheckScreen({ route }: Props) {
  const { recipeId, stepIndex } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const step = recipe?.steps[stepIndex];

  const cameraRef = useRef<CameraView | null>(null);
  const isCameraReady = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  const captureFrame = useCallback(async (): Promise<DetectionFrame | null> => {
    if (!cameraRef.current || !isCameraReady.current) return null;
    const picture = await cameraRef.current.takePictureAsync({
      quality: 0.4,
      base64: true,
      skipProcessing: true,
    });
    if (!picture) return null;
    return {
      uri: picture.uri,
      width: picture.width,
      height: picture.height,
      base64: picture.base64,
    };
  }, []);

  const { detectorName, match, notDetectable, error } = useIngredientDetection({
    expectedIngredientIds: step?.ingredientIds ?? [],
    captureFrame,
    enabled: permission?.granted === true,
  });

  if (!recipe || !step) {
    return (
      <View style={styles.center}>
        <Text>No se encontró el paso de la receta.</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Verificando permisos de cámara…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionTitle}>Necesitamos la cámara</Text>
        <Text style={styles.permissionText}>
          Chefcito usa la cámara para reconocer los ingredientes del paso. Las imágenes se
          procesan en tu celular y no se envían a ningún servidor.
        </Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => {
            isCameraReady.current = true;
          }}
        />
        {match.isComplete ? (
          <View style={styles.completeBanner}>
            <Text style={styles.completeBannerText}>✅ Todo listo para este paso</Text>
          </View>
        ) : null}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <Text style={styles.stepLabel}>Paso {step.order}</Text>
        <Text style={styles.stepText}>{step.instruction}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Ingredientes del paso</Text>
        {match.matched.length === 0 && match.missing.length === 0 ? (
          <Text style={styles.mutedText}>Este paso no requiere ingredientes nuevos.</Text>
        ) : null}

        {match.matched.map((id) => (
          <View key={id} style={styles.row}>
            <Text style={styles.rowIcon}>✅</Text>
            <Text style={styles.rowTextFound}>{getDisplayName(id)}</Text>
          </View>
        ))}

        {match.missing.map((id) => (
          <View key={id} style={styles.row}>
            <Text style={styles.rowIcon}>⬜</Text>
            <Text style={styles.rowTextMissing}>{getDisplayName(id)}</Text>
          </View>
        ))}

        {notDetectable.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>No verificable por cámara</Text>
            {notDetectable.map((id) => (
              <View key={id} style={styles.row}>
                <Text style={styles.rowIcon}>•</Text>
                <Text style={styles.mutedText}>{getDisplayName(id)}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.detectorNote}>Motor de visión: {detectorName}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cameraWrapper: {
    height: '45%',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  completeBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    backgroundColor: 'rgba(67, 160, 71, 0.92)',
    alignItems: 'center',
  },
  completeBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  panel: {
    flex: 1,
  },
  panelContent: {
    padding: 20,
    paddingBottom: 32,
  },
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowIcon: {
    fontSize: 15,
    width: 26,
  },
  rowTextFound: {
    fontSize: 15,
    color: '#2E7D32',
    fontWeight: '600',
  },
  rowTextMissing: {
    fontSize: 15,
    color: '#616161',
  },
  mutedText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  error: {
    marginTop: 12,
    color: '#C62828',
    fontSize: 13,
  },
  detectorNote: {
    marginTop: 24,
    fontSize: 11,
    color: '#BDBDBD',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#212121',
  },
  permissionText: {
    textAlign: 'center',
    color: '#616161',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#FB8C00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
