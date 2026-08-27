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

## Fine-tuning: lo que falta

```bash
# 1. Armar el dataset en formato YOLO (ver ml/ingredients.yaml)
#    datasets/ingredientes/images/{train,val} + labels/{train,val}
# 2. Entrenar
python ml/train.py --epochs 100
# 3. Exportar
python ml/export_model.py --weights runs/detect/train/weights/best.pt
# 4. Actualizar en la app:
#    - src/vision/modelAsset.ts  -> require al nuevo .tflite
#    - src/vision/cocoLabels.ts  -> etiquetas y numAnchors del modelo nuevo
```

**Dataset**: 100-300 imágenes por ingrediente es el punto de partida
razonable. Fuentes posibles: Open Images filtrado por categoría de
alimentos (tiene bounding boxes ya anotadas para varias frutas y
verduras), Food-101 (clasificación, sirve como base pero hay que anotar
cajas) y fotos propias, que son las más valiosas porque son las que se
parecen a lo que va a ver la cámara: mesada, luz de cocina, ingredientes
parcialmente tapados.

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
