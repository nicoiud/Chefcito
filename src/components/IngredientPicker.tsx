import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ingredientCatalog } from '../vision/ingredientCatalog';

/**
 * Selector de ingrediente, para que el usuario le diga a la app qué es lo
 * que la cámara no reconoció bien.
 *
 * Se filtra sin acentos porque nadie escribe "limón" con tilde apurado y
 * con las manos sucias.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface IngredientPickerProps {
  visible: boolean;
  title: string;
  onSelect: (ingredientId: string) => void;
  onClose: () => void;
}

export function IngredientPicker({
  visible,
  title,
  onSelect,
  onClose,
}: IngredientPickerProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return ingredientCatalog;
    return ingredientCatalog.filter(
      (entry) =>
        normalize(entry.displayName).includes(q) ||
        entry.aliases.some((alias) => normalize(alias).includes(q))
    );
  }, [query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={close} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ingrediente…"
            placeholderTextColor="#BDBDBD"
            autoCorrect={false}
          />

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>
                No encontramos ese ingrediente en la lista.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onSelect(item.id);
                  setQuery('');
                }}
              >
                <Text style={styles.optionText}>{item.displayName}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#212121' },
  close: { fontSize: 18, color: '#9E9E9E', paddingHorizontal: 4 },
  search: {
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#212121',
    marginBottom: 8,
  },
  option: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionText: { fontSize: 15, color: '#212121' },
  empty: { textAlign: 'center', color: '#9E9E9E', marginTop: 24, fontSize: 14 },
});
