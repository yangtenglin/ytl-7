export type MaterialType = 'parts' | 'oxygen_filter' | 'battery';

export type ModuleType = 'command' | 'living' | 'lab' | 'storage' | 'engine' | 'airlock';

export type PipeStatus = 'normal' | 'damaged' | 'broken';

export type PipeType = 'oxygen' | 'power';

export type CrewStatus = 'idle' | 'moving' | 'working' | 'resting';

export type TaskType = 'repair_pipe' | 'seal_door' | 'switch_circuit' | 'move' | 'treat_crew';

export type EventSeverity = 'info' | 'warning' | 'danger' | 'success';

export type EventType = 'pipe_damage' | 'power_failure' | 'oxygen_leak' | 'fire' | 'system_repaired' | 'crew_action' | 'safety_drop' | 'door_sealed' | 'crew_injured' | 'crew_treated' | 'crew_hypoxia';

export type GameStatus = 'playing' | 'victory' | 'defeat';

export type ActionType = 'assign_task' | 'seal_door' | 'switch_circuit' | 'end_turn' | 'restock_material';

export interface Position {
  x: number;
  y: number;
}

export interface Inventory {
  parts: number;
  oxygen_filter: number;
  battery: number;
}

export interface MaterialRequirement {
  parts?: number;
  oxygen_filter?: number;
  battery?: number;
}

export interface MaterialConfig {
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface MaterialRestockEvent {
  material: MaterialType;
  amount: number;
}

export interface Module {
  id: string;
  name: string;
  type: ModuleType;
  position: Position & { width: number; height: number };
  oxygenLevel: number;
  safetyLevel: number;
  hasPower: boolean;
  hasOxygen: boolean;
  isSealed: boolean;
  connectedTo: string[];
  isOxygenGenerator?: boolean;
  isPowerSource?: boolean;
  weight: number;
}

export interface Pipe {
  id: string;
  type: PipeType;
  from: string;
  to: string;
  status: PipeStatus;
  damageLevel: number;
  path: Position[];
}

export interface Door {
  id: string;
  between: [string, string];
  isOpen: boolean;
  isSealed: boolean;
  position: Position;
}

export interface Circuit {
  id: string;
  name: string;
  moduleId: string;
  isOn: boolean;
  priority: number;
}

export interface CrewSkills {
  repair: number;
  electrical: number;
  engineering: number;
  medical: number;
}

export interface Crew {
  id: string;
  name: string;
  avatar: string;
  skills: CrewSkills;
  health: number;
  maxHealth: number;
  injury: number;
  fatigue: number;
  hypoxia: number;
  currentModule: string;
  currentTask: Task | null;
  status: CrewStatus;
}

export interface Task {
  id: string;
  type: TaskType;
  targetId: string;
  assignedCrewId: string;
  progress: number;
  duration: number;
  startTime: number;
  materialCost?: MaterialRequirement;
}

export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: number;
  turn: number;
  message: string;
  severity: EventSeverity;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export interface Action {
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface HistoryFrame {
  turn: number;
  timestamp: number;
  stateSnapshot: Partial<GameState>;
  actions: Action[];
}

export interface GameState {
  turn: number;
  timeRemaining: number;
  overallSafety: number;
  base: {
    modules: Module[];
    pipes: Pipe[];
    doors: Door[];
    circuits: Circuit[];
  };
  inventory: Inventory;
  crew: Crew[];
  events: GameEvent[];
  activeTasks: Task[];
  status: GameStatus;
  defeatReason?: string;
  defeatAnalysis?: string[];
  history: HistoryFrame[];
  pendingActions: Action[];
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface GameConfig {
  totalTime: number;
  eventFrequency: number;
  safetyDecayRate: number;
  baseRepairSpeed: number;
  initialInventory: Inventory;
  repairMaterialCost: Record<PipeType, Record<PipeStatus, MaterialRequirement>>;
  materials: Record<MaterialType, MaterialConfig>;
  modules: Module[];
  pipes: Pipe[];
  doors: Door[];
  circuits: Circuit[];
  crew: Crew[];
}
