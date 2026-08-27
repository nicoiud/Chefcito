/**
 * Las 80 clases de COCO, en el orden de sus índices, tal como las devuelve
 * el modelo `assets/models/yolov8n-coco-320-w8a32.tflite`.
 *
 * De estas, solo cinco son ingredientes de nuestro catálogo (banana, apple,
 * orange, broccoli, carrot). El resto se descarta en el mapeo del catálogo.
 * Ver `docs/VISION_MODEL.md` para qué cubre el modelo y qué falta entrenar.
 */
export const COCO_LABELS: string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
  'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
  'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
  'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
  'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush',
];

/** Geometría de la salida del modelo exportado (imgsz=320). */
export const COCO_MODEL_INPUT_SIZE = 320;
export const COCO_MODEL_NUM_ANCHORS = 2100;
