import type { GameEvent, Pipe, Module, EventSeverity } from './types';

let eventIdCounter = 0;

export function createEvent(
  type: GameEvent['type'],
  turn: number,
  message: string,
  severity: EventSeverity,
  targetId?: string,
  metadata?: Record<string, unknown>
): GameEvent {
  return {
    id: `event_${++eventIdCounter}_${Date.now()}`,
    type,
    timestamp: Date.now(),
    turn,
    message,
    severity,
    targetId,
    metadata,
  };
}

export function generateRandomEvent(
  turn: number,
  pipes: Pipe[],
  modules: Module[],
  frequency: number
): { event: GameEvent | null; pipeDamage: { pipeId: string; severity: 'minor' | 'major' | 'critical' } | null } {
  if (Math.random() > frequency) {
    return { event: null, pipeDamage: null };
  }

  const eventTypes = ['pipe_damage', 'oxygen_leak', 'power_failure'] as const;
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  const normalPipes = pipes.filter(p => p.status === 'normal');

  if (normalPipes.length === 0) {
    return { event: null, pipeDamage: null };
  }

  const targetPipe = normalPipes[Math.floor(Math.random() * normalPipes.length)];
  const connectedModule = modules.find(m => m.id === targetPipe.from || m.id === targetPipe.to);

  const severityRoll = Math.random();
  let severity: 'minor' | 'major' | 'critical';
  if (severityRoll < 0.5) severity = 'minor';
  else if (severityRoll < 0.85) severity = 'major';
  else severity = 'critical';

  const pipeType = targetPipe.type === 'oxygen' ? '氧气管线' : '电力管线';
  const moduleName = connectedModule?.name || '未知区域';

  let message = '';
  switch (eventType) {
    case 'pipe_damage':
      message = `${moduleName}的${pipeType}发生${severity === 'critical' ? '严重' : severity === 'major' ? '中度' : '轻微'}损坏！`;
      break;
    case 'oxygen_leak':
      message = `${moduleName}检测到氧气泄漏！`;
      break;
    case 'power_failure':
      message = `${moduleName}的电力系统出现故障！`;
      break;
  }

  const event = createEvent(
    eventType,
    turn,
    message,
    severity === 'critical' ? 'danger' : severity === 'major' ? 'warning' : 'warning',
    targetPipe.id,
    { pipeId: targetPipe.id, severity }
  );

  return {
    event,
    pipeDamage: { pipeId: targetPipe.id, severity },
  };
}

export function getSeverityColor(severity: EventSeverity): string {
  switch (severity) {
    case 'danger':
      return 'text-red-400';
    case 'warning':
      return 'text-yellow-400';
    case 'success':
      return 'text-green-400';
    case 'info':
    default:
      return 'text-cyan-400';
  }
}
