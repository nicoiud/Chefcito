import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { TOUCH_MIN, radius, sombra, space, type } from '../theme/tokens';

/**
 * Componentes base del sistema de diseño.
 *
 * Existen para que las pantallas no vuelvan a definir botones y tarjetas
 * cada una a su manera, que es como se degrada un diseño con el tiempo.
 * Todos leen del tema, así que el modo oscuro sale gratis.
 */

/* ------------------------------------------------------------------ Texto */

type TypeKey = keyof typeof type;

interface TxtProps {
  variant?: TypeKey;
  color?: string;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function Txt({
  variant = 'cuerpo',
  color,
  align,
  numberOfLines,
  style,
  children,
}: TxtProps) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        type[variant] as TextStyle,
        { color: color ?? theme.color.texto },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Encabezado de sección en versalitas. */
export function Etiqueta({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Txt variant="etiqueta" color={theme.color.textoSuave}>
      {children}
    </Txt>
  );
}

/* ----------------------------------------------------------------- Botón */

type BotonVariant = 'primario' | 'secundario' | 'fantasma';

interface BotonProps {
  onPress: () => void;
  variant?: BotonVariant;
  disabled?: boolean;
  cargando?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Boton({
  onPress,
  variant = 'primario',
  disabled,
  cargando,
  full,
  style,
  children,
}: BotonProps) {
  const theme = useTheme();
  const inactivo = disabled || cargando;

  const fondo =
    variant === 'primario'
      ? theme.color.acento
      : variant === 'secundario'
        ? theme.color.acentoTenue
        : 'transparent';

  const texto =
    variant === 'primario' ? theme.color.textoSobreAcento : theme.color.acento;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
      style={({ pressed }) => [
        {
          minHeight: TOUCH_MIN,
          paddingHorizontal: space.xl,
          borderRadius: radius.full,
          backgroundColor: fondo,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          opacity: inactivo ? 0.45 : pressed ? 0.86 : 1,
          borderWidth: variant === 'fantasma' ? 1.5 : 0,
          borderColor: theme.color.borde,
        },
        full ? { alignSelf: 'stretch' } : null,
        variant === 'primario' && !inactivo ? sombra(theme, 1) : null,
        style,
      ]}
    >
      {cargando ? <ActivityIndicator color={texto} size="small" /> : null}
      <Txt variant="boton" color={texto}>
        {children}
      </Txt>
    </Pressable>
  );
}

/* --------------------------------------------------------------- Tarjeta */

export function Tarjeta({
  onPress,
  style,
  children,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.color.superficie,
    borderRadius: radius.lg,
    borderWidth: theme.dark ? 1 : 0,
    borderColor: theme.color.borde,
    padding: space.lg,
    ...sombra(theme, 1),
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.color.superficieHundida }}
      style={({ pressed }) => [base, pressed ? { opacity: 0.9 } : null, style]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Chip */

export type ChipTono = 'neutro' | 'acento' | 'exito' | 'alerta';

export function Chip({
  tono = 'neutro',
  children,
  style,
}: {
  tono?: ChipTono;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const mapa = {
    neutro: [theme.color.superficieHundida, theme.color.textoSuave],
    acento: [theme.color.acentoTenue, theme.color.acento],
    exito: [theme.color.exitoTenue, theme.color.exito],
    alerta: [theme.color.alertaTenue, theme.color.alerta],
  } as const;
  const [fondo, texto] = mapa[tono];

  return (
    <View
      style={[
        {
          backgroundColor: fondo,
          borderRadius: radius.full,
          paddingHorizontal: space.md,
          paddingVertical: 5,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Txt variant="chicoFuerte" color={texto}>
        {children}
      </Txt>
    </View>
  );
}

/* --------------------------------------------------------------- Layouts */

export function Fila({
  gap = space.sm,
  align = 'center',
  justify,
  wrap,
  style,
  children,
}: {
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Columna({
  gap = space.md,
  style,
  children,
}: {
  gap?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

/** Línea divisoria de un pelo. */
export function Separador() {
  const theme = useTheme();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.color.borde }} />
  );
}

/* ------------------------------------------------------------ Indicadores */

/**
 * Barra de progreso del paso. Es el único indicador de avance en modo
 * cocinar: reemplaza al texto "paso 3 de 7" como señal principal porque se
 * entiende de un vistazo, sin leer.
 */
export function Progreso({ valor }: { valor: number }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, valor));
  return (
    <View
      style={{
        height: 6,
        borderRadius: radius.full,
        backgroundColor: theme.color.superficieHundida,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: theme.color.acento,
        }}
      />
    </View>
  );
}
