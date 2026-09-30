import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TrackedBox } from './liveDetections';
import { contarPorIngrediente } from './liveDetections';
import { estimarPeso, formatearPeso } from '../vision/ingredientWeights';
import type { EtiquetaIngrediente } from './useDetectionAnchors';

/**
 * Las cajas del detector dibujadas sobre la cámara, estilo visor: esquinas
 * en vez de un rectángulo cerrado (tapa menos el ingrediente) y un rótulo
 * con el nombre y el peso estimado.
 *
 * Lo que el paso necesita va en verde y con la cantidad de la receta; lo
 * demás que se reconoce se marca igual, en blanco, para que se note que la
 * cámara lo está viendo aunque no toque ahora.
 *
 * `screenBoundingBox` de Viro ya viene en dp alineado a la vista de la
 * cámara, así que va directo como `left/top/width/height`.
 */
const VERDE = '#2F9E5F';
const BLANCO = 'rgba(255,255,255,0.9)';
const ESQUINA = 18;
const TRAZO = 3;

export interface DetectionOverlayProps {
  cajas: TrackedBox[];
  esperados: string[];
  describir: (ingredientId: string) => EtiquetaIngrediente;
}

export function DetectionOverlay({ cajas, esperados, describir }: DetectionOverlayProps) {
  const cuenta = contarPorIngrediente(cajas);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cajas.map((c) => {
        const delPaso = esperados.includes(c.ingredientId);
        const color = delPaso ? VERDE : BLANCO;
        const { label, detail } = describir(c.ingredientId);
        const unidad = estimarPeso(c.ingredientId, 1);
        const n = cuenta.get(c.ingredientId) ?? 1;
        const total = estimarPeso(c.ingredientId, n);
        const esquina = Math.min(ESQUINA, c.box.width / 3, c.box.height / 3);
        const lado = { position: 'absolute' as const, borderColor: color, width: esquina, height: esquina };
        // El rótulo va arriba de la caja, salvo que no entre en pantalla.
        const rotuloArriba = c.box.y > 58;

        return (
          <View
            key={c.key}
            style={{
              position: 'absolute',
              left: c.box.x,
              top: c.box.y,
              width: c.box.width,
              height: c.box.height,
            }}
          >
            <View style={[lado, { left: 0, top: 0, borderLeftWidth: TRAZO, borderTopWidth: TRAZO }]} />
            <View style={[lado, { right: 0, top: 0, borderRightWidth: TRAZO, borderTopWidth: TRAZO }]} />
            <View style={[lado, { left: 0, bottom: 0, borderLeftWidth: TRAZO, borderBottomWidth: TRAZO }]} />
            <View style={[lado, { right: 0, bottom: 0, borderRightWidth: TRAZO, borderBottomWidth: TRAZO }]} />
            <View style={[styles.punto, { backgroundColor: color }]} />

            <View
              style={[
                styles.rotulo,
                { borderColor: color },
                rotuloArriba ? { bottom: c.box.height + 6 } : { top: c.box.height + 6 },
              ]}
            >
              <Text style={[styles.nombre, { color: delPaso ? '#9BE3B8' : '#FFFFFF' }]} numberOfLines={1}>
                {delPaso ? '✓ ' : ''}
                {label}
                {unidad ? `  ${formatearPeso(unidad.gramos)}` : ''}
              </Text>
              {total && n > 1 ? (
                <Text style={styles.detalle}>
                  {n} u. · {formatearPeso(total.gramos)} en total
                </Text>
              ) : null}
              {delPaso && detail ? <Text style={styles.detalle}>Receta: {detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  punto: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    borderRadius: 4,
  },
  rotulo: {
    position: 'absolute',
    left: 0,
    minWidth: 96,
    maxWidth: 220,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(15,12,10,0.72)',
  },
  nombre: { fontSize: 14, fontWeight: '700' },
  detalle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
});
