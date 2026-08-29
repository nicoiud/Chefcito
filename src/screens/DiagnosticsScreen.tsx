import React, { useEffect, useState } from 'react';
import { NativeModules, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getIngredientDetector } from '../vision';
import { getModelCoveredIngredients } from '../vision/tfliteDetector';
import { getDisplayName } from '../vision/ingredientCatalog';
import { getArSession } from '../ar';
import { featureFlags } from '../config/featureFlags';
import { isAssistantBackendConfigured, ASSISTANT_API_URL } from '../config/env';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { Chip, Columna, Etiqueta, Fila, Txt } from '../components/ui';

/**
 * Pantalla de diagnóstico.
 *
 * Existe para poder depurar en un dispositivo real sin cable ni logcat: dice
 * qué módulos nativos encontró la app y qué motor usa cada fase. Cuando algo
 * no anda, una captura de acá suele alcanzar.
 */
interface FilaDiag {
  label: string;
  valor: string;
  ok: boolean | null;
}

/**
 * ARCore se consulta aparte porque la respuesta es asíncrona: dice si el
 * celular soporta AR de verdad, no solo si la librería está compilada.
 */
function useSoporteAr(): string {
  const [texto, setTexto] = useState('consultando…');

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const viro = require('@reactvision/react-viro');
        if (typeof viro.isARSupportedOnDevice !== 'function') {
          if (vigente) setTexto('no disponible en este build');
          return;
        }
        const r = await viro.isARSupportedOnDevice();
        if (vigente) setTexto(r?.isARSupported ? 'soportado' : 'no soportado por el dispositivo');
      } catch (e) {
        if (vigente) setTexto(`error: ${String(e)}`);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  return texto;
}

function useDiagnostico(): FilaDiag[] {
  const [filas, setFilas] = useState<FilaDiag[]>([]);

  useEffect(() => {
    const detector = getIngredientDetector();
    const ar = getArSession();
    const modeloReal = detector.requiresPixels;

    setFilas([
      { label: 'Plataforma', valor: `${Platform.OS} ${Platform.Version}`, ok: null },
      { label: 'Motor de visión', valor: detector.name, ok: modeloReal },
      {
        label: 'Runtime TFLite nativo',
        valor: modeloReal ? 'presente' : 'ausente (detector simulado)',
        ok: modeloReal,
      },
      {
        label: 'Módulo nativo de Viro',
        valor: NativeModules.VRTARSceneNavigatorModule ? 'presente' : 'ausente (guía 2D)',
        ok: Boolean(NativeModules.VRTARSceneNavigatorModule),
      },
      { label: 'Motor AR', valor: ar ? ar.name : 'no disponible', ok: ar !== null },
      {
        label: 'Backend del asistente',
        valor: isAssistantBackendConfigured() ? ASSISTANT_API_URL : 'sin configurar',
        ok: isAssistantBackendConfigured(),
      },
      {
        label: 'Flags activos',
        valor: Object.entries(featureFlags)
          .filter(([, on]) => on)
          .map(([n]) => n)
          .join(', '),
        ok: null,
      },
      {
        label: 'Ingredientes que cubre el modelo',
        valor: getModelCoveredIngredients().map(getDisplayName).join(', '),
        ok: null,
      },
    ]);
  }, []);

  return filas;
}

export function DiagnosticsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const base = useDiagnostico();
  const soporteAr = useSoporteAr();

  // Se inserta justo debajo del motor de AR, que es donde se lo busca.
  const filas: FilaDiag[] = base.flatMap((f) =>
    f.label === 'Motor AR'
      ? [f, { label: 'ARCore en el dispositivo', valor: soporteAr, ok: soporteAr === 'soportado' }]
      : [f]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.color.fondo }}
      contentContainerStyle={{
        padding: space.lg,
        paddingBottom: insets.bottom + space.xxl,
        gap: space.md,
      }}
    >
      <Txt variant="cuerpo" color={theme.color.textoSuave}>
        Si algo no funciona en el celular, sacá una captura de esta pantalla: dice qué
        módulos nativos encontró la app.
      </Txt>

      {filas.map((f) => (
        <View
          key={f.label}
          style={{
            backgroundColor: theme.color.superficie,
            borderWidth: 1,
            borderColor: theme.color.borde,
            borderRadius: radius.md,
            padding: space.md,
            gap: space.xs,
          }}
        >
          <Fila justify="space-between" align="center">
            <Etiqueta>{f.label}</Etiqueta>
            {f.ok !== null ? (
              <Chip tono={f.ok ? 'exito' : 'alerta'}>{f.ok ? 'OK' : 'falta'}</Chip>
            ) : null}
          </Fila>
          <Txt
            variant="cuerpo"
            color={f.ok === false ? theme.color.alerta : theme.color.texto}
          >
            {f.valor || '—'}
          </Txt>
        </View>
      ))}

      <Columna gap={space.sm} style={{ marginTop: space.md }}>
        <Etiqueta>Como texto</Etiqueta>
        <View
          style={{
            backgroundColor: theme.color.superficieHundida,
            borderRadius: radius.md,
            padding: space.md,
          }}
        >
          <Txt variant="chico" color={theme.color.textoSuave} style={{ lineHeight: 19 }}>
            {filas.map((f) => `${f.label}: ${f.valor}`).join('\n')}
          </Txt>
        </View>
      </Columna>
    </ScrollView>
  );
}
