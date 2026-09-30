import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ViroARScene,
  ViroAmbientLight,
  ViroARTrackingReasonConstants,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroText,
  ViroTrackingStateConstants,
  type ViroTrackingReason,
  type ViroTrackingState,
} from '@reactvision/react-viro';
import type { ArTrackingState, IngredientMarker } from './types';
import type { HitTestResult } from './detectionAnchors';

/**
 * Escena AR: marcadores apoyados sobre los ingredientes que la cámara ve.
 *
 * IMPORTANTE: este archivo importa Viro en el nivel superior, así que solo
 * debe cargarse cuando el módulo nativo existe (development build). Quien
 * lo carga es `ArGuideScreen`, con un require dinámico detrás de
 * `isArAvailable()`.
 *
 * Ya no hay paso de calibración. Antes el usuario tenía que encontrar un
 * plano y tocarlo para anclar un arco de marcadores inventado; ahora
 * `ViroObjectDetector` reconoce los ingredientes sobre la misma cámara de
 * la AR, y cada detección se dispara contra el mundo con un hit test para
 * saber dónde está de verdad. El marcador va ahí.
 *
 * La escena no decide nada de eso: solo dibuja las posiciones que le
 * llegan y le presta el hit test a quien recibe las detecciones, porque
 * `performARHitTestWithPoint` vive en la referencia de la escena.
 */

ViroMaterials.createMaterials({
  // Mismos colores que el sistema de diseño: el marcador en AR y el de la
  // guía 2D tienen que verse como la misma cosa.
  chefcitoPendiente: { diffuseColor: '#E2551E' },
  chefcitoConfirmado: { diffuseColor: '#2F7D4F' },
  // Fondo del panel de receta: oscuro, para que el texto blanco se lea
  // sobre cualquier mesada.
  chefcitoPanel: { diffuseColor: '#171310', lightingModel: 'Constant' },
  chefcitoPanelBorde: { diffuseColor: '#E2551E', lightingModel: 'Constant' },
});

/** Lo que muestra el panel de receta flotante. */
export interface RecetaAr {
  titulo: string;
  paso: string;
  instruccion: string;
  ingredientes: { id: string; nombre: string; cantidad?: string; visto: boolean }[];
}

type Vec3 = [number, number, number];

/** Distancia del panel a la cámara y cuánto se corre al costado, en metros. */
const PANEL_DISTANCIA = 0.8;
const PANEL_COSTADO = 0.32;
const PANEL_ANCHO = 0.36;

/**
 * Dónde va el panel de receta: adelante de la cámara y corrido a la
 * derecha, a la altura de los ojos. Se calcula una vez y queda fijo en el
 * mundo — si siguiera a la cámara sería un cartel pegado a la pantalla, no
 * realidad aumentada. "Traer receta" lo vuelve a poner al costado.
 */
export function posicionPanel(camPos: Vec3, forward: Vec3, up: Vec3): Vec3 {
  // derecha = adelante × arriba
  const der: Vec3 = [
    forward[1] * up[2] - forward[2] * up[1],
    forward[2] * up[0] - forward[0] * up[2],
    forward[0] * up[1] - forward[1] * up[0],
  ];
  const largo = Math.hypot(...der) || 1;
  return [0, 1, 2].map(
    (i) => camPos[i] + forward[i] * PANEL_DISTANCIA + (der[i] / largo) * PANEL_COSTADO
  ) as Vec3;
}

export type HitTestFn = (x: number, y: number) => Promise<HitTestResult[]>;

export interface ArMarkersSceneProps {
  markers: IngredientMarker[];
  onTrackingChange?: (state: ArTrackingState) => void;
  /** La escena entrega su hit test apenas está montada. */
  onHitTestReady?: (hitTest: HitTestFn | null) => void;
  /** Receta flotante al costado; sin esto no se dibuja. */
  receta?: RecetaAr | null;
  /** Cambiarlo vuelve a traer el panel al costado de la cámara. */
  recentrarReceta?: number;
}

export function ArMarkersScene(
  // Viro tipa la escena como `() => Element` pero en runtime le inyecta
  // `sceneNavigator`. El valor por defecto hace compatibles ambas firmas.
  props: { sceneNavigator?: { viroAppProps?: ArMarkersSceneProps } } = {}
) {
  const appProps = props.sceneNavigator?.viroAppProps;
  const markers = appProps?.markers ?? [];
  const sceneRef = useRef<any>(null);
  const receta = appProps?.receta ?? null;
  const [panelPos, setPanelPos] = useState<Vec3 | null>(null);
  const trackeando = useRef(false);

  const ubicarPanel = useCallback(async () => {
    const escena = sceneRef.current;
    if (!escena?.getCameraOrientationAsync) return;
    try {
      const o = await escena.getCameraOrientationAsync();
      setPanelPos(posicionPanel(o.position as Vec3, o.forward as Vec3, o.up as Vec3));
    } catch {
      // Sin orientación todavía: se reintenta con el próximo tracking normal.
    }
  }, []);

  const recentrar = appProps?.recentrarReceta ?? 0;
  useEffect(() => {
    if (recentrar > 0) ubicarPanel();
  }, [recentrar, ubicarPanel]);

  const hitTest = useCallback<HitTestFn>(async (x, y) => {
    const escena = sceneRef.current;
    if (!escena?.performARHitTestWithPoint) return [];
    try {
      return (await escena.performARHitTestWithPoint(x, y)) ?? [];
    } catch {
      // Un hit test puede fallar mientras el seguimiento está perdido. No
      // es un error de la app: simplemente todavía no hay dónde anclar.
      return [];
    }
  }, []);

  const entregarHitTest = appProps?.onHitTestReady;
  useEffect(() => {
    entregarHitTest?.(hitTest);
    return () => entregarHitTest?.(null);
  }, [entregarHitTest, hitTest]);

  const onTrackingUpdated = (state: ViroTrackingState, reason: ViroTrackingReason) => {
    if (state === ViroTrackingStateConstants.TRACKING_NORMAL) {
      // Primera vez que la AR sabe dónde está: recién ahí tiene sentido
      // apoyar el panel en el mundo.
      if (!trackeando.current) {
        trackeando.current = true;
        ubicarPanel();
      }
      appProps?.onTrackingChange?.(markers.length > 0 ? 'anclado' : 'buscando-superficie');
      return;
    }

    // El motivo importa: cada uno se arregla con una acción distinta del
    // usuario, y decirle "se perdió el seguimiento" no le sirve de nada.
    if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_INSUFFICIENT_FEATURES) {
      appProps?.onTrackingChange?.('poca-textura');
    } else if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION) {
      appProps?.onTrackingChange?.('mucho-movimiento');
    } else {
      appProps?.onTrackingChange?.('perdido');
    }
  };

  return (
    <ViroARScene
      ref={sceneRef}
      onTrackingUpdated={onTrackingUpdated}
      // Los hit tests apoyan mucho mejor cuando ARCore ya tiene planos
      // horizontales detectados, aunque nadie los toque.
      anchorDetectionTypes={['PlanesHorizontal']}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={220} />

      {/* Las posiciones son del mundo: vienen del hit test, no de un arco
          calculado, así que van directo en la raíz de la escena. */}
      {markers.map((marker) => (
        <ViroNode
          key={marker.ingredientId}
          position={[marker.position.x, marker.position.y, marker.position.z]}
        >
          <ViroQuad
            rotation={[-90, 0, 0]}
            width={0.12}
            height={0.12}
            materials={[
              marker.state === 'confirmado' ? 'chefcitoConfirmado' : 'chefcitoPendiente',
            ]}
          />
          <ViroText
            text={marker.label}
            position={[0, 0.09, 0]}
            scale={[0.14, 0.14, 0.14]}
            style={{ fontSize: 26, color: '#FFFFFF', textAlign: 'center' }}
            outerStroke={{ type: 'Outline', width: 3, color: '#000000' }}
            // Que el texto siempre mire al usuario, se mueva por donde se mueva.
            transformBehaviors={['billboardY']}
          />

          {/* La cantidad, más chica y debajo: reconocer el ingrediente sin
              decir cuánto va deja al usuario yendo a buscar la receta. */}
          {marker.detail ? (
            <ViroText
              text={marker.detail}
              position={[0, 0.055, 0]}
              scale={[0.14, 0.14, 0.14]}
              style={{ fontSize: 19, color: '#FFD9C7', textAlign: 'center' }}
              outerStroke={{ type: 'Outline', width: 3, color: '#000000' }}
              transformBehaviors={['billboardY']}
            />
          ) : null}
        </ViroNode>
      ))}

      {receta && panelPos ? <PanelReceta receta={receta} position={panelPos} /> : null}
    </ViroARScene>
  );
}

/**
 * La receta flotando al costado de la mesada: el paso actual y qué
 * ingredientes pide, con un tilde en los que la cámara ya vio.
 */
const ESCALA_TEXTO = 0.1;
const MARGEN = 0.018;

function PanelReceta({ receta, position }: { receta: RecetaAr; position: Vec3 }) {
  const lineas = receta.ingredientes.slice(0, 8);
  const ancho = PANEL_ANCHO - MARGEN * 2;

  // Cada renglón se apila desde arriba. ViroText centra el texto en su
  // posición y su caja se escala junto con él, por eso ancho y alto van
  // divididos por la escala.
  const renglones: { key: string; alto: number; text: string; style: object; maxLines: number }[] =
    [
      {
        key: 'titulo',
        alto: 0.032,
        text: receta.titulo,
        maxLines: 1,
        style: { fontSize: 22, fontWeight: 'bold' },
      },
      { key: 'paso', alto: 0.024, text: receta.paso, maxLines: 1, style: { fontSize: 16, color: '#FFB08A' } },
      { key: 'instr', alto: 0.07, text: receta.instruccion, maxLines: 4, style: { fontSize: 15 } },
      ...lineas.map((ing) => ({
        key: ing.id,
        alto: 0.026,
        maxLines: 1,
        text: `${ing.visto ? '✓' : '○'}  ${ing.nombre}${ing.cantidad ? ` — ${ing.cantidad}` : ''}`,
        style: { fontSize: 15, color: ing.visto ? '#7FD6A0' : '#FFFFFF' },
      })),
    ];
  const alto = renglones.reduce((t, r) => t + r.alto, 0) + MARGEN * 2;
  let techo = alto / 2 - MARGEN;

  return (
    // billboardY: el panel gira para mirarte, pero queda donde se apoyó.
    <ViroNode position={position} transformBehaviors={['billboardY']}>
      <ViroQuad
        position={[0, 0, -0.002]}
        width={PANEL_ANCHO + 0.008}
        height={alto + 0.008}
        materials={['chefcitoPanelBorde']}
      />
      <ViroQuad width={PANEL_ANCHO} height={alto} opacity={0.88} materials={['chefcitoPanel']} />
      {renglones.map((r) => {
        const centro = techo - r.alto / 2;
        techo -= r.alto;
        return (
          <ViroText
            key={r.key}
            text={r.text}
            position={[0, centro, 0.001]}
            width={ancho / ESCALA_TEXTO}
            height={r.alto / ESCALA_TEXTO}
            scale={[ESCALA_TEXTO, ESCALA_TEXTO, ESCALA_TEXTO]}
            maxLines={r.maxLines}
            textClipMode="ClipToBounds"
            style={{ color: '#FFFFFF', textAlign: 'left', textAlignVertical: 'center', ...r.style }}
          />
        );
      })}
    </ViroNode>
  );
}
