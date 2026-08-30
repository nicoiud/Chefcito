"""
Exporta el modelo YOLOE con los ingredientes de Chefcito horneados adentro.

Por qué esto reemplaza al fine-tuning
-------------------------------------
El camino anterior (ml/build_dataset.py + ml/train.py) necesitaba miles de
imágenes anotadas por clase, y para cebolla y ajo directamente no existían
en Open Images con bounding box: eran indetectables.

YOLOE resuelve eso de otra forma. En vez de aprender de fotos, reparametriza
la cabeza de detección usando los embeddings de texto de CLIP de una lista de
clases. Le pasás los nombres y el modelo sale sabiendo buscarlos. Sin dataset,
sin etiquetar, sin horas de GPU.

Uso
---
    python ml/export_yoloe.py

Las clases salen de ml/yoloe_classes.json, que se genera desde el catálogo de
la app con `npm run clases`. No las edites acá: se desincronizarían con las
recetas.

El .onnx resultante se renombra a chefcito-ingredientes.onnx y va en los
assets nativos de Android (ver README_YOLOE.md).
"""
import json
import pathlib
import sys

AQUI = pathlib.Path(__file__).parent
CLASES_JSON = AQUI / "yoloe_classes.json"
NOMBRE_SALIDA = "chefcito-ingredientes.onnx"


def cargar_clases() -> list[str]:
    if not CLASES_JSON.exists():
        sys.exit(
            f"Falta {CLASES_JSON}.\n"
            "Generalo primero desde el catálogo de la app:  npm run clases"
        )
    clases = json.loads(CLASES_JSON.read_text(encoding="utf-8"))
    if not clases:
        sys.exit("La lista de clases está vacía.")
    return clases


def main() -> None:
    try:
        from ultralytics import YOLOE
    except ImportError:
        sys.exit("Falta ultralytics. Instalalo con:  pip install ultralytics")

    clases = cargar_clases()
    pesos = sys.argv[1] if len(sys.argv) > 1 else "yoloe-26n-seg.pt"
    print(f"[export] {pesos} con {len(clases)} clases de Chefcito")
    print(f"[export] {', '.join(clases[:8])}…")

    modelo = YOLOE(pesos)
    # RepRTA: hornea los embeddings de texto de NUESTRAS clases en la cabeza
    # de detección. Acá es donde el modelo aprende a buscar "onion".
    modelo.set_classes(clases, modelo.get_text_pe(clases))

    # end2end (NMS adentro) para que output0 sea [1,300,38], que es el
    # formato que espera el proveedor nativo de ONNX de Viro. No cambiar.
    ruta = modelo.export(format="onnx", imgsz=640, nms=True, opset=19, simplify=False)

    destino = pathlib.Path(ruta).parent / NOMBRE_SALIDA
    pathlib.Path(ruta).rename(destino)
    print(f"[export] listo -> {destino}")
    print("[export] copialo a android/app/src/main/assets/ (ver README_YOLOE.md)")


if __name__ == "__main__":
    main()
