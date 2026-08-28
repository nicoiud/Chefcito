import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { useAssistant } from '../assistant/useAssistant';
import { useSpeechToText } from '../assistant/useSpeechToText';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { Columna, Fila, Progreso, Txt } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceAssistant'>;

const SUGERENCIAS = ['¿Qué ingredientes lleva?', '¿Cuál era el paso?', '¿Cuánto falta?'];

export function VoiceAssistantScreen({ route }: Props) {
  const { recipeId, stepIndex } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);
  const context = useMemo(() => (recipe ? { recipe, stepIndex } : null), [recipe, stepIndex]);

  if (!context) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt>No se encontró la receta.</Txt>
      </View>
    );
  }
  return <Asistente context={context} />;
}

function Asistente({
  context,
}: {
  context: { recipe: (typeof recipes)[number]; stepIndex: number };
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, ask, isLoading, error, remaining, limit } = useAssistant(context);
  const speech = useSpeechToText();
  const [borrador, setBorrador] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (speech.transcript) setBorrador(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const enviar = (pregunta: string) => {
    ask(pregunta);
    setBorrador('');
    speech.clearTranscript();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.color.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Cupo: se muestra como barra porque "cuánto me queda" se entiende
          mejor viendo que leyendo un número. */}
      <View
        style={{
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.color.borde,
        }}
      >
        <Columna gap={space.sm}>
          <Fila justify="space-between">
            <Txt variant="chicoFuerte">
              {remaining} de {limit} preguntas abiertas
            </Txt>
            <Txt variant="chico" color={theme.color.textoSuave}>
              se renueva mañana
            </Txt>
          </Fila>
          <Progreso valor={remaining / limit} />
          <Txt variant="chico" color={theme.color.textoSuave}>
            Lo que está en la receta se responde sin gastar cupo.
          </Txt>
        </Columna>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
      >
        {messages.length === 0 ? (
          <Columna gap={space.lg} style={{ marginTop: space.xl }}>
            <Columna gap={space.sm}>
              <Txt style={{ fontSize: 40, lineHeight: 48 }}>🎙</Txt>
              <Txt variant="titulo">Preguntame mientras cocinás</Txt>
              <Txt variant="cuerpo" color={theme.color.textoSuave}>
                Podés preguntar por los ingredientes, repetir el paso, o hacer una consulta
                abierta de cocina.
              </Txt>
            </Columna>
            <Columna gap={space.sm}>
              {SUGERENCIAS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => enviar(s)}
                  style={{
                    backgroundColor: theme.color.superficie,
                    borderWidth: 1,
                    borderColor: theme.color.borde,
                    borderRadius: radius.md,
                    padding: space.md,
                  }}
                >
                  <Txt variant="cuerpo">{s}</Txt>
                </Pressable>
              ))}
            </Columna>
          </Columna>
        ) : null}

        {messages.map((m) => {
          const mio = m.role === 'user';
          return (
            <View
              key={m.id}
              style={{
                maxWidth: '88%',
                alignSelf: mio ? 'flex-end' : 'flex-start',
                backgroundColor: mio ? theme.color.acento : theme.color.superficie,
                borderWidth: mio ? 0 : 1,
                borderColor: theme.color.borde,
                borderRadius: radius.lg,
                borderBottomRightRadius: mio ? radius.sm : radius.lg,
                borderBottomLeftRadius: mio ? radius.lg : radius.sm,
                padding: space.md,
              }}
            >
              <Txt variant="cuerpo" color={mio ? theme.color.textoSobreAcento : theme.color.texto}>
                {m.text}
              </Txt>
              {m.answeredLocally ? (
                <Txt variant="chico" color={theme.color.exito} style={{ marginTop: space.xs }}>
                  Sin conexión · sin costo
                </Txt>
              ) : null}
            </View>
          );
        })}

        {isLoading ? <ActivityIndicator color={theme.color.acento} /> : null}
        {error ? (
          <View
            style={{
              backgroundColor: theme.color.alertaTenue,
              borderRadius: radius.md,
              padding: space.md,
            }}
          >
            <Txt variant="chico" color={theme.color.alerta}>
              {error}
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          padding: space.md,
          paddingBottom: insets.bottom + space.md,
          borderTopWidth: 1,
          borderTopColor: theme.color.borde,
          backgroundColor: theme.color.superficie,
        }}
      >
        {speech.isAvailable ? (
          <Pressable
            onPressIn={speech.startListening}
            onPressOut={speech.stopListening}
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.full,
              backgroundColor: speech.isListening
                ? theme.color.acento
                : theme.color.superficieHundida,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt style={{ fontSize: 18, lineHeight: 22 }}>🎙</Txt>
          </Pressable>
        ) : null}

        <TextInput
          value={borrador}
          onChangeText={setBorrador}
          placeholder={speech.isAvailable ? 'Mantené el micrófono o escribí…' : 'Escribí tu pregunta…'}
          placeholderTextColor={theme.color.textoTenue}
          onSubmitEditing={() => enviar(borrador)}
          returnKeyType="send"
          style={{
            flex: 1,
            height: 48,
            borderRadius: radius.full,
            backgroundColor: theme.color.superficieHundida,
            paddingHorizontal: space.lg,
            color: theme.color.texto,
            fontFamily: 'Outfit-Regular',
            fontSize: 16,
          }}
        />

        <Pressable
          onPress={() => enviar(borrador)}
          disabled={!borrador.trim()}
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.full,
            backgroundColor: theme.color.acento,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: borrador.trim() ? 1 : 0.4,
          }}
        >
          <Txt color={theme.color.textoSobreAcento} variant="cuerpoFuerte">
            ↑
          </Txt>
        </Pressable>
      </View>

      {!speech.isAvailable ? (
        <Txt
          variant="chico"
          color={theme.color.textoTenue}
          align="center"
          style={{ paddingBottom: insets.bottom + space.sm, paddingHorizontal: space.lg }}
        >
          El dictado por voz necesita un development build. Por ahora, escribí.
        </Txt>
      ) : null}
    </KeyboardAvoidingView>
  );
}
