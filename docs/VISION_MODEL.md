# Modelo de visión (Fase 2)

## Qué se distribuye hoy

`assets/models/yolov8n-coco-320-w8a32.tflite` — 3,2 MB.

YOLOv8n pre-entrenado en COCO, exportado a LiteRT/TFLite con cuantización
INT8 dinámica, entrada 320×320.

| Propiedad | Valor |
|---|---|
| Arquitectura | YOLOv8n (nano) |
| Entrenamiento | COCO, 80 clases (pre-entrenado, sin fine-tuning propio) |
| Entrada | `[1, 3, 320, 320]` float32, RGB normalizado 0..1, NCHW |
| Salida | `[1, 84, 2100]` float32 (4 caja + 80 clases × 2100 anchors) |
| Tamaño | 3,2 MB (12,2 MB antes de cuantizar, 3,8× de reducción) |
| Costo de inferencia | $0 — corre 100% en el dispositivo, sin conexión |

## Qué reconoce de verdad, y qué no

Esta es la limitación importante del estado actual.

**Reconoce** (5 ingredientes, porque son clases de COCO):

`banana` · `manzana` · `naranja` · `brócoli` · `zanahoria`

**No reconoce** (requieren fine-tuning):

`tomate` · `cebolla` · `ajo` · `papa` · `huevo` · `morrón` · `zapallo` ·
`limón` · `queso` · `mozzarella` · `leche` · `manteca` · `harina` ·
`lentejas` · `albahaca`

COCO no tiene esas clases. Los ingredientes que más usan las recetas de la
app —tomate, cebolla, papa, huevo— están justamente en la lista de los que
faltan, así que **el modelo actual no alcanza para el caso de uso real**:
sirve como base funcional verificada y como prueba de que el pipeline
completo (export → bundle → inferencia → mapeo) cierra, pero para que la
Fase 2 sea útil en una cocina hay que hacer el fine-tuning.

La cobertura no está escrita a mano en ningún lado: se deriva de las
etiquetas del modelo con `getIngredientsCoveredByLabels()`, así que no se
puede desincronizar al cambiar de modelo.

## Cómo se hizo

```bash
pip install -r ml/requirements.txt
python ml/export_model.py --weights yolov8n.pt --out assets/models/
```

### Por qué estas decisiones

- **YOLOv8n y no un modelo más grande**: tiene que correr en gama media sin
  agotar batería. Es el nano de la familia.
- **320×320 y no 640**: la inferencia corre cada 1,5 s sobre una mesada;
  320 baja la latencia a la mitad y los ingredientes son objetos grandes en
  el encuadre.
- **INT8 dinámico (`w8a32`) y no INT8 completo**: da 3,8× de reducción sin
  necesitar dataset de calibración. El INT8 completo achica más pero exige
  imágenes representativas, que hoy no tenemos.
- **Sin NMS**: la app solo necesita saber *si* un ingrediente está presente,
  no dónde. Alcanza con el score máximo por clase entre todos los anchors,
  lo que evita la parte más cara del post-procesado. Si en el futuro hay
  que dibujar cajas, `src/vision/yoloDecode.ts` es donde agregarlo.

## Verificación hecha

- La inferencia del `.tflite` exportado se comparó contra el `.pt` original
  sobre la misma imagen: al umbral de 0,5 que usa la app, ambos devuelven
  exactamente las mismas clases. El ruido que mete la cuantización aparece
  recién en detecciones de ~0,27, por debajo del umbral.
- El decodificador de la app (`decodeYoloOutput`, en TypeScript) se
  contrastó contra la salida cruda real del modelo corriendo en Python:
  reproduce los mismos scores (`bus` 0,8547 y `person` 0,8254, idénticos a
  4 decimales). Eso descarta errores de layout del tensor, que es donde
  suelen esconderse los bugs de este tipo de integración.
- El preprocesado (`preprocessToTensor`) y el decodificador tienen tests
  unitarios propios en `src/__tests__/yoloDecode.test.ts`.

Lo que **no** está verificado: la precisión sobre fotos reales de cocina.
Eso requiere el dataset y el fine-tuning.

## Cuando el modelo falla: la corrección del usuario

Ningún modelo va a reconocer todos los ingredientes. El catálogo se limita
a lo que existe anotado en datasets públicos, y cosas como la sal o el
caldo no son detectables ni en principio. Por eso la app le da la última
palabra al usuario, con dos mecanismos (ver `src/vision/corrections.ts`):

**"Ya lo tengo"** — el usuario marca a mano un ingrediente que la cámara no
ve. El paso se completa igual. Esto hace que la cobertura del modelo deje
de ser un techo duro: la función es usable incluso para ingredientes que el
modelo nunca va a reconocer.

**"No es eso"** — cuando el modelo detecta mal, el usuario elige qué es en
realidad. La corrección se guarda y se vuelve a aplicar cada vez que el
modelo emita esa misma etiqueta, así el error no se repite en esa cocina.

El historial de correcciones queda guardado y es exportable. Son
exactamente los casos donde el modelo falló, así que es el material más
valioso para la próxima iteración del entrenamiento.

## Fine-tuning: lo que falta

```bash
python ml/build_dataset.py --max-per-class 300   # arma el dataset
python ml/train.py --epochs 100                   # entrena
python ml/export_model.py --weights runs/detect/train/weights/best.pt
# Después actualizar en la app:
#   src/vision/modelAsset.ts  -> require al nuevo .tflite
#   src/vision/cocoLabels.ts  -> etiquetas y numAnchors del modelo nuevo
```

**Dataset**: `ml/build_dataset.py` baja Open Images y lo convierte a
formato YOLO. Se verificó que resuelve **40 clases de comida** con
bounding box, entre ellas las que hoy faltan: tomate, papa, huevo, queso,
pan, hongos, morrón y calabaza. Eso llevaría la cobertura de 5 a ~40.

**Lo que sigue sin cubrir**: cebolla y ajo no están anotados en Open
Images pese a ser básicos para cocinar; para esos hay que anotar fotos
propias. Y como las fotos del dataset son de stock (fondo limpio, buena
luz), conviene sumar fotos en condiciones reales de mesada.

**Sobre el hardware**: en CPU el entrenamiento tarda horas. Con GPU baja a
minutos.

**Antes de dar por bueno un modelo**: mirar el mAP *por clase*, no solo el
promedio. Una clase con mAP bajo se traduce en un ingrediente que la app
nunca detecta, y eso en la cocina se siente como que la función está rota.
Conviene además probar en condiciones adversas reales —mesada de granito,
poca luz, ingredientes superpuestos— antes de publicar.

## Cómo activarlo en la app

El modelo necesita runtime nativo, así que **no funciona en Expo Go**:

```bash
npx expo install react-native-fast-tflite
npx expo prebuild
npx expo run:android        # o run:ios
```

`metro.config.js` ya declara `tflite` como extensión de asset. Si el módulo
nativo o el modelo faltan, `getIngredientDetector()` cae automáticamente al
detector simulado y la app sigue andando; la pantalla siempre muestra qué
motor está activo.

## Pieza pendiente de integración

`TfliteIngredientDetector` espera el frame ya convertido a tensor
(`DetectionFrame.pixels`). El paso que falta es decodificar el JPEG que
entrega `expo-camera` a píxeles RGBA en el dispositivo, que necesita una
librería nativa de imagen y por lo tanto solo se puede probar en un
development build. `preprocessToTensor` ya cubre —y testea— la parte
posterior: resize, separación de canales a NCHW y normalización.

## Medición real de la detección (agosto 2026)

Hasta acá la calidad del detector era una suposición. La medimos.

**Cómo:** 63 fotos etiquetadas del set de validación de Open Images
(Apple 13, Banana 18, Broccoli 13, Carrot 11, Orange 8), pasadas por el
mismo modelo `yolov8n-coco-320-w8a32.tflite` que lleva la app. Se cuenta
un acierto cuando la clase correcta aparece entre las detecciones.

| Configuración | Aciertos | Recall | Falsos positivos |
| --- | --- | --- | --- |
| squash + umbral 0.50 (lo que había) | 43/63 | 68 % | 1 |
| letterbox + umbral 0.50 | 48/63 | 76 % | 1 |
| **letterbox + umbral 0.35 (actual)** | **49/63** | **78 %** | **1** |
| letterbox + umbral 0.25 | 54/63 | 86 % | 3 |

Dos conclusiones que cambiaron el código:

1. **El preprocesado estaba mal.** Estirábamos la imagen a 320×320 sin
   respetar el aspecto ("squash"), y el modelo fue entrenado con
   letterbox (escala proporcional + relleno gris 114). Corregirlo dio
   +8 puntos de recall sin tocar el modelo. Está en `src/vision/preprocess.ts`.
2. **El umbral 0.5 era demasiado alto** para este modelo cuantizado a
   INT8. Bajarlo a 0.35 suma un acierto sin sumar falsos positivos.
   Bajar a 0.25 sumaría 5 aciertos más pero triplica los falsos
   positivos, y un falso positivo en la cocina es peor que un miss:
   el usuario siempre puede marcar el ingrediente a mano.

Además se agregó **suavizado temporal** (`src/vision/temporalSmoothing.ts`):
un ingrediente se muestra recién cuando aparece en 2 de los últimos 4
cuadros. Sin eso la lista parpadeaba entre cuadros consecutivos.

### Lo que esto NO arregla

El modelo es COCO puro: reconoce **5 comidas** (manzana, banana,
brócoli, zanahoria, naranja) más algunos utensilios. De los 55
ingredientes del catálogo, los demás **no se detectan**, y varios
importantes (cebolla, ajo) ni siquiera existen como clase etiquetable
en Open Images. Por eso la app siempre ofrece marcar a mano, y por eso
el fine-tuning de `ml/train.py` sigue siendo el paso que de verdad
mueve la aguja. Las mejoras de acá son sobre esas 5 clases; el salto
grande necesita entrenar.
