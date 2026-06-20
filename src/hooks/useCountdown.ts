import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/state';

export function useCountdown() {
  const { state, timeTick } = useGameStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.status !== 'playing') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      timeTick();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.status, timeTick]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining: state.timeRemaining,
    formattedTime: formatTime(state.timeRemaining),
    isUrgent: state.timeRemaining <= 60,
    isCritical: state.timeRemaining <= 10,
  };
}
