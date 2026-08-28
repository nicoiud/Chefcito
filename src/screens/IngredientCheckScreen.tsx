import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { getDisplayName, getIngredientDetector } from '../vision';
import { useIngredientDetection } from '../vision/useIngredientDetection';
import { frameToTensor } from '../vision/frameToTensor';
import { IngredientPicker } from '../components/IngredientPicker';
import type { DetectionFrame } from '../vision/types';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { Boton, Columna, Etiqueta, Fila, Progreso, Txt } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'IngredientCheck'>;

export function IngredientCheckScreen({ route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { recipeId, stepIndex } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const step = recipe?.steps[stepIndex];

  const cameraRef = useRef<CameraView | null>(null);
  const isCameraReady = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const needsPixels = getIngredientDetector().requiresPixels;
  const [corrigiendo, setCorrigiendo] = useState<{ rawLabel: string; shown: string } | null>(
    null
  );

  const captureFrame = useCallback(async (): Promise<DetectionFrame | null> => {
    if (!cameraRef.current || !isCameraReady.current) return null;
    const picture = await cameraRef.current.takePictureAsync({
      quality: 0.4,
      skipProcessing: true,
    });
    if (!picture) return null;

    const frame: DetectionFrame = {
      uri: picture.uri,
      width: picture.width,
      height: picture.height,
    };

    // El tensor solo se calcula si hay un modelo que lo vaya a consumir.
    if (needsPixels) frame.pixels = await frameToTensor(picture.uri);
    return frame;
  }, [needsPixels]);

  const {
    detectorName,
    detected,
    match,
    manuallyConfirmed,
    error,
    confirmManually,
    undoManualConfirmation,
    correctDetection,
  } = useIngredientDetection({
    expectedIngredientIds: step?.ingredientIds ?? [],
    captureFrame,
    enabled: permission?.granted === true,
  });

  if (!recipe || !step) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt>No se encontró el paso.</Txt>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color={theme.color.textoSuave}>Verificando permisos…</Txt>
      </View>
    );
  }

  if (!permission.granted) {
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
          <Txt style={{ fontSize: 44, lineHeight: 52 }}>📷</Txt>
          <Txt variant="titulo">Necesitamos la cámara</Txt>
          <Txt variant="cuerpo" color={theme.color.textoSuave}>
            Sirve para reconocer los ingredientes del paso. Las imágenes se procesan en tu
            celular y no se envían a ningún lado.
          </Txt>
          <Boton full onPress={requestPermission}>
            Permitir cámara
          </Boton>
        </Columna>
      </View>
    );
  }

  const total = match.matched.length + match.missing.length;
  const listo = match.isComplete;
  const inesperados = detected.filter((d) => match.extra.includes(d.ingredientId));

  const nombreDe = (id: string) =>
    recipe.ingredients.find((i) => i.id === id)?.name ?? getDisplayName(id);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.fondo }}>
      <View style={{ height: '46%', backgroundColor: '#000' }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          onCameraReady={() => {
            isCameraReady.current = true;
          }}
        />

        {/* Marco de encuadre: le dice al usuario dónde apuntar sin texto. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 56,
            left: space.xl,
            right: space.xl,
            bottom: 84,
            borderWidth: 2,
            borderColor: listo ? theme.color.exito : 'rgba(255,255,255,0.5)',
            borderRadius: radius.lg,
            borderStyle: 'dashed',
          }}
        />

        {/* Estado sobre la cámara, con velo para que se lea sobre cualquier imagen. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            backgroundColor: theme.color.veloCamara,
          }}
        >
          <Columna gap={space.sm}>
            <Fila justify="space-between">
              <Txt variant="chicoFuerte" color="#FFFFFF">
                {listo
                  ? '✓ Todo listo para este paso'
                  : `${match.matched.length} de ${total} ingredientes`}
              </Txt>
              <Txt variant="chico" color="rgba(255,255,255,0.7)">
                Paso {step.order}
              </Txt>
            </Fila>
            {total > 0 ? <Progreso valor={match.matched.length / total} /> : null}
          </Columna>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.lg,
        }}
      >
        <Txt variant="cuerpoFuerte">{step.instruction}</Txt>

        {error ? (
          <Txt variant="chico" color={theme.color.peligro}>
            {error}
          </Txt>
        ) : null}

        {total > 0 ? (
          <Columna gap={space.sm}>
            <Etiqueta>Ingredientes del paso</Etiqueta>

            {match.matched.map((id) => {
              const aMano = manuallyConfirmed.includes(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => (aMano ? undoManualConfirmation(id) : undefined)}
                  style={{
                    backgroundColor: theme.color.exitoTenue,
                    borderRadius: radius.md,
                    padding: space.md,
                  }}
                >
                  <Fila gap={space.md}>
                    <Txt color={theme.color.exito}>{aMano ? '✋' : '✓'}</Txt>
                    <Columna gap={0} style={{ flex: 1 }}>
                      <Txt variant="cuerpoFuerte" color={theme.color.exito}>
                        {nombreDe(id)}
                      </Txt>
                      {aMano ? (
                        <Txt variant="chico" color={theme.color.textoSuave}>
                          Lo marcaste vos · tocá para deshacer
                        </Txt>
                      ) : null}
                    </Columna>
                  </Fila>
                </Pressable>
              );
            })}

            {match.missing.map((id) => (
              <Pressable
                key={id}
                onPress={() => confirmManually(id)}
                style={{
                  backgroundColor: theme.color.superficie,
                  borderWidth: 1,
                  borderColor: theme.color.borde,
                  borderRadius: radius.md,
                  padding: space.md,
                }}
              >
                <Fila gap={space.md} justify="space-between">
                  <Fila gap={space.md} style={{ flex: 1 }}>
                    <Txt color={theme.color.textoTenue}>○</Txt>
                    <Txt variant="cuerpo">{nombreDe(id)}</Txt>
                  </Fila>
                  <Txt variant="chicoFuerte" color={theme.color.acento}>
                    Ya lo tengo
                  </Txt>
                </Fila>
              </Pressable>
            ))}

            {match.missing.length > 0 ? (
              <Txt variant="chico" color={theme.color.textoSuave}>
                Si la cámara no lo reconoce, tocalo para marcarlo vos.
              </Txt>
            ) : null}
          </Columna>
        ) : (
          <Txt variant="chico" color={theme.color.textoSuave}>
            Este paso no requiere ingredientes nuevos.
          </Txt>
        )}

        {inesperados.length > 0 ? (
          <Columna gap={space.sm}>
            <Etiqueta>La cámara ve además</Etiqueta>
            {inesperados.map((d) => (
              <Pressable
                key={d.ingredientId}
                onPress={() =>
                  setCorrigiendo({ rawLabel: d.rawLabel, shown: nombreDe(d.ingredientId) })
                }
                style={{
                  backgroundColor: theme.color.superficieHundida,
                  borderRadius: radius.md,
                  padding: space.md,
                }}
              >
                <Fila justify="space-between">
                  <Txt variant="cuerpo" color={theme.color.textoSuave}>
                    {nombreDe(d.ingredientId)}
                  </Txt>
                  <Txt variant="chicoFuerte" color={theme.color.acento}>
                    No es eso
                  </Txt>
                </Fila>
              </Pressable>
            ))}
            <Txt variant="chico" color={theme.color.textoSuave}>
              ¿Se equivocó? Decile qué es y no lo vuelve a confundir.
            </Txt>
          </Columna>
        ) : null}

        <Txt variant="chico" color={theme.color.textoTenue}>
          Motor de visión: {detectorName}
        </Txt>
      </ScrollView>

      <IngredientPicker
        visible={corrigiendo !== null}
        title={`¿Qué es en realidad? La cámara dijo "${corrigiendo?.shown ?? ''}"`}
        onSelect={(ingredientId) => {
          if (corrigiendo) correctDetection(corrigiendo.rawLabel, ingredientId);
          setCorrigiendo(null);
        }}
        onClose={() => setCorrigiendo(null)}
      />
    </View>
  );
}
