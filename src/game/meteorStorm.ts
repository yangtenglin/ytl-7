import type { ShieldNode, Meteor, DamageReport, Module, MeteorStormState } from './types';
import { baseConfig } from './config';

export function createInitialMeteorStormState(difficulty: 'easy' | 'normal' | 'hard'): MeteorStormState {
  const settings = getMeteorStormSettings(difficulty);
  return {
    phase: 'idle',
    countdown: settings.prepTime,
    meteors: [],
    shieldNodes: JSON.parse(JSON.stringify(baseConfig.shieldNodes)),
    totalPower: settings.totalPower,
    allocatedPower: 0,
    damageReports: [],
    stormWave: 0,
  };
}

export function getMeteorStormSettings(difficulty: 'easy' | 'normal' | 'hard') {
  const settings: Record<string, { totalPower: number; prepTime: number; stormDuration: number; meteorCount: number; damageMultiplier: number }> = {
    easy: { totalPower: 100, prepTime: 45, stormDuration: 10, meteorCount: 15, damageMultiplier: 0.7 },
    normal: { totalPower: 80, prepTime: 30, stormDuration: 15, meteorCount: 20, damageMultiplier: 1 },
    hard: { totalPower: 60, prepTime: 20, stormDuration: 20, meteorCount: 30, damageMultiplier: 1.5 },
  };
  return settings[difficulty];
}

export function allocatePower(
  shieldNodes: ShieldNode[],
  shieldId: string,
  power: number,
  totalPower: number
): { shieldNodes: ShieldNode[]; allocatedPower: number } {
  const shieldIndex = shieldNodes.findIndex(s => s.id === shieldId);
  if (shieldIndex === -1) return { shieldNodes, allocatedPower: 0 };

  const currentAllocated = shieldNodes.reduce((sum, s) => sum + s.powerAllocation, 0);
  const shield = shieldNodes[shieldIndex];
  const otherAllocated = currentAllocated - shield.powerAllocation;

  const maxForThisShield = Math.min(shield.maxPowerAllocation, totalPower - otherAllocated);
  const actualPower = Math.max(0, Math.min(maxForThisShield, power));

  const updatedNodes = [...shieldNodes];
  updatedNodes[shieldIndex] = { ...shield, powerAllocation: actualPower };

  const newAllocated = updatedNodes.reduce((sum, s) => sum + s.powerAllocation, 0);

  return { shieldNodes: updatedNodes, allocatedPower: newAllocated };
}

export function resetPowerAllocation(shieldNodes: ShieldNode[]): ShieldNode[] {
  return shieldNodes.map(s => ({ ...s, powerAllocation: 0 }));
}

export function calculateShieldStrength(shield: ShieldNode): number {
  if (shield.powerAllocation === 0) return 0;
  const powerRatio = shield.powerAllocation / shield.maxPowerAllocation;
  return shield.maxDurability * (0.3 + powerRatio * 0.7);
}

export function isMeteorInShieldCoverage(meteor: Meteor, shield: ShieldNode): boolean {
  const dx = meteor.x - shield.position.x;
  const dy = meteor.y - shield.position.y;
  const meteorAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  let angleDiff = Math.abs(meteorAngle - shield.angle);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  
  return angleDiff <= shield.coverage / 2;
}

export function generateMeteors(count: number, difficulty: 'easy' | 'normal' | 'hard'): Meteor[] {
  const settings = getMeteorStormSettings(difficulty);
  const meteors: Meteor[] = [];
  const colors = ['#ff6b6b', '#ffa502', '#ff7f50', '#dc143c', '#ff4500'];
  
  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number, vx: number, vy: number;
    
    const speed = 1 + Math.random() * 2;
    
    switch (side) {
      case 0:
        x = Math.random() * 520;
        y = -20;
        vx = (Math.random() - 0.5) * 1;
        vy = speed;
        break;
      case 1:
        x = 540;
        y = Math.random() * 580;
        vx = -speed;
        vy = (Math.random() - 0.5) * 1;
        break;
      case 2:
        x = Math.random() * 520;
        y = 600;
        vx = (Math.random() - 0.5) * 1;
        vy = -speed;
        break;
      default:
        x = -20;
        y = Math.random() * 580;
        vx = speed;
        vy = (Math.random() - 0.5) * 1;
        break;
    }
    
    const sizeRoll = Math.random();
    let size: 'small' | 'medium' | 'large';
    let damage: number;
    
    if (sizeRoll < 0.5) {
      size = 'small';
      damage = 5 + Math.random() * 10;
    } else if (sizeRoll < 0.85) {
      size = 'medium';
      damage = 15 + Math.random() * 15;
    } else {
      size = 'large';
      damage = 30 + Math.random() * 20;
    }
    
    meteors.push({
      id: `meteor_${i}_${Date.now()}`,
      x,
      y,
      vx,
      vy,
      size,
      damage: damage * settings.damageMultiplier,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  
  return meteors;
}

export function updateMeteors(meteors: Meteor[], deltaTime: number = 1): Meteor[] {
  return meteors
    .map(m => ({
      ...m,
      x: m.x + m.vx * deltaTime * 2,
      y: m.y + m.vy * deltaTime * 2,
    }))
    .filter(m => m.x > -50 && m.x < 570 && m.y > -50 && m.y < 630);
}

export function checkShieldHits(
  meteors: Meteor[],
  shieldNodes: ShieldNode[]
): { remainingMeteors: Meteor[]; updatedShields: ShieldNode[]; destroyedMeteorIds: string[] } {
  let remainingMeteors = [...meteors];
  const updatedShields = shieldNodes.map(s => ({ ...s }));
  const destroyedMeteorIds: string[] = [];
  
  updatedShields.forEach(shield => {
    const shieldStrength = calculateShieldStrength(shield);
    if (shieldStrength <= 0 || shield.currentDurability <= 0) return;
    
    const meteorsToRemove: string[] = [];
    
    remainingMeteors.forEach(meteor => {
      if (destroyedMeteorIds.includes(meteor.id)) return;
      if (!isMeteorInShieldCoverage(meteor, shield)) return;
      
      const dx = meteor.x - shield.position.x;
      const dy = meteor.y - shield.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 60) {
        const damageAbsorbed = Math.min(meteor.damage, shield.currentDurability);
        shield.currentDurability = Math.max(0, shield.currentDurability - damageAbsorbed);
        
        if (shield.currentDurability > 0 || damageAbsorbed >= meteor.damage) {
          meteorsToRemove.push(meteor.id);
        }
      }
    });
    
    meteorsToRemove.forEach(id => {
      if (!destroyedMeteorIds.includes(id)) {
        destroyedMeteorIds.push(id);
      }
    });
  });
  
  remainingMeteors = remainingMeteors.filter(m => !destroyedMeteorIds.includes(m.id));
  
  return { remainingMeteors, updatedShields, destroyedMeteorIds };
}

export function checkModuleHits(
  meteors: Meteor[],
  modules: Module[]
): { damageReports: DamageReport[]; hitMeteorIds: string[] } {
  const damageReports: DamageReport[] = [];
  const hitMeteorIds: string[] = [];
  
  modules.forEach(module => {
    let totalDamage = 0;
    
    meteors.forEach(meteor => {
      if (hitMeteorIds.includes(meteor.id)) return;
      
      const moduleCenterX = module.position.x + module.position.width / 2;
      const moduleCenterY = module.position.y + module.position.height / 2;
      
      const dx = meteor.x - moduleCenterX;
      const dy = meteor.y - moduleCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const hitRadius = Math.max(module.position.width, module.position.height) / 2 + 10;
      
      if (distance < hitRadius) {
        totalDamage += meteor.damage;
        hitMeteorIds.push(meteor.id);
      }
    });
    
    if (totalDamage > 0) {
      damageReports.push({
        moduleId: module.id,
        damage: Math.round(totalDamage),
        destroyed: totalDamage >= 50,
      });
    }
  });
  
  return { damageReports, hitMeteorIds };
}

export function applyDamageToModules(modules: Module[], damageReports: DamageReport[]): Module[] {
  return modules.map(module => {
    const report = damageReports.find(r => r.moduleId === module.id);
    if (!report) return module;
    
    const newSafetyLevel = Math.max(0, module.safetyLevel - report.damage);
    
    return {
      ...module,
      safetyLevel: newSafetyLevel,
    };
  });
}

export function startMeteorStorm(
  state: MeteorStormState,
  difficulty: 'easy' | 'normal' | 'hard'
): MeteorStormState {
  const settings = getMeteorStormSettings(difficulty);
  const meteors = generateMeteors(settings.meteorCount, difficulty);
  
  return {
    ...state,
    phase: 'storm',
    meteors,
    stormWave: state.stormWave + 1,
    damageReports: [],
  };
}

export function startPrepPhase(
  state: MeteorStormState,
  difficulty: 'easy' | 'normal' | 'hard'
): MeteorStormState {
  const settings = getMeteorStormSettings(difficulty);
  
  const resetShields = state.shieldNodes.map(s => ({
    ...s,
    currentDurability: s.maxDurability,
    powerAllocation: 0,
  }));
  
  return {
    ...state,
    phase: 'prep',
    countdown: settings.prepTime,
    shieldNodes: resetShields,
    meteors: [],
    damageReports: [],
    allocatedPower: 0,
  };
}

export function stormTick(
  state: MeteorStormState,
  modules: Module[],
  deltaTime: number = 1
): { stormState: MeteorStormState; updatedModules: Module[]; newDamageReports: DamageReport[] } {
  let updatedMeteors = updateMeteors(state.meteors, deltaTime);
  
  const shieldResult = checkShieldHits(updatedMeteors, state.shieldNodes);
  updatedMeteors = shieldResult.remainingMeteors;
  
  const moduleHitResult = checkModuleHits(updatedMeteors, modules);
  const updatedModules = applyDamageToModules(modules, moduleHitResult.damageReports);
  
  updatedMeteors = updatedMeteors.filter(m => !moduleHitResult.hitMeteorIds.includes(m.id));
  
  const allDamageReports = [...state.damageReports];
  moduleHitResult.damageReports.forEach(newReport => {
    const existingIndex = allDamageReports.findIndex(r => r.moduleId === newReport.moduleId);
    if (existingIndex !== -1) {
      allDamageReports[existingIndex] = {
        ...allDamageReports[existingIndex],
        damage: allDamageReports[existingIndex].damage + newReport.damage,
        destroyed: allDamageReports[existingIndex].destroyed || newReport.destroyed,
      };
    } else {
      allDamageReports.push(newReport);
    }
  });
  
  return {
    stormState: {
      ...state,
      meteors: updatedMeteors,
      shieldNodes: shieldResult.updatedShields,
      damageReports: allDamageReports,
    },
    updatedModules,
    newDamageReports: moduleHitResult.damageReports,
  };
}
