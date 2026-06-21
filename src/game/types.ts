export type MaterialType = 'parts' | 'oxygen_filter' | 'battery';

export type ModuleType = 'command' | 'living' | 'lab' | 'storage' | 'engine' | 'airlock';

export type PipeStatus = 'normal' | 'damaged' | 'broken';

export type PipeType = 'oxygen' | 'power';

export type CrewStatus = 'idle' | 'moving' | 'working' | 'resting';

export type TaskType = 'repair_pipe' | 'seal_door' | 'switch_circuit' | 'move' | 'treat_crew' | 'restock_material' | 'rest';

export type EventSeverity = 'info' | 'warning' | 'danger' | 'success';

export type EventType = 'pipe_damage' | 'power_failure' | 'oxygen_leak' | 'fire' | 'system_repaired' | 'crew_action' | 'safety_drop' | 'door_sealed' | 'crew_injured' | 'crew_treated' | 'crew_hypoxia';

export type GameStatus = 'playing' | 'victory' | 'defeat';

export type ActionType = 'assign_task' | 'seal_door' | 'switch_circuit' | 'end_turn' | 'restock_material' | 'undo_batch';

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
  alertThreshold: number;
}

export interface MaterialAlertState {
  parts: boolean;
  oxygen_filter: boolean;
  battery: boolean;
  anyLow: boolean;
  lowMaterials: MaterialType[];
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
  restockMaterial?: MaterialType;
  restockAmount?: number;
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
  batchId?: string;
  relatedTaskId?: string;
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
  meteorStorm: MeteorStormState;
  undoStack: UndoInfo[];
}

export interface ShieldNode {
  id: string;
  name: string;
  position: { x: number; y: number };
  angle: number;
  coverage: number;
  maxDurability: number;
  currentDurability: number;
  powerAllocation: number;
  maxPowerAllocation: number;
  moduleId: string;
}

export interface Meteor {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: 'small' | 'medium' | 'large';
  damage: number;
  color: string;
}

export interface MeteorStormConfig {
  totalPower: number;
  prepTime: number;
  stormDuration: number;
  meteorCount: number;
  damageMultiplier: number;
}

export interface DamageReport {
  moduleId: string;
  damage: number;
  destroyed: boolean;
}

export interface MeteorStormState {
  phase: 'idle' | 'prep' | 'storm' | 'result';
  countdown: number;
  meteors: Meteor[];
  shieldNodes: ShieldNode[];
  totalPower: number;
  allocatedPower: number;
  damageReports: DamageReport[];
  stormWave: number;
}

export interface EnergyPreset {
  id: string;
  name: string;
  shieldAllocations: Record<string, number>;
  totalDamage: number;
  damageReports: DamageReport[];
  grade: string;
  gradeDesc: string;
  savedAt: number;
}

export interface MistakeDetail {
  turn: number;
  frameIndex: number;
  description: string;
  deduction: number;
}

export interface MistakeCategory {
  key: 'unrepaired_pipes' | 'idle_crew' | 'material_waste';
  label: string;
  totalDeduction: number;
  details: MistakeDetail[];
}

export interface MistakeScoreResult {
  categories: MistakeCategory[];
  totalDeduction: number;
}

export interface UndoInfo {
  batchId: string;
  actionCount: number;
  description: string;
  createdAt: number;
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
  meteorStorm: MeteorStormConfig;
  shieldNodes: ShieldNode[];
}
