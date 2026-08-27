import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { StepTimer } from '../components/StepTimer';
import { featureFlags } from '../config/featureFlags';

type Props = NativeStackScreenProps<RootStackParamList, 'CookMode'>;

export function CookModeScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const [stepIndex, setStepIndex] = useState(0);

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>No se encontró la receta.</Text>
      </View>
    );
  }

  const steps = recipe.steps;
  const currentStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  const goToNext = () => {
    if (isLastStep) {
      navigation.goBack();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const goToPrevious = () => {
    if (isFirstStep) return;
    setStepIndex((i) => i - 1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        Paso {currentStep.order} de {steps.length}
      </Text>

      <View style={styles.stepCard}>
        <Text style={styles.stepText}>{currentStep.instruction}</Text>
        {currentStep.timerSeconds ? (
          <StepTimer durationSeconds={currentStep.timerSeconds} />
        ) : null}
      </View>

      <View style={styles.toolsRow}>
        {featureFlags.cameraIngredientDetection ? (
          <Pressable
            style={styles.toolButton}
            onPress={() => navigation.navigate('IngredientCheck', { recipeId, stepIndex })}
          >
            <Text style={styles.toolButtonText}>📷 Verificar ingredientes</Text>
          </Pressable>
        ) : null}
        {featureFlags.voiceAssistant ? (
          <Pressable
            style={styles.toolButton}
            onPress={() => navigation.navigate('VoiceAssistant', { recipeId, stepIndex })}
          >
            <Text style={styles.toolButtonText}>🎙️ Preguntar</Text>
          </Pressable>
        ) : null}
        {featureFlags.arGuidance ? (
          <Pressable
            style={styles.toolButton}
            onPress={() => navigation.navigate('ArGuide', { recipeId, stepIndex })}
          >
            <Text style={styles.toolButtonText}>🎯 Guía de mesada</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.navRow}>
        <Pressable
          style={[styles.navButton, isFirstStep && styles.navButtonDisabled]}
          onPress={goToPrevious}
          disabled={isFirstStep}
        >
          <Text style={styles.navButtonText}>← Anterior</Text>
        </Pressable>
        <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={goToNext}>
          <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
            {isLastStep ? '¡Listo!' : 'Siguiente →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  stepCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
    lineHeight: 34,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  toolButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    marginHorizontal: 4,
    marginBottom: 6,
  },
  toolButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonPrimary: {
    backgroundColor: '#FB8C00',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#616161',
  },
  navButtonTextPrimary: {
    color: '#fff',
  },
});
