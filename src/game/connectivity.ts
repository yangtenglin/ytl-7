import type { Module, Pipe, Door } from './types';

export function calculateOxygenConnectivity(
  modules: Module[],
  pipes: Pipe[],
  doors: Door[]
): Map<string, boolean> {
  const oxygenMap = new Map<string, boolean>();
  const oxygenPipes = pipes.filter(p => p.type === 'oxygen' && p.status === 'normal');

  const adjacencyList = new Map<string, string[]>();
  modules.forEach(m => adjacencyList.set(m.id, []));

  oxygenPipes.forEach(pipe => {
    adjacencyList.get(pipe.from)?.push(pipe.to);
    adjacencyList.get(pipe.to)?.push(pipe.from);
  });

  doors
    .filter(d => d.isOpen && !d.isSealed)
    .forEach(door => {
      adjacencyList.get(door.between[0])?.push(door.between[1]);
      adjacencyList.get(door.between[1])?.push(door.between[0]);
    });

  const oxygenSources = modules.filter(m => m.isOxygenGenerator && !m.isSealed);
  const visited = new Set<string>();
  const queue: string[] = [];

  oxygenSources.forEach(source => {
    if (!source.isSealed) {
      queue.push(source.id);
      visited.add(source.id);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    oxygenMap.set(current, true);

    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const neighborModule = modules.find(m => m.id === neighbor);
        if (neighborModule && !neighborModule.isSealed) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  modules.forEach(m => {
    if (!oxygenMap.has(m.id)) {
      oxygenMap.set(m.id, false);
    }
  });

  return oxygenMap;
}

export function calculatePowerConnectivity(
  modules: Module[],
  pipes: Pipe[]
): Map<string, boolean> {
  const powerMap = new Map<string, boolean>();
  const powerPipes = pipes.filter(p => p.type === 'power' && p.status === 'normal');

  const adjacencyList = new Map<string, string[]>();
  modules.forEach(m => adjacencyList.set(m.id, []));

  powerPipes.forEach(pipe => {
    adjacencyList.get(pipe.from)?.push(pipe.to);
    adjacencyList.get(pipe.to)?.push(pipe.from);
  });

  const powerSources = modules.filter(m => m.isPowerSource);
  const visited = new Set<string>();
  const queue: string[] = [];

  powerSources.forEach(source => {
    queue.push(source.id);
    visited.add(source.id);
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    powerMap.set(current, true);

    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  modules.forEach(m => {
    if (!powerMap.has(m.id)) {
      powerMap.set(m.id, false);
    }
  });

  return powerMap;
}

export function getDisconnectedModules(
  oxygenMap: Map<string, boolean>,
  powerMap: Map<string, boolean>
): { noOxygen: string[]; noPower: string[] } {
  const noOxygen: string[] = [];
  const noPower: string[] = [];

  oxygenMap.forEach((hasOxygen, moduleId) => {
    if (!hasOxygen) noOxygen.push(moduleId);
  });

  powerMap.forEach((hasPower, moduleId) => {
    if (!hasPower) noPower.push(moduleId);
  });

  return { noOxygen, noPower };
}
