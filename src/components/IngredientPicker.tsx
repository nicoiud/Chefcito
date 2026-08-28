import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ingredientCatalog } from '../vision/ingredientCatalog';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { Columna, Fila, Txt } from './ui';

/**
 * Selector de ingrediente, para que el usuario le diga a la app qué es lo
 * que la cámara no reconoció bien.
 *
 * Se filtra sin acentos porque nadie escribe "limón" con tilde apurado y
 * con las manos sucias.
 */
function normalizar(texto: string): string {
  return texto
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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [busqueda, setBusqueda] = useState('');

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return ingredientCatalog;
    return ingredientCatalog.filter(
      (e) =>
        normalizar(e.displayName).includes(q) ||
        e.aliases.some((a) => normalizar(a).includes(q))
    );
  }, [busqueda]);

  const cerrar = () => {
    setBusqueda('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={cerrar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            maxHeight: '80%',
            backgroundColor: theme.color.superficie,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingTop: space.md,
            paddingHorizontal: space.lg,
            paddingBottom: insets.bottom + space.md,
          }}
        >
          {/* Agarradera: señal universal de hoja arrastrable. */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: radius.full,
              backgroundColor: theme.color.borde,
              alignSelf: 'center',
              marginBottom: space.lg,
            }}
          />

          <Columna gap={space.md}>
            <Fila justify="space-between" align="flex-start" gap={space.md}>
              <Txt variant="subtitulo" style={{ flex: 1 }}>
                {title}
              </Txt>
              <Pressable onPress={cerrar} hitSlop={12}>
                <Txt variant="cuerpoFuerte" color={theme.color.textoSuave}>
                  ✕
                </Txt>
              </Pressable>
            </Fila>

            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar ingrediente…"
              placeholderTextColor={theme.color.textoTenue}
              autoCorrect={false}
              style={{
                height: 48,
                borderRadius: radius.full,
                backgroundColor: theme.color.superficieHundida,
                paddingHorizontal: space.lg,
                color: theme.color.texto,
                fontFamily: 'Outfit-Regular',
                fontSize: 16,
              }}
            />
          </Columna>

          <FlatList
            data={resultados}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            style={{ marginTop: space.md }}
            contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
            ListEmptyComponent={
              <Txt
                variant="chico"
                color={theme.color.textoSuave}
                align="center"
                style={{ marginTop: space.xl }}
              >
                No encontramos ese ingrediente.
              </Txt>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.id);
                  setBusqueda('');
                }}
                style={{
                  minHeight: 52,
                  justifyContent: 'center',
                  paddingHorizontal: space.lg,
                  borderRadius: radius.md,
                  backgroundColor: theme.color.superficieHundida,
                }}
              >
                <Txt variant="cuerpo">{item.displayName}</Txt>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
