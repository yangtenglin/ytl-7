import type { Module } from './types';

export function updateOxygenLevels(
  modules: Module[],
  hasOxygenMap: Map<string, boolean>,
  decayRate: number
): { updatedModules: Module[]; safetyDrops: { moduleId: string; amount: number }[] } {
  const safetyDrops: { moduleId: string; amount: number }[] = [];

  const updatedModules = modules.map(module => {
    const hasOxygen = hasOxygenMap.get(module.id) ?? false;
    let newOxygenLevel = module.oxygenLevel;
    let newSafetyLevel = module.safetyLevel;

    if (hasOxygen && !module.isSealed) {
      newOxygenLevel = Math.min(100, module.oxygenLevel + 5);
      if (module.oxygenLevel < 50) {
        newSafetyLevel = Math.min(100, module.safetyLevel + 2);
      }
    } else {
      newOxygenLevel = Math.max(0, module.oxygenLevel - 15);

      if (newOxygenLevel < 30) {
        const dropAmount = Math.floor((10 + Math.random() * 5) * decayRate);
        newSafetyLevel = Math.max(0, module.safetyLevel - dropAmount);
        safetyDrops.push({ moduleId: module.id, amount: dropAmount });
      }
    }

    return {
      ...module,
      oxygenLevel: newOxygenLevel,
      safetyLevel: newSafetyLevel,
      hasOxygen,
    };
  });

  return { updatedModules, safetyDrops };
}

export function calculateOverallSafety(modules: Module[]): number {
  const totalWeight = modules.reduce((sum, m) => sum + m.weight, 0);
  const weightedSum = modules.reduce((sum, m) => sum + m.safetyLevel * m.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

export function getCriticalModules(modules: Module[]): Module[] {
  return modules.filter(m => m.safetyLevel < 30);
}
