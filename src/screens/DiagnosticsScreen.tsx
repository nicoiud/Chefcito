import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeModules } from 'react-native';
import { getIngredientDetector } from '../vision';
import { getModelCoveredIngredients } from '../vision/tfliteDetector';
import { getArSession } from '../ar';
import { featureFlags } from '../config/featureFlags';
import { isAssistantBackendConfigured, ASSISTANT_API_URL } from '../config/env';
import { getDisplayName } from '../vision/ingredientCatalog';

/**
 * Pantalla de diagnóstico.
 *
 * Existe para poder depurar en un dispositivo real sin cable ni logcat: dice
 * qué módulos nativos encontró la app y qué motor está usando cada fase.
 * Cuando algo no anda, una captura de esta pantalla suele alcanzar para
 * saber si falta un módulo, si el modelo no cargó o si el problema es otro.
 */

interface Row {
  label: string;
  value: string;
  ok: boolean | null;
}

function useDiagnostics(): Row[] {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const detector = getIngredientDetector();
    const ar = getArSession();
    const usingRealModel = detector.requiresPixels;

    setRows([
      { label: 'Plataforma', value: `${Platform.OS} ${Platform.Version}`, ok: null },
      {
        label: 'Motor de visión',
        value: detector.name,
        ok: usingRealModel,
      },
      {
        label: 'Runtime TFLite nativo',
        value: NativeModules.Tflite || (global as any).__loadTensorflowModel
          ? 'presente'
          : 'ausente (detector simulado)',
        ok: usingRealModel,
      },
      {
        label: 'Módulo nativo de Viro',
        value: NativeModules.VRTARSceneNavigatorModule ? 'presente' : 'ausente (guía 2D)',
        ok: Boolean(NativeModules.VRTARSceneNavigatorModule),
      },
      {
        label: 'Motor AR',
        value: ar ? ar.name : 'no disponible',
        ok: ar !== null,
      },
      {
        label: 'Backend del asistente',
        value: isAssistantBackendConfigured() ? ASSISTANT_API_URL : 'sin configurar',
        ok: isAssistantBackendConfigured(),
      },
      {
        label: 'Flags activos',
        value: Object.entries(featureFlags)
          .filter(([, on]) => on)
          .map(([name]) => name)
          .join(', '),
        ok: null,
      },
      {
        label: 'Ingredientes que cubre el modelo',
        value: getModelCoveredIngredients().map(getDisplayName).join(', '),
        ok: null,
      },
    ]);
  }, []);

  return rows;
}

export function DiagnosticsScreen() {
  const rows = useDiagnostics();
  const [copied, setCopied] = useState(false);

  const asText = rows.map((r) => `${r.label}: ${r.value}`).join('\n');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Si algo no funciona en el celular, sacá una captura de esta pantalla: dice qué
        módulos nativos encontró la app.
      </Text>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <View style={styles.rowValueBox}>
            {row.ok !== null ? (
              <Text style={styles.rowIcon}>{row.ok ? '✅' : '⚠️'}</Text>
            ) : null}
            <Text style={[styles.rowValue, row.ok === false && styles.rowValueWarn]}>
              {row.value || '—'}
            </Text>
          </View>
        </View>
      ))}

      <Pressable style={styles.copyBox} onPress={() => setCopied(true)}>
        <Text style={styles.copyTitle}>
          {copied ? 'Texto para copiar 👇' : 'Ver como texto plano'}
        </Text>
        {copied ? <Text selectable style={styles.copyText}>{asText}</Text> : null}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 13, color: '#616161', lineHeight: 19, marginBottom: 20 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  rowLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '700', textTransform: 'uppercase' },
  rowValueBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  rowIcon: { fontSize: 13, marginRight: 6 },
  rowValue: { fontSize: 14, color: '#212121', flex: 1 },
  rowValueWarn: { color: '#EF6C00' },
  copyBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ECEFF1',
  },
  copyTitle: { fontSize: 13, fontWeight: '700', color: '#455A64' },
  copyText: {
    marginTop: 10,
    fontSize: 11,
    color: '#37474F',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
});
