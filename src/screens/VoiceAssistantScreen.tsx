import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recipes } from '../data/recipes';
import { useAssistant } from '../assistant/useAssistant';
import { useSpeechToText } from '../assistant/useSpeechToText';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceAssistant'>;

const SUGGESTIONS = ['¿Qué ingredientes lleva?', '¿Cuál era el paso?', '¿Cuánto falta?'];

export function VoiceAssistantScreen({ route }: Props) {
  const { recipeId, stepIndex } = route.params;
  const recipe = recipes.find((r) => r.id === recipeId);

  const context = useMemo(
    () => (recipe ? { recipe, stepIndex } : null),
    [recipe, stepIndex]
  );

  if (!context) {
    return (
      <View style={styles.center}>
        <Text>No se encontró la receta.</Text>
      </View>
    );
  }

  return <AssistantView context={context} />;
}

function AssistantView({
  context,
}: {
  context: { recipe: (typeof recipes)[number]; stepIndex: number };
}) {
  const { messages, ask, isLoading, error, remaining, limit } = useAssistant(context);
  const speech = useSpeechToText();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (speech.transcript) setDraft(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const submit = (question: string) => {
    ask(question);
    setDraft('');
    speech.clearTranscript();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.quotaBar}>
        <Text style={styles.quotaText}>
          Te quedan {remaining} de {limit} preguntas hoy
        </Text>
        <Text style={styles.quotaHint}>Las preguntas sobre la receta no consumen cupo</Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Preguntame mientras cocinás 🎙️</Text>
            <Text style={styles.emptyText}>
              Podés preguntar por los ingredientes, repetir el paso actual o hacer una
              consulta abierta de cocina.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={styles.suggestionChip}
                  onPress={() => submit(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
            ]}
          >
            <Text
              style={message.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}
            >
              {message.text}
            </Text>
            {message.answeredLocally ? (
              <Text style={styles.localBadge}>Respondido sin conexión · sin costo</Text>
            ) : null}
          </View>
        ))}

        {isLoading ? <ActivityIndicator style={styles.loader} color="#FB8C00" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.inputBar}>
        {speech.isAvailable ? (
          <Pressable
            style={[styles.micButton, speech.isListening && styles.micButtonActive]}
            onPressIn={speech.startListening}
            onPressOut={speech.stopListening}
          >
            <Text style={styles.micIcon}>{speech.isListening ? '🔴' : '🎙️'}</Text>
          </Pressable>
        ) : null}

        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={
            speech.isAvailable ? 'Mantené el micrófono o escribí…' : 'Escribí tu pregunta…'
          }
          placeholderTextColor="#BDBDBD"
          onSubmitEditing={() => submit(draft)}
          returnKeyType="send"
        />

        <Pressable
          style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
          onPress={() => submit(draft)}
          disabled={!draft.trim()}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </Pressable>
      </View>

      {!speech.isAvailable ? (
        <Text style={styles.sttNote}>
          El dictado por voz requiere un development build. Mientras tanto podés escribir.
        </Text>
      ) : null}
      {speech.error ? <Text style={styles.error}>{speech.error}</Text> : null}
    </KeyboardAvoidingView>
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
  },
  quotaBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  quotaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
  },
  quotaHint: {
    fontSize: 11,
    color: '#EF6C00',
    marginTop: 2,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  suggestions: {
    marginTop: 20,
    alignItems: 'center',
  },
  suggestionChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#424242',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#FB8C00',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  bubbleTextUser: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextAssistant: {
    color: '#212121',
    fontSize: 15,
    lineHeight: 21,
  },
  localBadge: {
    marginTop: 6,
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '600',
  },
  loader: {
    marginTop: 8,
  },
  error: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#fff',
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  micButtonActive: {
    backgroundColor: '#FFCDD2',
  },
  micIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#212121',
  },
  sendButton: {
    marginLeft: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: '#FB8C00',
  },
  sendButtonDisabled: {
    backgroundColor: '#FFCC80',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  sttNote: {
    fontSize: 11,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
});
