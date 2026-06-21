import type { Module, Pipe, Circuit } from './types';

export function updatePowerStatus(
  modules: Module[],
  hasPowerMap: Map<string, boolean>
): Module[] {
  return modules.map(module => ({
    ...module,
    hasPower: hasPowerMap.get(module.id) ?? false,
  }));
}

export function toggleCircuit(
  circuits: Circuit[],
  circuitId: string
): { circuits: Circuit[]; success: boolean; message: string } {
  const circuit = circuits.find(c => c.id === circuitId);
  if (!circuit) {
    return { circuits, success: false, message: '电路不存在' };
  }

  const updatedCircuits = circuits.map(c =>
    c.id === circuitId ? { ...c, isOn: !c.isOn } : c
  );

  return {
    circuits: updatedCircuits,
    success: true,
    message: `${circuit.name} 已${circuit.isOn ? '关闭' : '开启'}`,
  };
}

export function getPowerConsumption(circuits: Circuit[]): number {
  return circuits.filter(c => c.isOn).reduce((sum, c) => sum + c.priority, 0);
}

export function repairPipe(pipe: Pipe): Pipe {
  return {
    ...pipe,
    status: 'normal' as const,
    damageLevel: 0,
  };
}

export function damagePipe(pipe: Pipe, severity: 'minor' | 'major' | 'critical'): Pipe {
  const damageMap = {
    minor: { status: 'damaged' as const, level: 30 },
    major: { status: 'damaged' as const, level: 60 },
    critical: { status: 'broken' as const, level: 100 },
  };

  const damage = damageMap[severity];
  return {
    ...pipe,
    status: damage.status,
    damageLevel: Math.min(100, pipe.damageLevel + damage.level),
  };
}

export function calculateRepairDuration(
  pipe: Pipe,
  crewSkill: number,
  baseSpeed: number,
  fatigue: number = 0
): number {
  const damageFactor = pipe.damageLevel / 50;
  const skillBonus = 1 + crewSkill / 100;
  const fatiguePenalty = 1 + fatigue / 100;
  const baseDuration = 2 + damageFactor;
  return Math.ceil((baseDuration * fatiguePenalty) / (baseSpeed * skillBonus));
}
