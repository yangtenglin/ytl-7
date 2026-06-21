import type { GameState, HistoryFrame, Action, GameEvent, MistakeCategory, MistakeDetail, MistakeScoreResult, Pipe, Crew, Inventory, PipeStatus, MaterialType } from './types';

export function createHistoryFrame(
  state: GameState,
  actions: Action[]
): HistoryFrame {
  return {
    turn: state.turn,
    timestamp: Date.now(),
    stateSnapshot: JSON.parse(JSON.stringify(state)),
    actions: [...actions],
  };
}

export function saveReplay(history: HistoryFrame[], finalState: GameState): void {
  const replayData = {
    history,
    finalState,
    savedAt: Date.now(),
  };
  localStorage.setItem('spaceBase_replay', JSON.stringify(replayData));
}

export function loadReplay(): { history: HistoryFrame[]; finalState: GameState } | null {
  const data = localStorage.getItem('spaceBase_replay');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function analyzeDefeat(history: HistoryFrame[], finalState: GameState): string[] {
  const analysis: string[] = [];
  const events: GameEvent[] = [];

  history.forEach(frame => {
    if (frame.stateSnapshot.events) {
      events.push(...frame.stateSnapshot.events);
    }
  });
  events.push(...finalState.events);

  const dangerEvents = events.filter(e => e.severity === 'danger');
  const warningEvents = events.filter(e => e.severity === 'warning');

  if (dangerEvents.length > 0) {
    const criticalPipes = new Set(dangerEvents.map(e => e.targetId).filter(Boolean));
    analysis.push(`检测到 ${dangerEvents.length} 次严重故障，涉及 ${criticalPipes.size} 条关键管线`);
  }

  const criticalFrames = history.filter(f => {
    const safety = f.stateSnapshot.overallSafety;
    return safety !== undefined && safety < 50;
  });

  if (criticalFrames.length > 0) {
    const firstCriticalTurn = criticalFrames[0].turn;
    analysis.push(`整体安全值在第 ${firstCriticalTurn} 回合首次降至警戒线以下`);
  }

  const disconnectedModules = finalState.base.modules.filter(m => !m.hasOxygen || !m.hasPower);
  if (disconnectedModules.length > 0) {
    const names = disconnectedModules.map(m => m.name).join('、');
    analysis.push(`失败时有 ${disconnectedModules.length} 个模块失去关键资源：${names}`);
  }

  const repairActions = history.flatMap(f =>
    f.actions.filter(a => a.type === 'assign_task')
  );

  const pendingRepairs = finalState.activeTasks.filter(t => t.type === 'repair_pipe');
  if (pendingRepairs.length > 0) {
    analysis.push(`失败时有 ${pendingRepairs.length} 项维修任务尚未完成`);
  }

  if (repairActions.length < dangerEvents.length) {
    analysis.push('维修响应速度不足，建议优先分配高技能队员处理关键故障');
  }

  const unusedCrew = finalState.crew.filter(c => c.status === 'idle');
  if (unusedCrew.length > 1) {
    analysis.push(`有 ${unusedCrew.length} 名队员在失败时处于空闲状态，未能充分利用人力资源`);
  }

  if (finalState.defeatReason) {
    analysis.unshift(`失败原因：${finalState.defeatReason}`);
  }

  if (analysis.length === 0) {
    analysis.push('系统未能检测到明确的失败原因，建议查看完整回放了解详情');
  }

  return analysis;
}

export function getKeyFrames(history: HistoryFrame[]): HistoryFrame[] {
  const keyFrames: HistoryFrame[] = [];

  history.forEach((frame, index) => {
    if (index === 0) {
      keyFrames.push(frame);
      return;
    }

    const prevSafety = history[index - 1].stateSnapshot.overallSafety ?? 100;
    const currSafety = frame.stateSnapshot.overallSafety ?? 100;

    const hasDangerEvent = frame.stateSnapshot.events?.some(
      e => e.severity === 'danger' && e.turn === frame.turn
    );

    const hasNewTask = frame.actions.some(a => a.type === 'assign_task');

    if (Math.abs(prevSafety - currSafety) >= 15 || hasDangerEvent || hasNewTask) {
      keyFrames.push(frame);
    }
  });

  return keyFrames;
}

function getPipeLabel(pipe: Pipe): string {
  const typeLabel = pipe.type === 'oxygen' ? '氧气' : '电力';
  return `${typeLabel}管线(${pipe.from}→${pipe.to})`;
}

function getCrewLabel(crew: Crew): string {
  return crew.name;
}

function countMaterials(inv: Inventory): number {
  return inv.parts + inv.oxygen_filter + inv.battery;
}

export function calculateMistakeScore(history: HistoryFrame[], finalState: GameState): MistakeScoreResult {
  const unrepairedDetails: MistakeDetail[] = [];
  const idleCrewDetails: MistakeDetail[] = [];
  const materialWasteDetails: MistakeDetail[] = [];

  const repairedPipeIdsThisTurn = (frame: HistoryFrame): Set<string> => {
    const ids = new Set<string>();
    frame.actions.forEach(a => {
      if (a.type === 'assign_task' && a.payload.taskType === 'repair_pipe' && a.payload.pipeId) {
        ids.add(a.payload.pipeId as string);
      }
    });
    return ids;
  };

  history.forEach((frame, index) => {
    const pipes: Pipe[] = frame.stateSnapshot.base?.pipes ?? [];
    const crew: Crew[] = frame.stateSnapshot.crew ?? [];
    const inventory: Inventory | undefined = frame.stateSnapshot.inventory;

    const damagedPipes = pipes.filter(p => p.status === 'damaged' || p.status === 'broken');
    if (damagedPipes.length === 0) return;

    const repairedIds = repairedPipeIdsThisTurn(frame);
    const unrepaired = damagedPipes.filter(p => !repairedIds.has(p.id));

    if (unrepaired.length > 0) {
      const brokenCount = unrepaired.filter(p => p.status === 'broken').length;
      const damagedCount = unrepaired.filter(p => p.status === 'damaged').length;
      const deduction = brokenCount * 10 + damagedCount * 5;
      const descParts: string[] = [];
      if (brokenCount > 0) descParts.push(`${brokenCount}条断裂`);
      if (damagedCount > 0) descParts.push(`${damagedCount}条损坏`);
      unrepairedDetails.push({
        turn: frame.turn,
        frameIndex: index,
        description: `${descParts.join('、')}管线未安排维修`,
        deduction,
      });
    }

    const idleCrew = crew.filter(c => c.status === 'idle');
    if (idleCrew.length > 0 && unrepaired.length > 0) {
      const deduction = Math.min(idleCrew.length, unrepaired.length) * 3;
      const names = idleCrew.map(c => getCrewLabel(c)).join('、');
      idleCrewDetails.push({
        turn: frame.turn,
        frameIndex: index,
        description: `${names} 空闲未分配，同时有${unrepaired.length}条待修管线`,
        deduction,
      });
    }

    if (inventory && unrepaired.length > 0 && idleCrew.length > 0 && repairedIds.size === 0) {
      const totalMats = countMaterials(inventory);
      const wasteRatio = totalMats > 0 ? Math.min(1, idleCrew.length / crew.length) : 0;
      const deduction = Math.round(totalMats * wasteRatio * 0.3);
      if (deduction > 0) {
        materialWasteDetails.push({
          turn: frame.turn,
          frameIndex: index,
          description: `持有${totalMats}单位物资未使用，${idleCrew.length}名队员闲置`,
          deduction,
        });
      }
    }
  });

  const finalActiveRepairs = finalState.activeTasks.filter(t => t.type === 'repair_pipe');
  finalActiveRepairs.forEach(task => {
    const cost = task.materialCost;
    if (cost) {
      const wasted = (cost.parts ?? 0) + (cost.oxygen_filter ?? 0) + (cost.battery ?? 0);
      if (wasted > 0) {
        materialWasteDetails.push({
          turn: task.startTime,
          frameIndex: history.findIndex(f => f.turn === task.startTime),
          description: `未完成维修浪费${wasted}单位物资`,
          deduction: wasted * 2,
        });
      }
    }
  });

  const unrepairedCategory: MistakeCategory = {
    key: 'unrepaired_pipes',
    label: '未修管线',
    totalDeduction: unrepairedDetails.reduce((s, d) => s + d.deduction, 0),
    details: unrepairedDetails,
  };

  const idleCategory: MistakeCategory = {
    key: 'idle_crew',
    label: '空闲队员',
    totalDeduction: idleCrewDetails.reduce((s, d) => s + d.deduction, 0),
    details: idleCrewDetails,
  };

  const wasteCategory: MistakeCategory = {
    key: 'material_waste',
    label: '物资浪费',
    totalDeduction: materialWasteDetails.reduce((s, d) => s + d.deduction, 0),
    details: materialWasteDetails,
  };

  const categories = [unrepairedCategory, idleCategory, wasteCategory];
  const totalDeduction = categories.reduce((s, c) => s + c.totalDeduction, 0);

  return { categories, totalDeduction };
}
