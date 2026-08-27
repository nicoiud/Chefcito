import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface StepTimerProps {
  durationSeconds: number;
}

export function StepTimer({ durationSeconds }: StepTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemainingSeconds(durationSeconds);
    setIsRunning(false);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setIsRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const isFinished = remainingSeconds === 0;

  const handlePress = () => {
    if (isFinished) {
      setRemainingSeconds(durationSeconds);
      setIsRunning(true);
      return;
    }
    setIsRunning((current) => !current);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.time, isFinished && styles.timeFinished]}>
        {formatSeconds(remainingSeconds)}
      </Text>
      <Pressable
        style={[styles.button, isFinished && styles.buttonFinished]}
        onPress={handlePress}
      >
        <Text style={styles.buttonText}>
          {isFinished ? '¡Listo! Reiniciar' : isRunning ? 'Pausar' : 'Iniciar timer'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  time: {
    fontSize: 40,
    fontWeight: '700',
    color: '#E65100',
    fontVariant: ['tabular-nums'],
  },
  timeFinished: {
    color: '#2E7D32',
  },
  button: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FB8C00',
    borderRadius: 8,
  },
  buttonFinished: {
    backgroundColor: '#43A047',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
