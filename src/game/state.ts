import { create } from 'zustand';
import type {
  GameState,
  Task,
  Action,
  GameEvent,
  Crew,
  Pipe,
  Door,
  HistoryFrame,
} from './types';
import { baseConfig, difficultySettings } from './config';
import {
  calculateOxygenConnectivity,
  calculatePowerConnectivity,
} from './connectivity';
import { updateOxygenLevels, calculateOverallSafety } from './oxygen';
import {
  updatePowerStatus,
  damagePipe,
  repairPipe,
  calculateRepairDuration,
  toggleCircuit,
} from './power';
import { createEvent, generateRandomEvent } from './events';
import { createHistoryFrame, analyzeDefeat, saveReplay } from './replay';

interface GameStore {
  state: GameState;
  selectedCrew: string | null;
  selectedTarget: string | null;
  replayFrame: number | null;
  isPaused: boolean;
  initGame: (difficulty: 'easy' | 'normal' | 'hard') => void;
  selectCrew: (crewId: string | null) => void;
  selectTarget: (targetId: string | null) => void;
  assignRepairTask: (crewId: string, pipeId: string) => void;
  assignSealDoorTask: (crewId: string, doorId: string) => void;
  toggleCircuitSwitch: (circuitId: string) => void;
  endTurn: () => void;
  setPaused: (paused: boolean) => void;
  setReplayFrame: (frame: number | null) => void;
  loadReplay: (history: HistoryFrame[]) => void;
  timeTick: () => void;
}

function createInitialState(difficulty: 'easy' | 'normal' | 'hard'): GameState {
  const settings = difficultySettings[difficulty];
  return {
    turn: 1,
    timeRemaining: settings.totalTime,
    overallSafety: 100,
    base: {
      modules: JSON.parse(JSON.stringify(baseConfig.modules)),
      pipes: JSON.parse(JSON.stringify(baseConfig.pipes)),
      doors: JSON.parse(JSON.stringify(baseConfig.doors)),
      circuits: JSON.parse(JSON.stringify(baseConfig.circuits)),
    },
    crew: JSON.parse(JSON.stringify(baseConfig.crew)),
    events: [
      createEvent(
        'crew_action',
        1,
        `基地系统启动，难度：${difficulty === 'easy' ? '简单' : difficulty === 'normal' ? '普通' : '困难'}`,
        'info'
      ),
    ],
    activeTasks: [],
    status: 'playing',
    history: [],
    pendingActions: [],
    difficulty,
  };
}

function processTaskProgress(
  tasks: Task[],
  crew: Crew[],
  pipes: Pipe[],
  doors: Door[],
  turn: number
): {
  updatedTasks: Task[];
  updatedCrew: Crew[];
  updatedPipes: Pipe[];
  updatedDoors: Door[];
  completedEvents: GameEvent[];
} {
  const completedEvents: GameEvent[] = [];
  const updatedTasks: Task[] = [];
  const updatedCrew = [...crew];
  let updatedPipes = [...pipes];
  let updatedDoors = [...doors];

  tasks.forEach(task => {
    const newProgress = task.progress + (100 / task.duration);
    const crewIndex = updatedCrew.findIndex(c => c.id === task.assignedCrewId);

    if (newProgress >= 100) {
      if (task.type === 'repair_pipe') {
        const pipeIndex = updatedPipes.findIndex(p => p.id === task.targetId);
        if (pipeIndex !== -1) {
          updatedPipes[pipeIndex] = repairPipe(updatedPipes[pipeIndex]);
          const pipe = updatedPipes[pipeIndex];
          completedEvents.push(
            createEvent(
              'system_repaired',
              turn,
              `${pipe.type === 'oxygen' ? '氧气' : '电力'}管线已修复`,
              'success',
              pipe.id
            )
          );
        }
      } else if (task.type === 'seal_door') {
        const doorIndex = updatedDoors.findIndex(d => d.id === task.targetId);
        if (doorIndex !== -1) {
          updatedDoors[doorIndex] = {
            ...updatedDoors[doorIndex],
            isSealed: true,
            isOpen: false,
          };
          completedEvents.push(
            createEvent(
              'door_sealed',
              turn,
              '舱门已密封',
              'warning',
              updatedDoors[doorIndex].id
            )
          );
        }
      }

      if (crewIndex !== -1) {
        updatedCrew[crewIndex] = {
          ...updatedCrew[crewIndex],
          currentTask: null,
          status: 'idle',
        };
      }
    } else {
      updatedTasks.push({ ...task, progress: newProgress });
      if (crewIndex !== -1) {
        updatedCrew[crewIndex] = {
          ...updatedCrew[crewIndex],
          status: 'working',
        };
      }
    }
  });

  return {
    updatedTasks,
    updatedCrew,
    updatedPipes,
    updatedDoors,
    completedEvents,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState('normal'),
  selectedCrew: null,
  selectedTarget: null,
  replayFrame: null,
  isPaused: false,

  initGame: (difficulty) => {
    set({
      state: createInitialState(difficulty),
      selectedCrew: null,
      selectedTarget: null,
      replayFrame: null,
      isPaused: false,
    });
  },

  selectCrew: (crewId) => set({ selectedCrew: crewId }),
  selectTarget: (targetId) => set({ selectedTarget: targetId }),

  assignRepairTask: (crewId, pipeId) => {
    const { state } = get();
    if (state.status !== 'playing') return;

    const crew = state.crew.find(c => c.id === crewId);
    const pipe = state.base.pipes.find(p => p.id === pipeId);

    if (!crew || !pipe || crew.status !== 'idle' || pipe.status === 'normal') return;

    const skill = pipe.type === 'oxygen' ? crew.skills.engineering : crew.skills.electrical;
    const duration = calculateRepairDuration(pipe, skill, baseConfig.baseRepairSpeed);

    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'repair_pipe',
      targetId: pipeId,
      assignedCrewId: crewId,
      progress: 0,
      duration,
      startTime: state.turn,
    };

    const action: Action = {
      type: 'assign_task',
      payload: { crewId, pipeId, taskType: 'repair_pipe' },
      timestamp: Date.now(),
    };

    const pipeType = pipe.type === 'oxygen' ? '氧气' : '电力';
    const event = createEvent(
      'crew_action',
      state.turn,
      `${crew.name} 开始修复${pipeType}管线`,
      'info',
      pipeId
    );

    set((prev) => ({
      state: {
        ...prev.state,
        crew: prev.state.crew.map(c =>
          c.id === crewId ? { ...c, currentTask: task, status: 'working' } : c
        ),
        activeTasks: [...prev.state.activeTasks, task],
        events: [...prev.state.events, event],
        pendingActions: [...prev.state.pendingActions, action],
      },
      selectedCrew: null,
      selectedTarget: null,
    }));
  },

  assignSealDoorTask: (crewId, doorId) => {
    const { state } = get();
    if (state.status !== 'playing') return;

    const crew = state.crew.find(c => c.id === crewId);
    const door = state.base.doors.find(d => d.id === doorId);

    if (!crew || !door || crew.status !== 'idle' || door.isSealed) return;

    const duration = Math.ceil(2 / (1 + crew.skills.engineering / 100));

    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'seal_door',
      targetId: doorId,
      assignedCrewId: crewId,
      progress: 0,
      duration,
      startTime: state.turn,
    };

    const action: Action = {
      type: 'assign_task',
      payload: { crewId, doorId, taskType: 'seal_door' },
      timestamp: Date.now(),
    };

    const event = createEvent(
      'crew_action',
      state.turn,
      `${crew.name} 开始密封舱门`,
      'warning',
      doorId
    );

    set((prev) => ({
      state: {
        ...prev.state,
        crew: prev.state.crew.map(c =>
          c.id === crewId ? { ...c, currentTask: task, status: 'working' } : c
        ),
        activeTasks: [...prev.state.activeTasks, task],
        events: [...prev.state.events, event],
        pendingActions: [...prev.state.pendingActions, action],
      },
      selectedCrew: null,
      selectedTarget: null,
    }));
  },

  toggleCircuitSwitch: (circuitId) => {
    const { state } = get();
    if (state.status !== 'playing') return;

    const result = toggleCircuit(state.base.circuits, circuitId);
    if (!result.success) return;

    const action: Action = {
      type: 'switch_circuit',
      payload: { circuitId },
      timestamp: Date.now(),
    };

    const event = createEvent(
      'crew_action',
      state.turn,
      result.message,
      'info',
      circuitId
    );

    set((prev) => ({
      state: {
        ...prev.state,
        base: {
          ...prev.state.base,
          circuits: result.circuits,
        },
        events: [...prev.state.events, event],
        pendingActions: [...prev.state.pendingActions, action],
      },
    }));
  },

  endTurn: () => {
    const { state } = get();
    if (state.status !== 'playing') return;

    const settings = difficultySettings[state.difficulty];
    const endTurnAction: Action = {
      type: 'end_turn',
      payload: { turn: state.turn },
      timestamp: Date.now(),
    };

    const historyFrame = createHistoryFrame(state, [...state.pendingActions, endTurnAction]);

    const taskResult = processTaskProgress(
      state.activeTasks,
      state.crew,
      state.base.pipes,
      state.base.doors,
      state.turn
    );

    const { event: randomEvent, pipeDamage } = generateRandomEvent(
      state.turn + 1,
      taskResult.updatedPipes,
      state.base.modules,
      settings.eventFrequency
    );

    let newPipes = taskResult.updatedPipes;
    let newEvents = [...state.events, ...taskResult.completedEvents];

    if (randomEvent && pipeDamage) {
      newEvents.push(randomEvent);
      newPipes = newPipes.map(p =>
        p.id === pipeDamage.pipeId ? damagePipe(p, pipeDamage.severity) : p
      );
    }

    const oxygenMap = calculateOxygenConnectivity(
      state.base.modules,
      newPipes,
      taskResult.updatedDoors
    );
    const powerMap = calculatePowerConnectivity(state.base.modules, newPipes);

    const oxygenResult = updateOxygenLevels(
      state.base.modules,
      oxygenMap,
      settings.safetyDecayRate
    );

    let updatedModules = updatePowerStatus(oxygenResult.updatedModules, powerMap);

    oxygenResult.safetyDrops.forEach(drop => {
      const module = updatedModules.find(m => m.id === drop.moduleId);
      if (module) {
        newEvents.push(
          createEvent(
            'safety_drop',
            state.turn + 1,
            `${module.name} 安全值下降 ${drop.amount}`,
            module.safetyLevel < 30 ? 'danger' : 'warning',
            module.id
          )
        );
      }
    });

    const newOverallSafety = calculateOverallSafety(updatedModules);

    let newStatus: GameState['status'] = 'playing';
    let defeatReason: string | undefined;

    if (newOverallSafety <= 0) {
      newStatus = 'defeat';
      defeatReason = '整体安全值降至临界值以下，基地系统崩溃';
    } else if (state.timeRemaining <= 0) {
      newStatus = 'victory';
    }

    const newState: GameState = {
      ...state,
      turn: state.turn + 1,
      overallSafety: newOverallSafety,
      base: {
        modules: updatedModules,
        pipes: newPipes,
        doors: taskResult.updatedDoors,
        circuits: state.base.circuits,
      },
      crew: taskResult.updatedCrew,
      events: newEvents,
      activeTasks: taskResult.updatedTasks,
      status: newStatus,
      defeatReason,
      history: [...state.history, historyFrame],
      pendingActions: [],
    };

    if (newStatus === 'defeat') {
      newState.defeatAnalysis = analyzeDefeat(newState.history, newState);
      saveReplay(newState.history, newState);
    } else if (newStatus === 'victory') {
      saveReplay(newState.history, newState);
    }

    set({
      state: newState,
      selectedCrew: null,
      selectedTarget: null,
    });
  },

  setPaused: (paused) => set({ isPaused: paused }),
  setReplayFrame: (frame) => set({ replayFrame: frame }),

  loadReplay: (history) => {
    if (history.length === 0) return;
    const firstFrame = history[0];
    set({
      state: {
        ...firstFrame.stateSnapshot,
        history,
      } as GameState,
      replayFrame: 0,
    });
  },

  timeTick: () => {
    const { state, isPaused } = get();
    if (state.status !== 'playing' || isPaused) return;

    const newTime = state.timeRemaining - 1;
    if (newTime <= 0) {
      const victoryState: GameState = {
        ...state,
        timeRemaining: 0,
        status: 'victory',
      };
      saveReplay(victoryState.history, victoryState);
      set({ state: victoryState });
      return;
    }

    set((prev) => ({
      state: {
        ...prev.state,
        timeRemaining: newTime,
      },
    }));
  },
}));
