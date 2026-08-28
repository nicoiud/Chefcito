import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { Boton, Columna, Fila, Progreso, Txt } from './ui';

function formatear(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Temporizador de un paso.
 *
 * El número es enorme a propósito: es lo que se mira de reojo desde el otro
 * lado de la cocina. Al terminar cambia de color en vez de solo mostrar un
 * cero, para que se note sin leer.
 */
export function StepTimer({ durationSeconds }: { durationSeconds: number }) {
  const theme = useTheme();
  const [restante, setRestante] = useState(durationSeconds);
  const [corriendo, setCorriendo] = useState(false);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRestante(durationSeconds);
    setCorriendo(false);
  }, [durationSeconds]);

  useEffect(() => {
    if (!corriendo) return;

    intervalo.current = setInterval(() => {
      setRestante((actual) => {
        if (actual <= 1) {
          setCorriendo(false);
          return 0;
        }
        return actual - 1;
      });
    }, 1000);

    return () => {
      if (intervalo.current) clearInterval(intervalo.current);
    };
  }, [corriendo]);

  const terminado = restante === 0;
  const color = terminado ? theme.color.exito : theme.color.acento;

  return (
    <View
      style={{
        backgroundColor: terminado ? theme.color.exitoTenue : theme.color.acentoTenue,
        borderRadius: radius.lg,
        padding: space.lg,
      }}
    >
      <Columna gap={space.md}>
        <Fila justify="space-between" align="center">
          <Txt variant="numero" color={color}>
            {formatear(restante)}
          </Txt>
          <Boton
            variant={terminado ? 'primario' : 'secundario'}
            onPress={() => {
              if (terminado) {
                setRestante(durationSeconds);
                setCorriendo(true);
                return;
              }
              setCorriendo((c) => !c);
            }}
          >
            {terminado ? 'Reiniciar' : corriendo ? 'Pausar' : 'Iniciar'}
          </Boton>
        </Fila>

        <Progreso valor={1 - restante / durationSeconds} />

        {terminado ? (
          <Txt variant="chicoFuerte" color={theme.color.exito}>
            ¡Listo! Se cumplió el tiempo.
          </Txt>
        ) : null}
      </Columna>
    </View>
  );
}
