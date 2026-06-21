import { useCallback, useState } from 'react';
import { useGameStore } from '../game/state';
import type { HistoryFrame, MaterialType } from '../game/types';
import { loadReplay as loadReplayFromStorage } from '../game/replay';

export function useGame() {
  const {
    state,
    selectedCrew,
    selectedTarget,
    selectedTargetType,
    replayFrame,
    isPaused,
    initGame,
    selectCrew,
    selectTarget,
    assignRepairTask,
    assignSealDoorTask,
    assignTreatTask,
    toggleCircuitSwitch,
    restockMaterial,
    checkRepairMaterials,
    endTurn,
    setPaused,
    setReplayFrame,
    loadReplay,
    startMeteorStormPrep,
    allocateShieldPower,
    triggerMeteorStorm,
    meteorStormTick,
    endMeteorStorm,
  } = useGameStore();

  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'info' | 'success' } | null>(null);

  const showNotification = useCallback((message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleCrewSelect = useCallback((crewId: string | null) => {
    selectCrew(crewId);
  }, [selectCrew]);

  const handleTargetSelect = useCallback((targetId: string | null, targetType: 'pipe' | 'door' | 'crew') => {
    if (!selectedCrew) {
      selectTarget(targetId, targetType);
      return;
    }

    if (targetType === 'pipe') {
      const result = assignRepairTask(selectedCrew, targetId!);
      if (!result.success && result.message) {
        showNotification(result.message, 'error');
      }
    } else if (targetType === 'door') {
      assignSealDoorTask(selectedCrew, targetId!);
    } else if (targetType === 'crew') {
      assignTreatTask(selectedCrew, targetId!);
    }
  }, [selectedCrew, assignRepairTask, assignSealDoorTask, assignTreatTask, selectTarget, showNotification]);

  const handleRestockMaterial = useCallback((material: MaterialType, amount: number) => {
    restockMaterial(material, amount);
  }, [restockMaterial]);

  const handleCheckRepairMaterials = useCallback((pipeId: string) => {
    return checkRepairMaterials(pipeId);
  }, [checkRepairMaterials]);

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
    selectedTargetType,
    replayFrame,
    isPaused,
    notification,
    showNotification,
    initGame,
    selectCrew: handleCrewSelect,
    selectTarget: handleTargetSelect,
    toggleCircuitSwitch,
    restockMaterial: handleRestockMaterial,
    checkRepairMaterials: handleCheckRepairMaterials,
    endTurn,
    setPaused,
    setReplayFrame,
    loadReplay,
    loadSavedReplay,
    jumpToFrame,
    getReplayFrames,
    startMeteorStormPrep,
    allocateShieldPower,
    triggerMeteorStorm,
    meteorStormTick,
    endMeteorStorm,
  };
}
