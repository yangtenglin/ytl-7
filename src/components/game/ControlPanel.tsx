import { useGame } from '../../hooks/useGame';
import { Power, Zap, Lock, Play, Pause, SkipForward } from 'lucide-react';

export default function ControlPanel() {
  const { state, isPaused, toggleCircuitSwitch, endTurn, setPaused } = useGame();
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

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider">控制面板</h3>
        <div className="flex gap-2">
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
          <li>• 密封舱门可阻止氧气扩散到已损坏区域</li>
          <li>• 关闭非必要电路可减少潜在故障点</li>
          <li>• 点击"结束回合"推进时间，执行任务进度</li>
        </ul>
      </div>
    </div>
  );
}
