#!/usr/bin/env python3
"""
Exporta un modelo YOLO a LiteRT/TFLite para correr on-device en la app.

Es el mismo script con el que se generó el modelo que hoy se distribuye en
`assets/models/`. Sirve tanto para re-exportar el modelo COCO base como para
exportar el modelo propio después del fine-tuning.

Uso:
    python ml/export_model.py --weights yolov8n.pt --out assets/models/
    python ml/export_model.py --weights runs/detect/train/weights/best.pt

Elecciones de exportación y por qué:
  - imgsz=320: la app corre inferencia cada 1,5 s sobre una mesada; 320 da
    latencia razonable en gama media sin perder ingredientes grandes.
  - quantize='w8a32' (INT8 dinámico): ~3,8x más chico sin necesitar dataset
    de calibración. La cuantización mete ruido en las detecciones de baja
    confianza, pero queda por debajo del umbral de 0,5 que usa la app.
"""

import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO

IMAGE_SIZE = 320
QUANTIZATION = "w8a32"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weights", default="yolov8n.pt", help="Checkpoint .pt de entrada")
    parser.add_argument("--out", default="assets/models", help="Carpeta destino del .tflite")
    parser.add_argument("--imgsz", type=int, default=IMAGE_SIZE)
    parser.add_argument("--name", default=None, help="Nombre del archivo de salida")
    args = parser.parse_args()

    model = YOLO(args.weights)
    print(f"Clases del modelo ({len(model.names)}): {list(model.names.values())}")

    exported = Path(
        model.export(format="litert", imgsz=args.imgsz, quantize=QUANTIZATION)
    )

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    destination = out_dir / (args.name or exported.name)
    shutil.copy(exported, destination)

    size_mb = destination.stat().st_size / (1024 * 1024)
    print(f"\nModelo exportado: {destination} ({size_mb:.1f} MB)")
    print(
        "\nRecordá actualizar en la app:\n"
        "  - src/vision/modelAsset.ts  -> el require al nuevo archivo\n"
        "  - src/vision/cocoLabels.ts  -> las etiquetas y numAnchors del modelo\n"
        "Las etiquetas deben ir en el orden de sus índices de clase."
    )


if __name__ == "__main__":
    main()
