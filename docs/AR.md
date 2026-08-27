# Guía de mesada / AR (Fase 4)

## La decisión: Viro en lugar de Unity

La especificación proponía **Unity + AR Foundation**, dejando explícitamente
abierta la evaluación al llegar a esta fase, entre (a) Unity embebido en la
app React Native y (b) una app AR separada abierta por deep link.

**Se descartaron las dos y se eligió [ViroReact](https://github.com/ReactVision/viro)**
(`@reactvision/react-viro`), que usa ARKit en iOS y ARCore en Android — el
mismo par de SDKs nativos que envuelve AR Foundation.

### Por qué

1. **El puente a Unity está abandonado.** La opción (a) depende de
   `react-native-unity`, cuya última publicación es de **2022**. Embeber
   Unity hoy significaría mantener nosotros ese puente contra versiones
   nuevas de React Native.
2. **Viro soporta nuestras versiones exactas.** Sus `peerDependencies`
   declaran `expo >=55 <58` y `react-native >=0.83 <0.87`; el proyecto usa
   Expo 57 y RN 0.86.3. Está publicado y mantenido al día.
3. **Unity es desproporcionado para lo que hay que dibujar.** La propia
   especificación dice que los marcadores son "formas geométricas + texto,
   no requiere modelos 3D complejos". Unity agregaría más de 100 MB al
   tamaño de la app y un segundo lenguaje y toolchain para eso.
4. **La opción (b) rompería el modo verificación.** Una app AR separada no
   puede compartir en vivo el estado de la detección de la Fase 2, y sacar
   al usuario de la app a mitad de una receta es mala experiencia.

### Si en el futuro se prefiere Unity

El costo de cambiar está acotado a propósito: la app depende de la interfaz
`ArSession` (`src/ar/types.ts`), no del motor. Toda la lógica de
disposición de marcadores es independiente del backend y está testeada. Un
adapter de Unity solo tendría que implementar esa interfaz.

## Qué funciona hoy, y dónde

La misma estrategia que en las fases anteriores: la función degrada en vez
de romperse.

| | Expo Go / web | Development build |
|---|---|---|
| Guía de mesada 2D (vista cenital) | ✅ funciona | ✅ funciona |
| Recalibración manual | ✅ funciona | ✅ funciona |
| Marcadores anclados sobre la cámara | ❌ cae a la guía 2D | ⏳ requiere integrar Viro |

La **guía 2D no es una maqueta**: usa exactamente la misma disposición de
marcadores que se anclaría en AR, proyectada desde arriba. Muestra dónde va
cada ingrediente del paso, con la misma geometría y los mismos estados.
Sirve como respaldo real donde no hay AR y como mini-mapa dentro de la
vista AR.

## Cómo está armado

```
src/ar/
  types.ts             # contrato ArSession, marcadores, estados de tracking
  markerLayout.ts      # dónde va cada marcador (lógica pura)
  topDownProjection.ts # proyección cenital a coordenadas de pantalla
  viroSession.ts       # adapter de Viro, carga opcional
  index.ts             # elige el backend disponible
```

### Sistema de coordenadas

El estándar de ARKit/ARCore: **+x** a la derecha, **+y** hacia arriba,
**−z** hacia adelante. El origen es el ancla, es decir el punto de la mesada
que el usuario tocó para calibrar.

### Disposición de los marcadores

Los ingredientes del paso se reparten en un **arco** de 35 cm de radio y
100° de apertura frente al ancla — una distancia cómoda de alcanzar sobre
una mesada. Si son más de cuatro, se abre un segundo arco 22 cm más lejos.

Es lógica pura y testeada porque es donde se cuelan los errores que después
son difíciles de diagnosticar: marcadores encimados, fuera de alcance, o
detrás del usuario. Los tests cubren la simetría del arco, que ningún
marcador quede a la espalda, que no se repitan posiciones y que el
desborde a un segundo arco funcione.

En la proyección cenital hubo un error real que los tests atajaron: como
"adelante" ya es **−z** en AR y "arriba" es **−y** en pantalla, invertir el
eje otra vez dejaba los marcadores lejanos abajo. Los dos ejes ya apuntan
en el mismo sentido.

### Modo verificación

`buildMarkers(esperados, detectados)` toma los ingredientes que la Fase 2
reconoció y marca esos marcadores como confirmados (verde). Es lo que pide
la especificación: combinar la guía con la detección para confirmar
visualmente que el ingrediente está en el lugar correcto.

### Recalibración manual

La especificación advierte que el anclaje puede volverse inestable en
mesadas reflectantes o muy uniformes, y pide poder reanclar. El botón
"Recalibrar guía" hace eso. Como las posiciones de los marcadores son
**relativas al ancla**, recalibrar mueve el conjunto sin recalcular la
disposición — hay un test que fija esa propiedad.

## Lo que falta

1. **Integrar Viro de verdad.** Hoy `viroSession.ts` detecta si el módulo
   está presente pero todavía no renderiza la escena AR. Falta montar el
   `ViroARScene` con detección de plano, el hit-test para anclar al tocar y
   los marcadores como geometría + texto.
2. **Probar en condiciones reales**, que es lo que pide la especificación:
   distintas luces, mesadas reflectantes, superficies de colores y texturas
   variadas. Nada de esto se puede validar sin dispositivo.

```bash
npx expo install @reactvision/react-viro
npx expo prebuild
npx expo run:android    # o run:ios
```

Requiere un dispositivo con ARCore (Android) o ARKit (iOS): los emuladores
no sirven para probar AR.
