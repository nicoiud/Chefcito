# Guía AR

## Qué hace

Reconoce los ingredientes del paso sobre la mesada y apoya un marcador
sobre cada uno, en el lugar donde está de verdad.

**No hay paso de calibración.** Apuntás y aparecen. Esto es distinto de
cómo estaba antes: hasta ahora había que encontrar un plano, tocarlo, y
recién ahí aparecía un arco de marcadores calculado con trigonometría, que
no tenía ninguna relación con dónde estaban tus ingredientes.

## Cómo funciona

```
ViroObjectDetector (YOLOE sobre la cámara de la AR)
        │  detección: etiqueta + caja en pantalla
        ▼
useDetectionAnchors
        │  1. traduce la etiqueta al id del catálogo (+ correcciones del usuario)
        │  2. filtra: solo los ingredientes de este paso
        │  3. ¿se movió lo suficiente? → performARHitTestWithPoint(centro)
        ▼
DetectionAnchorStore
        │  suaviza la posición, la recuerda unos segundos
        ▼
ArMarkersScene  → dibuja el marcador en esa posición del mundo
```

### La pieza clave: una sola cámara

En Android no se pueden abrir dos sesiones de cámara a la vez. Por eso esto
**no** se puede hacer con una librería de cámara aparte corriendo en
paralelo a la AR: `ViroObjectDetector` comparte el feed del
`ViroARSceneNavigator` que lo contiene. Es la razón por la que el detector
es de Viro y no de otro lado.

### De la caja 2D a la posición 3D

El detector devuelve una caja en coordenadas de pantalla. `performARHitTestWithPoint(x, y)`
dispara un rayo desde ese punto contra el mundo reconstruido por ARCore y
devuelve dónde pega.

De los impactos que devuelve, no todos valen igual: un plano ya detectado
es una superficie estable, un `FeaturePoint` es un punto suelto de la nube
que baila con cada cuadro. `pickBestHit` los prioriza. Anclar en el primero
de la lista es la diferencia entre un marcador quieto y uno que tiembla.

### Por qué no se reproyecta en cada cuadro

El hit test es asíncrono y cuesta. `DetectionAnchorStore` solo lo pide
cuando la caja se movió más de 24 px; si no, reusa la posición anterior.
Y cuando llega una posición nueva, la mezcla con la vieja (promedio
exponencial) en vez de reemplazarla, para que el marcador no pegue saltos.

Un ancla sobrevive 4 segundos sin volver a verse: tapar la cebolla con la
mano no tiene que hacer desaparecer el marcador.

## Estados y qué le decimos al usuario

Cada estado de seguimiento tiene un mensaje que dice **qué hacer**, no solo
qué pasa. "Se perdió el seguimiento" no le sirve a nadie; "prendé una luz"
o "movés más despacio" sí. Hay un test que exige que ningún estado quede
sin mensaje accionable.

## Requisitos, y qué pasa si faltan

| Falta | Qué hace la app |
| --- | --- |
| Permiso de cámara | Lo pide, explicando para qué |
| ARCore en el dispositivo | Lo dice y va a la guía 2D |
| El módulo nativo (Expo Go) | Guía 2D |
| El modelo .onnx | AR sin reconocimiento, avisa |

La guía 2D muestra una **disposición sugerida** en un plano cenital. No
pretende ser lo que hay en tu mesada: es la misma información de otra
forma, para que la app siga siendo útil sin AR.

## Limitación conocida

En Android la AR ve el **~55-60% central** del campo vertical. Lo que esté
en los bordes no se detecta. Es del componente, no de nuestro código.

## Por qué Viro y no Unity

Unity habría significado un runtime aparte, licencia, y un pipeline de
build separado para meter una escena 3D dentro de una app React Native. Viro
es un set de componentes React que hablan con ARCore/ARKit directo, sin
runtime extra. Y trae el detector de objetos integrado sobre la misma
cámara, que es justo lo que esta app necesita.
