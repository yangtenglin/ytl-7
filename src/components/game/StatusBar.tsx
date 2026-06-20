import { useCountdown } from '../../hooks/useCountdown';
import { useGame } from '../../hooks/useGame';
import { Shield, Clock, Wind, Zap, AlertTriangle } from 'lucide-react';

export default function StatusBar() {
  const { formattedTime, isUrgent, isCritical } = useCountdown();
  const { state } = useGame();
  const { overallSafety, base } = state;

  const getSafetyColor = (value: number) => {
    if (value < 30) return 'text-red-400';
    if (value < 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getSafetyBg = (value: number) => {
    if (value < 30) return 'bg-red-500';
    if (value < 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const modulesWithOxygen = base.modules.filter(m => m.hasOxygen).length;
  const modulesWithPower = base.modules.filter(m => m.hasPower).length;
  const totalModules = base.modules.length;
  const criticalModules = base.modules.filter(m => m.safetyLevel < 30).length;

  return (
    <div className="bg-slate-900/80 backdrop-blur border-t border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold font-mono ${isCritical ? 'text-red-500 animate-pulse' : isUrgent ? 'text-yellow-400' : 'text-cyan-400'}`}>
              <span className="text-slate-500 text-sm mr-2">⏱</span>
              {formattedTime}
            </div>
            {isCritical && (
              <div className="flex items-center gap-1 text-red-400 text-xs animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                时间紧迫！
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-slate-700"></div>

          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${getSafetyColor(overallSafety)}`} />
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">整体安全值</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getSafetyBg(overallSafety)} transition-all duration-500 ${
                      overallSafety < 30 ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${overallSafety}%` }}
                  ></div>
                </div>
                <span className={`font-bold text-sm ${getSafetyColor(overallSafety)}`}>
                  {overallSafety}%
                </span>
              </div>
            </div>
          </div>

          {criticalModules > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-700/50 rounded-full">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-red-400 text-xs font-bold">
                {criticalModules} 个模块处于危险状态
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500">氧气供应</span>
              <span className={`text-sm font-bold ${modulesWithOxygen < totalModules ? 'text-yellow-400' : 'text-cyan-400'}`}>
                {modulesWithOxygen}/{totalModules} 模块
              </span>
            </div>
            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${(modulesWithOxygen / totalModules) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500">电力供应</span>
              <span className={`text-sm font-bold ${modulesWithPower < totalModules ? 'text-yellow-400' : 'text-green-400'}`}>
                {modulesWithPower}/{totalModules} 模块
              </span>
            </div>
            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(modulesWithPower / totalModules) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded border border-slate-700">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm">
              回合 <span className="text-cyan-400 font-bold">{state.turn}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
