# Toolchain del modelo de visión

Scripts para regenerar el modelo de la Fase 2. **La app no depende de esta
carpeta**: el modelo ya exportado vive en `assets/models/`.

La documentación del modelo —qué reconoce, qué no, y por qué se tomó cada
decisión de exportación— está en [`docs/VISION_MODEL.md`](../docs/VISION_MODEL.md).

## Instalación

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r ml/requirements.txt
```

## Archivos

| Archivo | Para qué |
|---|---|
| `build_dataset.py` | Baja Open Images y arma el dataset en formato YOLO |
| `train.py` | Fine-tuning sobre el dataset de ingredientes |
| `export_model.py` | Exporta un `.pt` a LiteRT/TFLite listo para la app |
| `ingredients.yaml` | Definición del dataset y orden de las clases |

## Flujo completo

```bash
# 1. Armar el dataset (40 clases de comida de Open Images)
python ml/build_dataset.py --max-per-class 300

# 2. Fine-tuning
python ml/train.py --epochs 100

# 3. Exportar el mejor checkpoint
python ml/export_model.py --weights runs/detect/train/weights/best.pt
```

El paso 1 baja bastantes gigas de imágenes y el paso 2 tarda horas en CPU
(minutos con GPU). Se pueden acotar con `--max-per-class` y `--classes`.

## Qué falta que Open Images no cubre

- **Cebolla y ajo** no tienen bounding box en Open Images, aunque son
  básicos para cocinar. Hay que anotar fotos propias.
- Las fotos del dataset son de stock, con fondo limpio. Una mesada real con
  luz de cocina es más difícil, así que conviene sumar fotos propias.
- Las **correcciones de los usuarios** en la app son los casos exactos donde
  el modelo falla: es el material más valioso para la siguiente iteración.

## Importante: el orden de las clases

El modelo emite **índices** de clase, no nombres. El orden de `names` en
`ingredients.yaml` es lo que determina esos índices, así que tiene que
coincidir exactamente con la lista de etiquetas de la app
(`src/vision/cocoLabels.ts`). Si cambiás el orden en un lado y no en el
otro, la app va a mapear mal los ingredientes sin dar ningún error: va a
detectar "cebolla" donde hay un tomate.
