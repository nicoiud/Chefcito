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
| `export_model.py` | Exporta un `.pt` a LiteRT/TFLite listo para la app |
| `train.py` | Fine-tuning sobre el dataset de ingredientes |
| `ingredients.yaml` | Definición del dataset y orden de las clases |

## Flujo completo

```bash
# Fine-tuning sobre tu dataset
python ml/train.py --epochs 100

# Exportar el mejor checkpoint
python ml/export_model.py --weights runs/detect/train/weights/best.pt
```

## Importante: el orden de las clases

El modelo emite **índices** de clase, no nombres. El orden de `names` en
`ingredients.yaml` es lo que determina esos índices, así que tiene que
coincidir exactamente con la lista de etiquetas de la app
(`src/vision/cocoLabels.ts`). Si cambiás el orden en un lado y no en el
otro, la app va a mapear mal los ingredientes sin dar ningún error: va a
detectar "cebolla" donde hay un tomate.
