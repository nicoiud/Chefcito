/**
 * Sistema de diseño de Chefcito.
 *
 * La dirección visual sale de las condiciones reales de uso, no de una
 * paleta bonita en abstracto. Alguien cocinando tiene el celular apoyado a
 * medio metro, las manos ocupadas o sucias, y la luz de la cocina puede ser
 * cualquier cosa. Eso impone tres reglas duras:
 *
 *  1. **Contraste alto.** Se lee de lejos y con reflejos.
 *  2. **Áreas de toque grandes.** Se toca con el canto del dedo o el nudillo.
 *  3. **Modo oscuro de verdad.** Se cocina de noche.
 *
 * La paleta es de cocina, pero de la cocina real: el carbón de una sartén
 * de hierro, la brasa, el verde de las hierbas. Se evitó el naranja de
 * material design por genérico; el acento es un bermellón de brasa, más
 * saturado y más propio.
 */

const palette = {
  // Neutros cálidos, con sesgo hacia el acento para que no se vean sucios.
  hierro900: '#171310',
  hierro800: '#231C17',
  hierro700: '#332A23',
  hierro500: '#6B5C50',
  hierro300: '#A99A8D',
  hierro200: '#D8CEC4',
  hierro100: '#EDE6DE',
  hierro50: '#FBF8F4',
  blanco: '#FFFFFF',

  // Acento: brasa. Más profundo y saturado que el naranja genérico.
  brasa: '#E2551E',
  brasaOscura: '#B23F12',
  brasaClara: '#FF7A47',
  brasaTenue: '#FCEBE2',
  brasaTenueOscura: '#2E1A11',

  // Semánticos, separados del acento a propósito.
  hierba: '#2D7A4B',
  hierbaClara: '#5FBE84',
  hierbaTenue: '#E4F2E9',
  hierbaTenueOscura: '#132417',

  alerta: '#B4690E',
  alertaTenue: '#FBF0DD',

  peligro: '#C0341D',
  peligroClaro: '#F0836C',
} as const;

export interface Theme {
  dark: boolean;
  color: {
    /** Fondo de la pantalla. */
    fondo: string;
    /** Superficie elevada: tarjetas, hojas. */
    superficie: string;
    /** Superficie hundida: campos, chips inactivos. */
    superficieHundida: string;
    borde: string;
    bordeFuerte: string;

    texto: string;
    textoSuave: string;
    textoTenue: string;
    /** Texto sobre el acento. */
    textoSobreAcento: string;

    acento: string;
    acentoFuerte: string;
    acentoTenue: string;

    exito: string;
    exitoTenue: string;
    alerta: string;
    alertaTenue: string;
    peligro: string;

    /** Velo sobre la cámara, para que el texto se lea sobre cualquier imagen. */
    veloCamara: string;
  };
}

export const lightTheme: Theme = {
  dark: false,
  color: {
    fondo: palette.hierro50,
    superficie: palette.blanco,
    superficieHundida: palette.hierro100,
    borde: palette.hierro200,
    bordeFuerte: palette.hierro300,

    texto: palette.hierro900,
    textoSuave: palette.hierro500,
    textoTenue: palette.hierro300,
    textoSobreAcento: palette.blanco,

    acento: palette.brasa,
    acentoFuerte: palette.brasaOscura,
    acentoTenue: palette.brasaTenue,

    exito: palette.hierba,
    exitoTenue: palette.hierbaTenue,
    alerta: palette.alerta,
    alertaTenue: palette.alertaTenue,
    peligro: palette.peligro,

    veloCamara: 'rgba(23, 19, 16, 0.55)',
  },
};

export const darkTheme: Theme = {
  dark: true,
  color: {
    fondo: palette.hierro900,
    superficie: palette.hierro800,
    superficieHundida: palette.hierro700,
    borde: palette.hierro700,
    bordeFuerte: palette.hierro500,

    texto: palette.hierro50,
    textoSuave: palette.hierro300,
    textoTenue: palette.hierro500,
    textoSobreAcento: palette.blanco,

    acento: palette.brasaClara,
    acentoFuerte: palette.brasa,
    acentoTenue: palette.brasaTenueOscura,

    exito: palette.hierbaClara,
    exitoTenue: palette.hierbaTenueOscura,
    alerta: '#E0A45C',
    alertaTenue: '#2A2116',
    peligro: palette.peligroClaro,

    veloCamara: 'rgba(0, 0, 0, 0.62)',
  },
};

/** Familias tipográficas. Se cargan en App.tsx antes de renderizar. */
export const fonts = {
  /** Bricolage Grotesque: grotesca con carácter, para títulos. */
  display: 'BricolageGrotesque-Bold',
  displaySemi: 'BricolageGrotesque-SemiBold',
  /** Outfit: geométrica neutra y muy legible, para todo lo demás. */
  cuerpo: 'Outfit-Regular',
  cuerpoMedio: 'Outfit-Medium',
  cuerpoSemi: 'Outfit-SemiBold',
  cuerpoBold: 'Outfit-Bold',
} as const;

/**
 * Escala tipográfica. Los tamaños de "cocinar" son deliberadamente grandes:
 * esa pantalla se lee a medio metro de distancia.
 */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
  titulo: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  subtitulo: { fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  /** Instrucción del paso en modo cocinar: se lee de lejos. */
  paso: { fontFamily: fonts.cuerpoSemi, fontSize: 26, lineHeight: 34, letterSpacing: -0.3 },
  cuerpo: { fontFamily: fonts.cuerpo, fontSize: 16, lineHeight: 23 },
  cuerpoFuerte: { fontFamily: fonts.cuerpoSemi, fontSize: 16, lineHeight: 23 },
  chico: { fontFamily: fonts.cuerpo, fontSize: 14, lineHeight: 20 },
  chicoFuerte: { fontFamily: fonts.cuerpoMedio, fontSize: 14, lineHeight: 20 },
  /** Etiquetas en versalitas, para encabezados de sección. */
  etiqueta: {
    fontFamily: fonts.cuerpoSemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  boton: { fontFamily: fonts.cuerpoSemi, fontSize: 16, lineHeight: 20, letterSpacing: 0.1 },
  numero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.5 },
} as const;

/** Espaciado en múltiplos de 4. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

/**
 * Altura mínima de cualquier control. Más que el mínimo de accesibilidad
 * habitual (44) porque acá se toca con las manos ocupadas.
 */
export const TOUCH_MIN = 52;

export function sombra(theme: Theme, nivel: 1 | 2 = 1) {
  // En oscuro la sombra no se ve: la elevación la da el borde.
  if (theme.dark) return {};
  return nivel === 1
    ? {
        shadowColor: palette.hierro900,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }
    : {
        shadowColor: palette.hierro900,
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      };
}
