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
  Inventory,
  MaterialRequirement,
  MaterialType,
  MaterialAlertState,
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
import {
  createInitialMeteorStormState,
  allocatePower as allocateShieldPower,
  startPrepPhase,
  startMeteorStorm,
  stormTick,
} from './meteorStorm';

function hasSufficientMaterials(inventory: Inventory, requirement: MaterialRequirement): boolean {
  if (requirement.parts && inventory.parts < requirement.parts) return false;
  if (requirement.oxygen_filter && inventory.oxygen_filter < requirement.oxygen_filter) return false;
  if (requirement.battery && inventory.battery < requirement.battery) return false;
  return true;
}

function consumeMaterials(inventory: Inventory, requirement: MaterialRequirement): { newInventory: Inventory; depletedMaterials: MaterialType[] } {
  const depletedMaterials: MaterialType[] = [];
  const newInventory = {
    parts: inventory.parts - (requirement.parts ?? 0),
    oxygen_filter: inventory.oxygen_filter - (requirement.oxygen_filter ?? 0),
    battery: inventory.battery - (requirement.battery ?? 0),
  };
  if (inventory.parts > 0 && newInventory.parts <= 0) depletedMaterials.push('parts');
  if (inventory.oxygen_filter > 0 && newInventory.oxygen_filter <= 0) depletedMaterials.push('oxygen_filter');
  if (inventory.battery > 0 && newInventory.battery <= 0) depletedMaterials.push('battery');
  return { newInventory, depletedMaterials };
}

function getMaterialAlertStatus(inventory: Inventory): MaterialAlertState {
  const materials: MaterialType[] = ['parts', 'oxygen_filter', 'battery'];
  const lowMaterials: MaterialType[] = [];
  const result: Partial<MaterialAlertState> = {};

  materials.forEach(material => {
    const threshold = baseConfig.materials[material].alertThreshold;
    const isLow = inventory[material] <= threshold;
    (result as any)[material] = isLow;
    if (isLow) lowMaterials.push(material);
  });

  return {
    parts: result.parts!,
    oxygen_filter: result.oxygen_filter!,
    battery: result.battery!,
    anyLow: lowMaterials.length > 0,
    lowMaterials,
  };
}

function getMaterialShortage(inventory: Inventory, requirement: MaterialRequirement): string[] {
  const shortages: string[] = [];
  if (requirement.parts && inventory.parts < requirement.parts) {
    shortages.push(`零件不足(需要${requirement.parts}，现有${inventory.parts})`);
  }
  if (requirement.oxygen_filter && inventory.oxygen_filter < requirement.oxygen_filter) {
    shortages.push(`氧滤芯不足(需要${requirement.oxygen_filter}，现有${inventory.oxygen_filter})`);
  }
  if (requirement.battery && inventory.battery < requirement.battery) {
    shortages.push(`电池不足(需要${requirement.battery}，现有${inventory.battery})`);
  }
  return shortages;
}

interface GameStore {
  state: GameState;
  selectedCrew: string | null;
  selectedTarget: string | null;
  selectedTargetType: 'pipe' | 'door' | 'crew' | null;
  replayFrame: number | null;
  isPaused: boolean;
  initGame: (difficulty: 'easy' | 'normal' | 'hard') => void;
  selectCrew: (crewId: string | null) => void;
  selectTarget: (targetId: string | null, targetType: 'pipe' | 'door' | 'crew') => void;
  assignRepairTask: (crewId: string, pipeId: string) => { success: boolean; message?: string };
  assignSealDoorTask: (crewId: string, doorId: string) => void;
  assignTreatTask: (doctorId: string, patientId: string) => void;
  assignSupplyTask: (crewId: string, material: MaterialType, amount: number) => { success: boolean; message?: string };
  toggleCircuitSwitch: (circuitId: string) => void;
  restockMaterial: (material: MaterialType, amount: number) => void;
  checkRepairMaterials: (pipeId: string) => { sufficient: boolean; requirement: MaterialRequirement; shortages: string[] };
  getMaterialAlertStatus: () => MaterialAlertState;
  moveTaskUp: (taskId: string) => void;
  moveTaskDown: (taskId: string) => void;
  endTurn: () => void;
  setPaused: (paused: boolean) => void;
  setReplayFrame: (frame: number | null) => void;
  loadReplay: (history: HistoryFrame[]) => void;
  timeTick: () => void;
  startMeteorStormPrep: () => void;
  allocateShieldPower: (shieldId: string, power: number) => void;
  triggerMeteorStorm: () => void;
  meteorStormTick: () => void;
  endMeteorStorm: () => void;
}

function createInitialState(difficulty: 'easy' | 'normal' | 'hard'): GameState {
  const settings = difficultySettings[difficulty];
  const inventoryMultiplier = difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 0.7 : 1;
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
    inventory: {
      parts: Math.ceil(baseConfig.initialInventory.parts * inventoryMultiplier),
      oxygen_filter: Math.ceil(baseConfig.initialInventory.oxygen_filter * inventoryMultiplier),
      battery: Math.ceil(baseConfig.initialInventory.battery * inventoryMultiplier),
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
    meteorStorm: createInitialMeteorStormState(difficulty),
  };
}

function processTaskProgress(
  tasks: Task[],
  crew: Crew[],
  pipes: Pipe[],
  doors: Door[],
  inventory: Inventory,
  turn: number
): {
  updatedTasks: Task[];
  updatedCrew: Crew[];
  updatedPipes: Pipe[];
  updatedDoors: Door[];
  updatedInventory: Inventory;
  completedEvents: GameEvent[];
} {
  const completedEvents: GameEvent[] = [];
  const updatedTasks: Task[] = [];
  let updatedCrew = [...crew];
  let updatedPipes = [...pipes];
  let updatedDoors = [...doors];
  let updatedInventory = { ...inventory };

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
      } else if (task.type === 'treat_crew') {
        const patientIndex = updatedCrew.findIndex(c => c.id === task.targetId);
        const doctorIndex = updatedCrew.findIndex(c => c.id === task.assignedCrewId);
        if (patientIndex !== -1 && doctorIndex !== -1) {
          const doctor = updatedCrew[doctorIndex];
          const patient = updatedCrew[patientIndex];
          const healAmount = Math.floor(20 + doctor.skills.medical * 0.5);
          const injuryReduce = Math.floor(30 + doctor.skills.medical * 0.4);
          const fatigueReduce = Math.floor(20 + doctor.skills.medical * 0.3);
          const hypoxiaReduce = Math.floor(40 + doctor.skills.medical * 0.5);

          updatedCrew[patientIndex] = {
            ...patient,
            health: Math.min(patient.maxHealth, patient.health + healAmount),
            injury: Math.max(0, patient.injury - injuryReduce),
            fatigue: Math.max(0, patient.fatigue - fatigueReduce),
            hypoxia: Math.max(0, patient.hypoxia - hypoxiaReduce),
          };

          completedEvents.push(
            createEvent(
              'crew_treated',
              turn,
              `${doctor.name} 完成了对 ${patient.name} 的治疗，生命值恢复 ${healAmount}`,
              'success',
              patient.id
            )
          );
        }
      } else if (task.type === 'restock_material' && task.restockMaterial && task.restockAmount) {
        const materialInfo = baseConfig.materials[task.restockMaterial];
        updatedInventory = {
          ...updatedInventory,
          [task.restockMaterial]: updatedInventory[task.restockMaterial] + task.restockAmount,
        };
        const crewMember = updatedCrew[crewIndex];
        completedEvents.push(
          createEvent(
            'crew_action',
            turn,
            `${crewMember?.name || '队员'} 完成仓储入库：${materialInfo.name} ×${task.restockAmount}`,
            'success',
            undefined,
            { material: task.restockMaterial, amount: task.restockAmount }
          )
        );
      }

      if (crewIndex !== -1) {
        updatedCrew[crewIndex] = {
          ...updatedCrew[crewIndex],
          currentTask: null,
          status: 'idle',
          fatigue: Math.min(100, updatedCrew[crewIndex].fatigue + 5),
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
    updatedInventory,
    completedEvents,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState('normal'),
  selectedCrew: null,
  selectedTarget: null,
  selectedTargetType: null,
  replayFrame: null,
  isPaused: false,

  initGame: (difficulty) => {
    set({
      state: createInitialState(difficulty),
      selectedCrew: null,
      selectedTarget: null,
      selectedTargetType: null,
      replayFrame: null,
      isPaused: false,
    });
  },

  selectCrew: (crewId) => set({ selectedCrew: crewId, selectedTarget: null, selectedTargetType: null }),
  selectTarget: (targetId, targetType) => set({ selectedTarget: targetId, selectedTargetType: targetType }),

  assignRepairTask: (crewId, pipeId) => {
    const { state } = get();
    if (state.status !== 'playing') return { success: false, message: '游戏未在进行中' };

    const crew = state.crew.find(c => c.id === crewId);
    const pipe = state.base.pipes.find(p => p.id === pipeId);

    if (!crew || !pipe) return { success: false, message: '队员或管线不存在' };
    if (crew.status !== 'idle') return { success: false, message: '队员当前不可用' };
    if (pipe.status === 'normal') return { success: false, message: '该管线无需维修' };

    const requirement = baseConfig.repairMaterialCost[pipe.type][pipe.status];
    if (!hasSufficientMaterials(state.inventory, requirement)) {
      const shortages = getMaterialShortage(state.inventory, requirement);
      const shortageEvent = createEvent(
        'pipe_damage',
        state.turn,
        `⚠️ 无法维修${pipe.type === 'oxygen' ? '氧气' : '电力'}管线：${shortages.join('，')}`,
        'danger',
        pipeId,
        { materialShortage: shortages }
      );
      set((prev) => ({
        state: {
          ...prev.state,
          events: [...prev.state.events, shortageEvent],
        },
      }));
      return { success: false, message: `材料不足：${shortages.join('，')}` };
    }

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
      materialCost: requirement,
    };

    const action: Action = {
      type: 'assign_task',
      payload: { crewId, pipeId, taskType: 'repair_pipe', materialCost: requirement },
      timestamp: Date.now(),
    };

    const pipeType = pipe.type === 'oxygen' ? '氧气' : '电力';
    const pipeStatus = pipe.status === 'damaged' ? '损坏' : '断裂';
    const costDesc = Object.entries(requirement)
      .map(([k, v]) => {
        const names: Record<string, string> = { parts: '零件', oxygen_filter: '氧滤芯', battery: '电池' };
        return `${names[k]}×${v}`;
      })
      .join('、');
    const event = createEvent(
      'crew_action',
      state.turn,
      `${crew.name} 开始修复${pipeStatus}${pipeType}管线，消耗材料：${costDesc}`,
      'info',
      pipeId,
      { materialCost: requirement }
    );

    const { newInventory, depletedMaterials } = consumeMaterials(state.inventory, requirement);
    const newEvents = [...state.events, event];

    depletedMaterials.forEach(material => {
      const materialInfo = baseConfig.materials[material];
      newEvents.push(
        createEvent(
          'pipe_damage',
          state.turn,
          `🚨 ${materialInfo.name}已耗尽！维修工作将无法继续进行，请尽快补给！`,
          'danger',
          undefined,
          { depletedMaterial: material }
        )
      );
    });

    set((prev) => ({
      state: {
        ...prev.state,
        inventory: newInventory,
        crew: prev.state.crew.map(c =>
          c.id === crewId ? { ...c, currentTask: task, status: 'working' } : c
        ),
        activeTasks: [...prev.state.activeTasks, task],
        events: newEvents,
        pendingActions: [...prev.state.pendingActions, action],
      },
      selectedCrew: null,
      selectedTarget: null,
    }));

    return { success: true };
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

  assignTreatTask: (doctorId, patientId) => {
    const { state } = get();
    if (state.status !== 'playing') return;

    const doctor = state.crew.find(c => c.id === doctorId);
    const patient = state.crew.find(c => c.id === patientId);

    if (!doctor || !patient || doctor.status !== 'idle' || doctorId === patientId) return;
    if (patient.health >= patient.maxHealth && patient.injury === 0 && patient.fatigue === 0 && patient.hypoxia === 0) return;

    const duration = Math.max(1, Math.ceil(3 / (1 + doctor.skills.medical / 100)));

    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'treat_crew',
      targetId: patientId,
      assignedCrewId: doctorId,
      progress: 0,
      duration,
      startTime: state.turn,
    };

    const action: Action = {
      type: 'assign_task',
      payload: { doctorId, patientId, taskType: 'treat_crew' },
      timestamp: Date.now(),
    };

    const event = createEvent(
      'crew_action',
      state.turn,
      `${doctor.name} 开始对 ${patient.name} 进行医疗救治`,
      'info',
      patientId
    );

    set((prev) => ({
      state: {
        ...prev.state,
        crew: prev.state.crew.map(c =>
          c.id === doctorId ? { ...c, currentTask: task, status: 'working' } : c
        ),
        activeTasks: [...prev.state.activeTasks, task],
        events: [...prev.state.events, event],
        pendingActions: [...prev.state.pendingActions, action],
      },
      selectedCrew: null,
      selectedTarget: null,
      selectedTargetType: null,
    }));
  },

  assignSupplyTask: (crewId, material, amount) => {
    const { state } = get();
    if (state.status !== 'playing') return { success: false, message: '游戏未在进行中' };

    const crew = state.crew.find(c => c.id === crewId);
    if (!crew) return { success: false, message: '队员不存在' };
    if (crew.status !== 'idle') return { success: false, message: '队员当前不可用' };
    if (amount <= 0) return { success: false, message: '入库数量必须大于0' };

    const materialInfo = baseConfig.materials[material];
    const duration = Math.max(1, Math.ceil(amount / (1 + crew.skills.repair / 100)));

    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'restock_material',
      targetId: `supply_${material}_${Date.now()}`,
      assignedCrewId: crewId,
      progress: 0,
      duration,
      startTime: state.turn,
      restockMaterial: material,
      restockAmount: amount,
    };

    const action: Action = {
      type: 'assign_task',
      payload: { crewId, material, amount, taskType: 'restock_material' },
      timestamp: Date.now(),
    };

    const event = createEvent(
      'crew_action',
      state.turn,
      `${crew.name} 开始搬运入库：${materialInfo.name} ×${amount}`,
      'info',
      undefined,
      { material, amount }
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
      selectedTargetType: null,
    }));

    return { success: true };
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

  checkRepairMaterials: (pipeId) => {
    const { state } = get();
    const pipe = state.base.pipes.find(p => p.id === pipeId);
    if (!pipe) {
      return { sufficient: false, requirement: {}, shortages: ['管线不存在'] };
    }
    const requirement = baseConfig.repairMaterialCost[pipe.type][pipe.status];
    const sufficient = hasSufficientMaterials(state.inventory, requirement);
    const shortages = sufficient ? [] : getMaterialShortage(state.inventory, requirement);
    return { sufficient, requirement, shortages };
  },

  getMaterialAlertStatus: () => {
    const { state } = get();
    return getMaterialAlertStatus(state.inventory);
  },

  moveTaskUp: (taskId) => {
    const { state } = get();
    if (state.status !== 'playing') return;

    const index = state.activeTasks.findIndex(t => t.id === taskId);
    if (index <= 0) return;

    const newTasks = [...state.activeTasks];
    [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];

    set((prev) => ({
      state: {
        ...prev.state,
        activeTasks: newTasks,
      },
    }));
  },

  moveTaskDown: (taskId) => {
    const { state } = get();
    if (state.status !== 'playing') return;

    const index = state.activeTasks.findIndex(t => t.id === taskId);
    if (index === -1 || index >= state.activeTasks.length - 1) return;

    const newTasks = [...state.activeTasks];
    [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];

    set((prev) => ({
      state: {
        ...prev.state,
        activeTasks: newTasks,
      },
    }));
  },

  restockMaterial: (material, amount) => {
    const { state } = get();
    if (state.status !== 'playing') return;
    if (amount <= 0) return;

    const materialInfo = baseConfig.materials[material];

    const action: Action = {
      type: 'restock_material',
      payload: { material, amount },
      timestamp: Date.now(),
    };

    const event = createEvent(
      'crew_action',
      state.turn,
      `仓储室入库：${materialInfo.name} ×${amount}`,
      'success',
      undefined,
      { material, amount }
    );

    set((prev) => ({
      state: {
        ...prev.state,
        inventory: {
          ...prev.state.inventory,
          [material]: prev.state.inventory[material] + amount,
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
      state.inventory,
      state.turn
    );

    const { event: randomEvent, pipeDamage, crewInjury } = generateRandomEvent(
      state.turn + 1,
      taskResult.updatedPipes,
      state.base.modules,
      taskResult.updatedCrew,
      settings.eventFrequency
    );

    let newPipes = taskResult.updatedPipes;
    let newEvents = [...state.events, ...taskResult.completedEvents];
    let updatedCrew = [...taskResult.updatedCrew];

    if (randomEvent && pipeDamage) {
      newEvents.push(randomEvent);
      newPipes = newPipes.map(p =>
        p.id === pipeDamage.pipeId ? damagePipe(p, pipeDamage.severity) : p
      );
    }

    if (crewInjury) {
      const injuredCrewIndex = updatedCrew.findIndex(c => c.id === crewInjury.crewId);
      if (injuredCrewIndex !== -1) {
        const injured = updatedCrew[injuredCrewIndex];
        updatedCrew[injuredCrewIndex] = {
          ...injured,
          injury: Math.min(100, injured.injury + crewInjury.severity),
          health: Math.max(0, injured.health - Math.floor(crewInjury.severity * 0.5)),
        };
        newEvents.push(
          createEvent(
            'crew_injured',
            state.turn + 1,
            `${injured.name} 在事故中受伤！伤情 +${crewInjury.severity}`,
            'danger',
            injured.id
          )
        );
      }
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

    updatedCrew = updatedCrew.map(member => {
      const module = updatedModules.find(m => m.id === member.currentModule);
      const hasOxygen = module?.hasOxygen ?? false;
      const moduleOxygenLevel = module?.oxygenLevel ?? 100;

      let newHypoxia = member.hypoxia;
      let newInjury = member.injury;
      let newFatigue = member.fatigue;
      let newHealth = member.health;

      if (!hasOxygen || moduleOxygenLevel < 30) {
        const hypoxiaIncrease = hasOxygen ? 10 : 25;
        newHypoxia = Math.min(100, newHypoxia + hypoxiaIncrease);

        if (newHypoxia >= 50) {
          const healthLoss = Math.floor(newHypoxia * 0.15);
          newHealth = Math.max(0, newHealth - healthLoss);
          if (newHypoxia >= 70) {
            newEvents.push(
              createEvent(
                'crew_hypoxia',
                state.turn + 1,
                `${member.name} 严重缺氧！生命值 -${healthLoss}`,
                'danger',
                member.id
              )
            );
          }
        }
      } else {
        newHypoxia = Math.max(0, newHypoxia - 15);
      }

      if (member.status === 'working') {
        newFatigue = Math.min(100, newFatigue + 8);
      } else if (member.status === 'idle') {
        newFatigue = Math.max(0, newFatigue - 5);
      }

      if (newFatigue >= 70) {
        const fatigueDamage = Math.floor((newFatigue - 60) * 0.3);
        newHealth = Math.max(0, newHealth - fatigueDamage);
      }

      if (newInjury > 0) {
        const injuryDamage = Math.floor(newInjury * 0.08);
        if (injuryDamage > 0) {
          newHealth = Math.max(0, newHealth - injuryDamage);
        }
        newInjury = Math.min(100, newInjury + 2);
      }

      if (hasOxygen && moduleOxygenLevel >= 50 && member.status === 'idle' && newInjury === 0 && newHypoxia === 0) {
        newHealth = Math.min(member.maxHealth, newHealth + 3);
      }

      return {
        ...member,
        health: newHealth,
        injury: newInjury,
        fatigue: newFatigue,
        hypoxia: newHypoxia,
      };
    });

    const allCrewDead = updatedCrew.every(c => c.health <= 0);

    const newOverallSafety = calculateOverallSafety(updatedModules);

    let newStatus: GameState['status'] = 'playing';
    let defeatReason: string | undefined;

    if (allCrewDead) {
      newStatus = 'defeat';
      defeatReason = '所有队员均已失去生命体征，任务失败';
    } else if (newOverallSafety <= 0) {
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
      inventory: taskResult.updatedInventory,
      crew: updatedCrew,
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
      selectedTargetType: null,
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

  startMeteorStormPrep: () => {
    const { state } = get();
    if (state.status !== 'playing') return;
    if (state.meteorStorm.phase !== 'idle') return;

    const newMeteorStorm = startPrepPhase(state.meteorStorm, state.difficulty);

    const event = createEvent(
      'crew_action',
      state.turn,
      '⚠️ 探测到陨石雨来袭！请尽快分配护盾能源进行防御！',
      'danger'
    );

    set((prev) => ({
      state: {
        ...prev.state,
        meteorStorm: newMeteorStorm,
        events: [...prev.state.events, event],
      },
    }));
  },

  allocateShieldPower: (shieldId, power) => {
    const { state } = get();
    if (state.status !== 'playing') return;
    if (state.meteorStorm.phase !== 'prep') return;

    const result = allocateShieldPower(
      state.meteorStorm.shieldNodes,
      shieldId,
      power,
      state.meteorStorm.totalPower
    );

    set((prev) => ({
      state: {
        ...prev.state,
        meteorStorm: {
          ...prev.state.meteorStorm,
          shieldNodes: result.shieldNodes,
          allocatedPower: result.allocatedPower,
        },
      },
    }));
  },

  triggerMeteorStorm: () => {
    const { state } = get();
    if (state.status !== 'playing') return;
    if (state.meteorStorm.phase !== 'prep') return;

    const newMeteorStorm = startMeteorStorm(state.meteorStorm, state.difficulty);

    const event = createEvent(
      'crew_action',
      state.turn,
      '💥 陨石雨来袭！护盾系统启动！',
      'danger'
    );

    set((prev) => ({
      state: {
        ...prev.state,
        meteorStorm: newMeteorStorm,
        events: [...prev.state.events, event],
      },
    }));
  },

  meteorStormTick: () => {
    const { state, isPaused } = get();
    if (state.status !== 'playing' || isPaused) return;
    if (state.meteorStorm.phase !== 'storm') return;

    const result = stormTick(state.meteorStorm, state.base.modules, 1);

    let newEvents = [...state.events];
    result.newDamageReports.forEach(report => {
      const module = state.base.modules.find(m => m.id === report.moduleId);
      if (module) {
        newEvents.push(
          createEvent(
            'pipe_damage',
            state.turn,
            `💥 ${module.name} 被陨石击中！安全值 -${report.damage}`,
            report.destroyed ? 'danger' : 'warning',
            report.moduleId
          )
        );
      }
    });

    const newOverallSafety = calculateOverallSafety(result.updatedModules);

    set((prev) => ({
      state: {
        ...prev.state,
        base: {
          ...prev.state.base,
          modules: result.updatedModules,
        },
        meteorStorm: result.stormState,
        events: newEvents,
        overallSafety: newOverallSafety,
      },
    }));
  },

  endMeteorStorm: () => {
    const { state } = get();
    if (state.meteorStorm.phase !== 'storm') return;

    const damageReports = state.meteorStorm.damageReports;
    const totalDamage = damageReports.reduce((sum, r) => sum + r.damage, 0);

    const event = createEvent(
      'system_repaired',
      state.turn,
      `🌧️ 陨石雨已结束。共造成 ${totalDamage} 点伤害，影响 ${damageReports.length} 个模块。`,
      totalDamage > 50 ? 'danger' : totalDamage > 20 ? 'warning' : 'success'
    );

    set((prev) => ({
      state: {
        ...prev.state,
        meteorStorm: {
          ...prev.state.meteorStorm,
          phase: 'result',
        },
        events: [...prev.state.events, event],
      },
    }));
  },
}));
