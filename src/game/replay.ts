import type { GameState, HistoryFrame, Action, GameEvent } from './types';

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
