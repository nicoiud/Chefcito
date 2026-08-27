#!/usr/bin/env python3
"""
Fine-tuning del detector de ingredientes.

Parte de YOLOv8n pre-entrenado en COCO y lo reentrena sobre el dataset de
ingredientes definido en `ml/ingredients.yaml`. Se parte de COCO y no de
cero porque con 100-300 imágenes por clase no alcanza para aprender
features visuales desde el arranque; el transfer learning sí funciona con
datasets chicos.

Uso:
    python ml/train.py                      # entrenamiento por defecto
    python ml/train.py --epochs 150 --batch 32

Después de entrenar:
    python ml/export_model.py --weights runs/detect/<run>/weights/best.pt

Nota sobre hardware: en CPU esto tarda horas. Con una GPU modesta (o una
instancia spot con GPU) baja a minutos. `device` se detecta solo.
"""

import argparse
from pathlib import Path

from ultralytics import YOLO

DATASET_CONFIG = Path(__file__).parent / "ingredients.yaml"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default=str(DATASET_CONFIG))
    parser.add_argument("--base", default="yolov8n.pt", help="Checkpoint de partida")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=320)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--patience", type=int, default=25, help="Early stopping")
    args = parser.parse_args()

    if not Path(args.data).exists():
        raise SystemExit(f"No encuentro el dataset: {args.data}")

    model = YOLO(args.base)

    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        # La cámara apunta a una mesada: los ingredientes aparecen en
        # cualquier orientación y con luces muy distintas según la cocina.
        # Por eso se aumenta fuerte en rotación, escala y color, y se
        # habilita flip vertical (que por defecto está apagado).
        degrees=25.0,
        scale=0.5,
        fliplr=0.5,
        flipud=0.3,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.5,
    )

    metrics = model.val()
    print(f"\nmAP50: {metrics.box.map50:.3f}   mAP50-95: {metrics.box.map:.3f}")
    print("\nRevisá el mAP por clase antes de dar el modelo por bueno: una clase")
    print("con mAP bajo va a generar falsos negativos molestos en la cocina.")


if __name__ == "__main__":
    main()
