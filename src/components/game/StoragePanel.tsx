import { useState } from 'react';
import { useGame } from '../../hooks/useGame';
import { baseConfig } from '../../game/config';
import type { MaterialType, MaterialRequirement } from '../../game/types';
import { Package, Plus, Minus, AlertTriangle } from 'lucide-react';

const materialBarColors: Record<MaterialType, string> = {
  parts: 'bg-cyan-500',
  oxygen_filter: 'bg-blue-500',
  battery: 'bg-yellow-500',
};

const materialBorderColors: Record<MaterialType, string> = {
  parts: 'border-cyan-500/30',
  oxygen_filter: 'border-blue-500/30',
  battery: 'border-yellow-500/30',
};

const materialBgColors: Record<MaterialType, string> = {
  parts: 'bg-cyan-900/20',
  oxygen_filter: 'bg-blue-900/20',
  battery: 'bg-yellow-900/20',
};

const materialTextColors: Record<MaterialType, string> = {
  parts: 'text-cyan-400',
  oxygen_filter: 'text-blue-400',
  battery: 'text-yellow-400',
};

export default function StoragePanel() {
  const { state, restockMaterial, assignSupplyTask, selectedCrew, showNotification } = useGame();
  const { inventory, crew } = state;
  const [restockAmounts, setRestockAmounts] = useState<Record<MaterialType, number>>({
    parts: 1,
    oxygen_filter: 1,
    battery: 1,
  });
  const [showRestock, setShowRestock] = useState<MaterialType | null>(null);

  const materials: MaterialType[] = ['parts', 'oxygen_filter', 'battery'];

  const selectedCrewData = crew.find(c => c.id === selectedCrew);
  const canAssignSupply = selectedCrewData && selectedCrewData.status === 'idle' && selectedCrewData.health > 0;

  const handleAmountChange = (material: MaterialType, delta: number) => {
    setRestockAmounts(prev => ({
      ...prev,
      [material]: Math.max(1, Math.min(10, prev[material] + delta)),
    }));
  };

  const handleRestock = (material: MaterialType) => {
    const amount = restockAmounts[material];
    if (selectedCrew && canAssignSupply) {
      assignSupplyTask(selectedCrew, material, amount);
    } else {
      restockMaterial(material, amount);
    }
    setShowRestock(null);
    setRestockAmounts(prev => ({ ...prev, [material]: 1 }));
  };

  const requiredForRepairs = ((): MaterialRequirement => {
    const damagedPipes = state.base.pipes.filter(p => p.status !== 'normal');
    const total: MaterialRequirement = { parts: 0, oxygen_filter: 0, battery: 0 };
    damagedPipes.forEach(pipe => {
      const cost = baseConfig.repairMaterialCost[pipe.type][pipe.status];
      if (cost.parts) total.parts = (total.parts || 0) + cost.parts;
      if (cost.oxygen_filter) total.oxygen_filter = (total.oxygen_filter || 0) + cost.oxygen_filter;
      if (cost.battery) total.battery = (total.battery || 0) + cost.battery;
    });
    return total;
  })();
  const damagedCount = state.base.pipes.filter(p => p.status !== 'normal').length;

  const isLow = (material: MaterialType): boolean => {
    const required = requiredForRepairs[material] || 0;
    return inventory[material] < required || inventory[material] <= 2;
  };

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4" />
          仓储室物资
        </h3>
        {damagedCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            <span>{damagedCount} 处待修</span>
          </div>
        )}
      </div>

      {damagedCount > 0 && (
        <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
          <div className="text-yellow-400 font-bold mb-1">维修所需材料总计：</div>
          <div className="flex gap-3 text-slate-300">
            {(requiredForRepairs.parts || 0) > 0 && (
              <span>
                🔧 零件 <span className={inventory.parts < (requiredForRepairs.parts || 0) ? 'text-red-400' : 'text-green-400'}>
                  {inventory.parts}/{requiredForRepairs.parts}
                </span>
              </span>
            )}
            {(requiredForRepairs.oxygen_filter || 0) > 0 && (
              <span>
                🫁 氧滤芯 <span className={inventory.oxygen_filter < (requiredForRepairs.oxygen_filter || 0) ? 'text-red-400' : 'text-green-400'}>
                  {inventory.oxygen_filter}/{requiredForRepairs.oxygen_filter}
                </span>
              </span>
            )}
            {(requiredForRepairs.battery || 0) > 0 && (
              <span>
                🔋 电池 <span className={inventory.battery < (requiredForRepairs.battery || 0) ? 'text-red-400' : 'text-green-400'}>
                  {inventory.battery}/{requiredForRepairs.battery}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 flex-1">
        {materials.map(material => {
          const config = baseConfig.materials[material];
          const amount = inventory[material];
          const low = isLow(material);

          return (
            <div
              key={material}
              className={`p-3 rounded-lg border transition-all ${
                low
                  ? `${materialBorderColors[material]} ${materialBgColors[material]} border-red-500/50`
                  : `border-slate-700 bg-slate-800/50 hover:border-slate-600`
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{config.icon}</span>
                  <div>
                    <div className={`font-bold text-sm ${materialTextColors[material]}`}>
                      {config.name}
                    </div>
                    <div className="text-xs text-slate-500">{config.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${low ? 'text-red-400' : materialTextColors[material]}`}>
                    {amount}
                  </div>
                  {low && (
                    <div className="text-xs text-red-400 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      库存不足
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${materialBarColors[material]} transition-all duration-300`}
                    style={{ width: `${Math.min(100, (amount / 20) * 100)}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => setShowRestock(showRestock === material ? null : material)}
                  disabled={state.status !== 'playing'}
                  className={`p-1.5 rounded border transition-all text-xs ${
                    state.status !== 'playing'
                      ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                      : 'border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-400'
                  }`}
                  title="入库"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {showRestock === material && (
                <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAmountChange(material, -1)}
                      className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm text-white font-bold">
                      {restockAmounts[material]}
                    </span>
                    <button
                      onClick={() => handleAmountChange(material, 1)}
                      className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRestock(material)}
                    className={`px-3 py-1.5 rounded text-white text-xs font-bold transition-colors ${
                      selectedCrew && canAssignSupply
                        ? 'bg-green-600 hover:bg-green-500'
                        : 'bg-cyan-600 hover:bg-cyan-500'
                    }`}
                  >
                    {selectedCrew && canAssignSupply
                      ? `分配 ${selectedCrewData?.name} 搬运 ×${restockAmounts[material]}`
                      : `立即入库 ×${restockAmounts[material]}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500 space-y-1">
          <p>• 氧气/电力管线损坏维修需要消耗零件和对应材料</p>
          <p>• 损坏(damaged)需 1 份材料，断裂(broken)需 2 份</p>
          <p>• 材料不足时维修按钮将被禁用</p>
          <p className="text-green-400">• 💡 选中空闲队员后点击入库，可创建补给任务加入优先级队列</p>
          <p className="text-cyan-400">• 未选中队员时点击入库，物资将立即到账</p>
        </div>
      </div>
    </div>
  );
}
