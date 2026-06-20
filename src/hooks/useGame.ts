import { useCallback } from 'react';
import { useGameStore } from '../game/state';
import type { HistoryFrame } from '../game/types';
import { loadReplay as loadReplayFromStorage } from '../game/replay';

export function useGame() {
  const {
    state,
    selectedCrew,
    selectedTarget,
    replayFrame,
    isPaused,
    initGame,
    selectCrew,
    selectTarget,
    assignRepairTask,
    assignSealDoorTask,
    toggleCircuitSwitch,
    endTurn,
    setPaused,
    setReplayFrame,
    loadReplay,
  } = useGameStore();

  const handleCrewSelect = useCallback((crewId: string | null) => {
    selectCrew(crewId);
    selectTarget(null);
  }, [selectCrew, selectTarget]);

  const handleTargetSelect = useCallback((targetId: string | null, targetType: 'pipe' | 'door') => {
    if (!selectedCrew) {
      selectTarget(targetId);
      return;
    }

    if (targetType === 'pipe') {
      assignRepairTask(selectedCrew, targetId!);
    } else if (targetType === 'door') {
      assignSealDoorTask(selectedCrew, targetId!);
    }
  }, [selectedCrew, assignRepairTask, assignSealDoorTask, selectTarget]);

  const loadSavedReplay = useCallback(() => {
    const data = loadReplayFromStorage();
    if (data) {
      loadReplay(data.history);
      return true;
    }
    return false;
  }, [loadReplay]);

  const jumpToFrame = useCallback((frameIndex: number) => {
    const frames = state.history;
    if (frameIndex < 0 || frameIndex >= frames.length) return;

    const frame = frames[frameIndex];
    setReplayFrame(frameIndex);

    if (frame.stateSnapshot.base) {
      useGameStore.setState({
        state: {
          ...state,
          ...frame.stateSnapshot,
          history: frames,
        },
      });
    }
  }, [state, setReplayFrame]);

  const getReplayFrames = useCallback((): HistoryFrame[] => {
    return state.history;
  }, [state.history]);

  return {
    state,
    selectedCrew,
    selectedTarget,
    replayFrame,
    isPaused,
    initGame,
    selectCrew: handleCrewSelect,
    selectTarget: handleTargetSelect,
    toggleCircuitSwitch,
    endTurn,
    setPaused,
    setReplayFrame,
    loadReplay,
    loadSavedReplay,
    jumpToFrame,
    getReplayFrames,
  };
}
