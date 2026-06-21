import { useGame } from '../../hooks/useGame';
import { Power, Zap, Lock, Play, Pause, SkipForward, ArrowUp, ArrowDown, Wrench, Package, Stethoscope, Undo2 } from 'lucide-react';
import type { Task } from '../../game/types';

function getTaskIcon(task: Task) {
  switch (task.type) {
    case 'repair_pipe': return Wrench;
    case 'seal_door': return Lock;
    case 'treat_crew': return Stethoscope;
    case 'restock_material': return Package;
    default: return Zap;
  }
}

function getTaskLabel(task: Task, state: any): string {
  switch (task.type) {
    case 'repair_pipe': {
      const pipe = state.base.pipes.find((p: any) => p.id === task.targetId);
      return pipe ? `修复${pipe.type === 'oxygen' ? '氧气' : '电力'}管线` : '修复管线';
    }
    case 'seal_door': {
      const door = state.base.doors.find((d: any) => d.id === task.targetId);
      const modules = state.base.modules;
      if (door) {
        const m1 = modules.find((m: any) => m.id === door.between[0]);
        const m2 = modules.find((m: any) => m.id === door.between[1]);
        return `密封舱门 (${m1?.name || '?'}↔${m2?.name || '?'})`;
      }
      return '密封舱门';
    }
    case 'treat_crew': {
      const patient = state.crew.find((c: any) => c.id === task.targetId);
      return `治疗 ${patient?.name || '队员'}`;
    }
    case 'restock_material': {
      const materialNames: Record<string, string> = { parts: '零件', oxygen_filter: '氧滤芯', battery: '电池' };
      const material = task.restockMaterial || '物资';
      return `补给${materialNames[material] || material} ×${task.restockAmount || 0}`;
    }
    default: return '执行任务';
  }
}

function getTaskColor(task: Task): string {
  switch (task.type) {
    case 'repair_pipe': return 'text-cyan-400';
    case 'seal_door': return 'text-yellow-400';
    case 'treat_crew': return 'text-pink-400';
    case 'restock_material': return 'text-green-400';
    default: return 'text-slate-400';
  }
}

function TaskPriorityQueue() {
  const { state, moveTaskUp, moveTaskDown } = useGame();
  const { activeTasks, crew } = state;

  const getCrewName = (crewId: string) => {
    const member = crew.find(c => c.id === crewId);
    return member?.name || '未知';
  };

  if (activeTasks.length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4 text-center">
        <Zap className="w-6 h-6 mx-auto mb-2 text-slate-600 opacity-50" />
        <p className="text-xs text-slate-500">暂无进行中的任务</p>
        <p className="text-xs text-slate-600 mt-1">选择队员分配任务后将显示在此处</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeTasks.map((task, index) => {
        const Icon = getTaskIcon(task);
        const isFirst = index === 0;
        const isLast = index === activeTasks.length - 1;
        const remainingTurns = Math.ceil(task.duration - (task.progress / 100) * task.duration);

        return (
          <div
            key={task.id}
            className={`p-2 rounded border transition-all ${
              isFirst
                ? 'bg-cyan-900/20 border-cyan-600/50 ring-1 ring-cyan-500/30'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveTaskUp(task.id)}
                  disabled={isFirst || state.status !== 'playing'}
                  className={`p-0.5 rounded transition-colors ${
                    isFirst || state.status !== 'playing'
                      ? 'text-slate-700 cursor-not-allowed'
                      : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-700'
                  }`}
                  title="上移优先级"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveTaskDown(task.id)}
                  disabled={isLast || state.status !== 'playing'}
                  className={`p-0.5 rounded transition-colors ${
                    isLast || state.status !== 'playing'
                      ? 'text-slate-700 cursor-not-allowed'
                      : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-700'
                  }`}
                  title="下移优先级"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-shrink-0">
                <span className="text-xs font-bold text-slate-500 w-4 text-center block">
                  {index + 1}
                </span>
              </div>

              <Icon className={`w-4 h-4 flex-shrink-0 ${getTaskColor(task)}`} />

              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium ${getTaskColor(task)} truncate`}>
                  {getTaskLabel(task, state)}
                </div>
                <div className="text-xs text-slate-500">
                  👤 {getCrewName(task.assignedCrewId)} · 剩余 {remainingTurns} 回合
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="text-xs font-bold text-cyan-400">
                  {Math.round(task.progress)}%
                </div>
              </div>
            </div>

            <div className="mt-1.5 ml-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>

            {isFirst && (
              <div className="mt-1 ml-10 text-xs text-cyan-500 font-medium">
                ▶ 当前最高优先级
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ControlPanel() {
  const { state, isPaused, toggleCircuitSwitch, endTurn, setPaused, undoLastBatch, getUndoStack } = useGame();
  const { circuits } = state.base;

  const groupedCircuits = circuits.reduce((acc, circuit) => {
    const module = state.base.modules.find(m => m.id === circuit.moduleId);
    const moduleName = module?.name || '未知';
    if (!acc[moduleName]) acc[moduleName] = [];
    acc[moduleName].push(circuit);
    return acc;
  }, {} as Record<string, typeof circuits>);

  const damagedPipes = state.base.pipes.filter(p => p.status !== 'normal').length;
  const sealedDoors = state.base.doors.filter(d => d.isSealed).length;
  const workingCrew = state.crew.filter(c => c.status === 'working').length;
  const idleCrew = state.crew.filter(c => c.status === 'idle').length;
  const undoStack = getUndoStack();
  const canUndo = undoStack.length > 0;
  const lastUndoInfo = undoStack[undoStack.length - 1];

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider">控制面板</h3>
        <div className="flex gap-2">
          <button
            onClick={undoLastBatch}
            disabled={!canUndo || state.status !== 'playing'}
            className={`flex items-center gap-1 px-3 py-2 rounded border font-bold text-xs transition-all ${
              !canUndo || state.status !== 'playing'
                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                : 'border-orange-500 bg-orange-900/30 text-orange-400 hover:bg-orange-800/50 hover:shadow-lg hover:shadow-orange-500/20'
            }`}
            title={canUndo ? lastUndoInfo?.description : '没有可撤销的操作'}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>撤销</span>
            {canUndo && (
              <span className="bg-orange-500/30 px-1.5 py-0.5 rounded-full text-[10px]">
                {undoStack.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setPaused(!isPaused)}
            disabled={state.status !== 'playing'}
            className={`p-2 rounded border transition-all ${
              state.status !== 'playing'
                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                : 'border-slate-600 text-slate-300 hover:border-cyan-400 hover:text-cyan-400'
            }`}
            title={isPaused ? '继续' : '暂停'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={endTurn}
            disabled={state.status !== 'playing'}
            className={`flex items-center gap-2 px-4 py-2 rounded border font-bold text-sm transition-all ${
              state.status !== 'playing'
                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                : 'border-cyan-500 bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/50 hover:shadow-lg hover:shadow-cyan-500/20'
            }`}
          >
            <SkipForward className="w-4 h-4" />
            结束回合
          </button>
        </div>
      </div>

      {canUndo && lastUndoInfo && (
        <div className="mb-4 p-2 bg-orange-900/20 border border-orange-500/30 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-orange-400">
              <Undo2 className="w-3 h-3" />
              <span className="font-bold">可撤销操作：</span>
            </div>
            <button
              onClick={undoLastBatch}
              className="text-orange-300 hover:text-orange-100 underline underline-offset-2"
            >
              {lastUndoInfo.description}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="p-2 bg-slate-800/50 rounded border border-slate-700 text-center">
          <div className="text-red-400 text-lg font-bold">{damagedPipes}</div>
          <div className="text-xs text-slate-500">待修管线</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded border border-slate-700 text-center">
          <div className="text-yellow-400 text-lg font-bold">{sealedDoors}</div>
          <div className="text-xs text-slate-500">已封舱门</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded border border-slate-700 text-center">
          <div className="text-green-400 text-lg font-bold">{workingCrew}</div>
          <div className="text-xs text-slate-500">工作中</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded border border-slate-700 text-center">
          <div className="text-cyan-400 text-lg font-bold">{idleCrew}</div>
          <div className="text-xs text-slate-500">可分配</div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-slate-400 text-xs font-bold mb-3 flex items-center gap-2">
          <SkipForward className="w-3 h-3 text-cyan-400" />
          任务优先级队列
          <span className="ml-auto text-xs text-slate-500 font-normal">
            按优先级顺序执行
          </span>
        </h4>
        <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
          <TaskPriorityQueue />
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4 mt-4">
        <h4 className="text-slate-400 text-xs font-bold mb-3 flex items-center gap-2">
          <Zap className="w-3 h-3 text-yellow-400" />
          电路控制
        </h4>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {Object.entries(groupedCircuits).map(([moduleName, moduleCircuits]) => (
            <div key={moduleName}>
              <div className="text-xs text-slate-500 mb-1">{moduleName}</div>
              <div className="space-y-1">
                {moduleCircuits.map(circuit => (
                  <div
                    key={circuit.id}
                    className={`flex items-center justify-between p-2 rounded border transition-all ${
                      circuit.isOn
                        ? 'bg-green-900/20 border-green-700/50'
                        : 'bg-slate-800/30 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Power
                        className={`w-3.5 h-3.5 ${circuit.isOn ? 'text-green-400' : 'text-slate-600'}`}
                      />
                      <span className={`text-sm ${circuit.isOn ? 'text-slate-200' : 'text-slate-500'}`}>
                        {circuit.name}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleCircuitSwitch(circuit.id)}
                      disabled={state.status !== 'playing'}
                      className={`w-10 h-5 rounded-full relative transition-all ${
                        circuit.isOn ? 'bg-green-500' : 'bg-slate-600'
                      } ${state.status !== 'playing' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          circuit.isOn ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      ></div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4 mt-4">
        <h4 className="text-slate-400 text-xs font-bold mb-3 flex items-center gap-2">
          <Lock className="w-3 h-3 text-red-400" />
          操作提示
        </h4>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• 点击队员卡片选中，再点击损坏管线分配维修</li>
          <li>• 点击舱门图标可分配队员进行密封</li>
          <li>• 选中队员后在仓储室点击入库可创建补给任务</li>
          <li>• 使用 ↑↓ 按钮调整任务优先级，排在前面的先执行</li>
          <li>• 密封舱门可阻止氧气扩散到已损坏区域</li>
          <li>• 关闭非必要电路可减少潜在故障点</li>
          <li>• 点击"结束回合"推进时间，按优先级执行任务</li>
        </ul>
      </div>
    </div>
  );
}
