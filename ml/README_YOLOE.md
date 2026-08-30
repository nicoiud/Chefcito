# El modelo de visión: YOLOE con nuestras clases

## Qué cambió y por qué

Hasta ahora el modelo era un YOLOv8n de COCO. Reconocía **5 comidas** de las
55 del catálogo, y cebolla y ajo eran directamente imposibles: no existen
como clase anotada con bounding box en Open Images, así que ni entrenando
más se resolvía.

Ahora usamos **YOLOE**, que se puede especializar de otra forma: en vez de
aprender de fotos anotadas, reparametriza la cabeza de detección con los
*embeddings de texto* de una lista de clases (CLIP). Le pasás los nombres y
sale sabiendo buscarlos.

Sin dataset. Sin etiquetar. Sin horas de GPU entrenando.

Eso vuelve obsoletos `build_dataset.py` y `train.py`, que se quedan en el
repo como referencia del camino anterior.

## Generar el modelo

Hace falta una máquina con Python y GPU (la exportación descarga los pesos
y el encoder de texto de mobileclip la primera vez).

```bash
# 1. Generar la lista de clases desde el catálogo de la app
npm run clases

# 2. Exportar el modelo con esas clases horneadas adentro
pip install ultralytics
python ml/export_yoloe.py

# 3. Dejarlo donde el build lo busca
mv chefcito-ingredientes.onnx assets/models/
```

Del paso 3 en adelante se encarga el config plugin `plugins/withOnnxModel.js`:
copia el archivo a `android/app/src/main/assets/` durante el prebuild, acá y
en los servidores de EAS igual. Si el modelo no está, el build no se rompe —
la app compila y la AR anda, solo que sin reconocer ingredientes, y avisa.

## Por qué las clases se generan y no se escriben

`ml/yoloe_classes.json` lo genera `npm run clases` desde
`src/vision/ingredientCatalog.ts`. Si se escribiera a mano, tarde o temprano
alguien agrega un ingrediente a una receta, el modelo no lo conoce, y la app
promete una detección que no puede cumplir.

Hay un test (`src/__tests__/yoloeClasses.test.ts`) que verifica que cada
clase esté en inglés, sin repetir y sin vacíos: CLIP entiende bastante mejor
el inglés, y el primer alias de cada entrada del catálogo es, por
convención, el nombre en inglés.

## Si va lento

El log nativo dice `infer run=<ms>ms` por inferencia. Ese es el número que
importa. Palancas, de mayor a menor efecto:

1. **Cuantizar a INT8** al exportar.
2. **Bajar la resolución** de 640 a 480 o 320 (`imgsz` en `export_yoloe.py`).
3. Bajar `maxFPS` en `src/ar/ArSceneView.tsx` (hoy 10).

En Android el proveedor crea la sesión con NNAPI para tirar el trabajo a la
GPU/NPU, pero si los drivers del dispositivo no soportan las operaciones,
cae a CPU. El log lo dice: `ORT session ready (NNAPI=true|false)`.

## Limitación conocida

En Android la AR ve el **~55-60% central** del campo vertical (recorta la
imagen al centro). Lo que esté en los bordes no se detecta. Es del
componente, no de nuestro código.
