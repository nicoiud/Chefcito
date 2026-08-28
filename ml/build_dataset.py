#!/usr/bin/env python3
"""
Arma el dataset de ingredientes a partir de Open Images.

Open Images tiene ~60 clases de comida **con bounding box**, que es lo que
necesita un detector. Este script baja las anotaciones, filtra las clases
que nos interesan, descarga solo las imágenes correspondientes y las
convierte al formato YOLO que espera `train.py`.

Uso:
    python ml/build_dataset.py --max-per-class 300
    python ml/build_dataset.py --classes Tomato Potato Egg --max-per-class 500

Por qué Open Images y no fotos propias: anotar cajas a mano es lento y caro.
Open Images ya tiene millones de cajas revisadas por humanos. Las fotos
propias conviene sumarlas después, para los casos que el dataset público no
cubre (ver "Limitaciones" abajo).

## Limitaciones conocidas

- **Cebolla y ajo NO están** en el subconjunto con cajas de Open Images,
  aunque son centrales para cocinar. Para esos dos hay que anotar fotos
  propias (con LabelImg, CVAT o Roboflow) y sumarlas al dataset.
- Las fotos de Open Images son de stock: fondos limpios, buena luz. Una
  mesada real con luz de cocina y ingredientes tapados a medias es más
  difícil. Conviene sumar fotos propias en condiciones reales.
- Las correcciones que hacen los usuarios en la app (ver
  `src/vision/corrections.ts`) son exactamente los casos donde el modelo
  falla: es el material más valioso para la próxima iteración.
"""

import argparse
import csv
import os
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlretrieve

OID_BASE = "https://storage.googleapis.com/openimages"
CLASS_DESCRIPTIONS = f"{OID_BASE}/v5/class-descriptions-boxable.csv"
ANNOTATIONS = {
    "train": f"{OID_BASE}/v6/oidv6-train-annotations-bbox.csv",
    "validation": f"{OID_BASE}/v5/validation-annotations-bbox.csv",
}
IMAGE_URL = "https://s3.amazonaws.com/open-images-dataset/{split}/{image_id}.jpg"

# Clases de Open Images que corresponden a ingredientes del catálogo de la
# app. El nombre debe coincidir exactamente con class-descriptions-boxable.
DEFAULT_CLASSES = [
    "Tomato", "Potato", "Carrot", "Broccoli", "Cucumber", "Cabbage",
    "Pumpkin", "Zucchini", "Radish", "Artichoke", "Garden Asparagus",
    "Mushroom", "Bell pepper", "Egg (Food)", "Cheese", "Milk", "Bread",
    "Pasta", "Apple", "Banana", "Orange", "Lemon", "Grapefruit",
    "Strawberry", "Grape", "Peach", "Pear", "Pineapple", "Mango",
    "Watermelon", "Cantaloupe", "Pomegranate", "Common fig", "Coconut",
    "Chicken", "Fish", "Shrimp", "Oyster", "Crab", "Lobster",
]

DATASET_DIR = Path("datasets/ingredientes")


def download(url: str, destination: Path) -> Path:
    """Descarga con caché: si el archivo ya existe, no lo vuelve a bajar."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_size > 0:
        return destination
    print(f"  bajando {destination.name}…")
    urlretrieve(url, destination)
    return destination


def load_class_ids(wanted: list[str], cache: Path) -> dict[str, str]:
    """Traduce nombres legibles a los MIDs (/m/xxxx) que usa Open Images."""
    path = download(CLASS_DESCRIPTIONS, cache / "class-descriptions-boxable.csv")
    by_name = {name: mid for mid, name in csv.reader(path.open())}

    resolved, missing = {}, []
    for name in wanted:
        if name in by_name:
            resolved[by_name[name]] = name
        else:
            missing.append(name)

    if missing:
        print(f"\n  ⚠️  Sin bounding box en Open Images: {', '.join(missing)}")
        print("     Para esas clases hay que anotar fotos propias.\n")

    return resolved


def collect_boxes(
    split: str, class_ids: dict[str, str], max_per_class: int, cache: Path
) -> dict[str, list[tuple[str, float, float, float, float]]]:
    """Junta las cajas de cada imagen, respetando el tope por clase."""
    path = download(ANNOTATIONS[split], cache / f"{split}-annotations-bbox.csv")

    per_class_count: dict[str, int] = defaultdict(int)
    boxes_by_image: dict[str, list] = defaultdict(list)

    with path.open() as f:
        for row in csv.DictReader(f):
            mid = row["LabelName"]
            if mid not in class_ids:
                continue
            if per_class_count[mid] >= max_per_class:
                continue

            per_class_count[mid] += 1
            boxes_by_image[row["ImageID"]].append(
                (
                    mid,
                    float(row["XMin"]),
                    float(row["XMax"]),
                    float(row["YMin"]),
                    float(row["YMax"]),
                )
            )

    for mid, name in class_ids.items():
        print(f"    {name:22s} {per_class_count[mid]:5d} cajas")

    return boxes_by_image


def write_labels(
    boxes_by_image: dict, class_index: dict[str, int], labels_dir: Path
) -> None:
    """Escribe un .txt por imagen en formato YOLO: clase cx cy w h (0..1)."""
    labels_dir.mkdir(parents=True, exist_ok=True)

    for image_id, boxes in boxes_by_image.items():
        lines = []
        for mid, xmin, xmax, ymin, ymax in boxes:
            # Open Images da esquinas normalizadas; YOLO quiere centro y tamaño.
            cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
            w, h = xmax - xmin, ymax - ymin
            if w <= 0 or h <= 0:
                continue
            lines.append(f"{class_index[mid]} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")

        if lines:
            (labels_dir / f"{image_id}.txt").write_text("\n".join(lines) + "\n")


def download_images(image_ids: list[str], split: str, images_dir: Path, workers: int) -> None:
    images_dir.mkdir(parents=True, exist_ok=True)

    def fetch(image_id: str) -> None:
        destination = images_dir / f"{image_id}.jpg"
        if destination.exists():
            return
        try:
            urlretrieve(IMAGE_URL.format(split=split, image_id=image_id), destination)
        except Exception as e:  # una imagen caída no debe abortar todo
            print(f"      no se pudo bajar {image_id}: {e}")

    print(f"  descargando {len(image_ids)} imágenes con {workers} hilos…")
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(fetch, image_ids))


def write_yaml(class_names: list[str], path: Path) -> None:
    lines = [
        "# Generado por ml/build_dataset.py — no editar a mano.",
        "# El orden de las clases define sus índices: si cambia, hay que",
        "# regenerar también la lista de etiquetas de la app.",
        "",
        "path: ../datasets/ingredientes",
        "train: images/train",
        "val: images/validation",
        "",
        "names:",
    ]
    lines += [f"  {i}: {name}" for i, name in enumerate(class_names)]
    path.write_text("\n".join(lines) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--classes", nargs="*", default=DEFAULT_CLASSES)
    parser.add_argument("--max-per-class", type=int, default=300)
    parser.add_argument("--splits", nargs="*", default=["train", "validation"])
    parser.add_argument("--workers", type=int, default=16)
    parser.add_argument("--cache", default=".oid-cache")
    args = parser.parse_args()

    cache = Path(args.cache)
    print("Resolviendo clases…")
    class_ids = load_class_ids(args.classes, cache)
    if not class_ids:
        sys.exit("Ninguna de las clases pedidas existe en Open Images.")

    # El orden de las clases fija sus índices: se ordena para que sea estable
    # entre corridas, si no el modelo y la app quedan desincronizados.
    ordered = sorted(class_ids.items(), key=lambda kv: kv[1])
    class_index = {mid: i for i, (mid, _) in enumerate(ordered)}
    class_names = [name for _, name in ordered]

    for split in args.splits:
        print(f"\n[{split}] leyendo anotaciones…")
        boxes = collect_boxes(split, class_ids, args.max_per_class, cache)
        print(f"  {len(boxes)} imágenes con al menos una caja")

        write_labels(boxes, class_index, DATASET_DIR / "labels" / split)
        download_images(list(boxes), split, DATASET_DIR / "images" / split, args.workers)

    yaml_path = Path("ml/ingredients.yaml")
    write_yaml(class_names, yaml_path)

    print(f"\n✅ Dataset listo en {DATASET_DIR}")
    print(f"   {len(class_names)} clases, definidas en {yaml_path}")
    print("\nSiguiente paso:")
    print("   python ml/train.py --epochs 100")
    print("\nDespués de entrenar, actualizá en la app:")
    print("   src/vision/modelAsset.ts   -> require al nuevo .tflite")
    print("   src/vision/cocoLabels.ts   -> estas etiquetas, en este mismo orden")


if __name__ == "__main__":
    main()
