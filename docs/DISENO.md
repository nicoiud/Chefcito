# Sistema de diseño

## Por qué existe

Las primeras pantallas se hicieron cada una a su manera: cada botón con
su padding, cada color escrito a mano. Eso se degrada rápido y no hay
forma de agregar modo oscuro después. Ahora todo sale de
`src/theme/tokens.ts` y `src/components/ui.tsx`.

## Decisiones

**El contexto manda.** Chefcito se usa con las manos ocupadas, sucias, y
mirando el celular de lejos apoyado en la mesada. De ahí salen casi
todas las decisiones:

- Área táctil mínima de 52 px (`TOUCH_MIN`), más que los 44 de Apple y
  los 48 de Material, porque se toca de refilón y con el dorso del dedo.
- La instrucción del paso usa la variante tipográfica `paso`, grande, y
  queda **anclada arriba**: cambia de largo entre pasos, pero siempre
  empieza a la misma altura, así el ojo no la busca de nuevo.
- El avance se lee como barra, no como texto: "cuánto falta" se entiende
  de un vistazo mucho mejor leyendo una barra que un "3 de 7".
- Los controles van abajo, al alcance del pulgar.

**Paleta con nombres de cocina.** `hierro`, `brasa`, `hierba` en vez de
`gray-900` o `primary`. El acento es `#E2551E`, un bermellón de brasa,
elegido a propósito para no ser el naranja de Material: la app tiene que
parecer suya, no una plantilla.

**Tipografía en dos voces.** Bricolage Grotesque para títulos (tiene
carácter, se banca tamaños grandes) y Outfit para texto y controles
(es geométrica y muy legible en chico). Las 6 variantes van embebidas en
`assets/fonts/` — 364 KB en total — así no hay pedido de red ni salto de
fuente al abrir.

**Modo oscuro gratis.** Ningún componente escribe un color literal:
todos leen de `useTheme()`, que sigue a `useColorScheme()` del sistema.
Los dos temas están verificados con capturas.

## Cómo usarlo

```tsx
import { Boton, Txt, Tarjeta, Chip } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { space, radius } from '../theme/tokens';
```

- `Txt variant="titulo|subtitulo|paso|cuerpo|chico|etiqueta|numero"`
- `Boton variant="primario|secundario|fantasma"`
- `Tarjeta`, `Chip tono="neutro|acento|exito|alerta"`, `Progreso valor={0..1}`
- Layout: `Fila`, `Columna`, `Separador`

Regla simple: si una pantalla necesita un color o un espaciado que no
está en los tokens, primero se agrega al token, no a la pantalla.
