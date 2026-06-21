import { useCountdown } from '../../hooks/useCountdown';
import { useGame } from '../../hooks/useGame';
import { baseConfig } from '../../game/config';
import type { MaterialType } from '../../game/types';
import { Shield, Clock, Wind, Zap, AlertTriangle, Package } from 'lucide-react';

export default function StatusBar() {
  const { formattedTime, isUrgent, isCritical } = useCountdown();
  const { state, getMaterialAlertStatus } = useGame();
  const { overallSafety, base, inventory } = state;
  const materialAlert = getMaterialAlertStatus();

  const materials: MaterialType[] = ['parts', 'oxygen_filter', 'battery'];

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

  const getMaterialStatusColor = (material: MaterialType): string => {
    const amount = inventory[material];
    const threshold = baseConfig.materials[material].alertThreshold;
    if (amount <= 0) return 'text-red-500';
    if (amount <= threshold) return 'text-yellow-400';
    const materialColors: Record<MaterialType, string> = {
      parts: 'text-cyan-400',
      oxygen_filter: 'text-blue-400',
      battery: 'text-yellow-400',
    };
    return materialColors[material];
  };

  const getMaterialStatusBg = (material: MaterialType): string => {
    const amount = inventory[material];
    const threshold = baseConfig.materials[material].alertThreshold;
    if (amount <= 0) return 'bg-red-500';
    if (amount <= threshold) return 'bg-yellow-500';
    const materialColors: Record<MaterialType, string> = {
      parts: 'bg-cyan-500',
      oxygen_filter: 'bg-blue-500',
      battery: 'bg-yellow-500',
    };
    return materialColors[material];
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

          {materialAlert.anyLow && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-900/30 border border-yellow-700/50 rounded-full animate-pulse">
              <Package className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold">物资告警：</span>
              {materialAlert.lowMaterials.map((material, idx) => {
                const config = baseConfig.materials[material];
                const isDepleted = inventory[material] <= 0;
                return (
                  <span
                    key={material}
                    className={`flex items-center gap-1 text-xs font-bold ${
                      isDepleted ? 'text-red-400' : 'text-yellow-400'
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span>{config.name}{isDepleted ? '已耗尽' : '不足'}</span>
                    {idx < materialAlert.lowMaterials.length - 1 && <span className="text-yellow-600 mx-0.5">|</span>}
                  </span>
                );
              })}
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

          <div className="h-8 w-px bg-slate-700"></div>

          <div className="flex items-center gap-3">
            {materials.map(material => {
              const config = baseConfig.materials[material];
              const amount = inventory[material];
              const threshold = baseConfig.materials[material].alertThreshold;
              const isLow = amount <= threshold;
              const isDepleted = amount <= 0;
              return (
                <div key={material} className="flex items-center gap-1.5">
                  <span className="text-sm">{config.icon}</span>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold ${
                      isDepleted ? 'text-red-500 animate-pulse' : isLow ? 'text-yellow-400 animate-pulse' : getMaterialStatusColor(material)
                    }`}>
                      {amount}
                    </span>
                    <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getMaterialStatusBg(material)} transition-all duration-300 ${
                          isLow ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${Math.min(100, (amount / 20) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
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
