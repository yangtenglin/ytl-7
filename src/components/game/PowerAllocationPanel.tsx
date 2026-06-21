import { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../../hooks/useGame';
import { calculateShieldStrength } from '../../game/meteorStorm';
import { Zap, Shield, RotateCcw, Info } from 'lucide-react';

interface SliderProps {
  shield: {
    id: string;
    name: string;
    angle: number;
    powerAllocation: number;
    maxPowerAllocation: number;
    maxDurability: number;
  };
  disabled?: boolean;
  onChange: (id: string, value: number) => void;
}

function PowerSlider({ shield, disabled, onChange }: SliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const strength = calculateShieldStrength({
    ...shield,
    currentDurability: shield.maxDurability,
    position: { x: 0, y: 0 },
    coverage: 90,
    moduleId: '',
  });
  const strengthPercent = (strength / shield.maxDurability) * 100;

  const getShieldStatusColor = (): string => {
    const ratio = strengthPercent / 100;
    if (ratio > 0.6) return 'text-cyan-400';
    if (ratio > 0.3) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getShieldBgColor = (): string => {
    const ratio = strengthPercent / 100;
    if (ratio > 0.6) return 'bg-cyan-500';
    if (ratio > 0.3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDirectionLabel = (angle: number): string => {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return '→ 东';
    if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return '↘ 东南';
    if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return '↓ 南';
    if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return '↙ 西南';
    if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return '← 西';
    if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return '↖ 西北';
    if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return '↑ 北';
    return '↗ 东北';
  };

  const updateValueFromClientX = useCallback((clientX: number) => {
    if (!sliderRef.current || disabled) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(shield.id, Math.round(percent * shield.maxPowerAllocation));
  }, [shield.id, shield.maxPowerAllocation, onChange, disabled]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    updateValueFromClientX(e.clientX);
  }, [disabled, updateValueFromClientX]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValueFromClientX(e.touches[0].clientX);
  }, [disabled, updateValueFromClientX]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateValueFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      updateValueFromClientX(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, updateValueFromClientX]);

  return (
    <div className={`p-3 bg-slate-800/50 rounded-lg border transition-all ${
      isDragging ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-slate-700'
    } ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${getShieldStatusColor()}`} />
          <span className="text-sm text-slate-200 font-medium">{shield.name}</span>
        </div>
        <span className="text-xs text-slate-500">
          {getDirectionLabel(shield.angle)}
        </span>
      </div>

      <div
        ref={sliderRef}
        className={`relative h-8 bg-slate-700 rounded-full cursor-pointer select-none ${
          disabled ? 'cursor-not-allowed' : ''
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all ${getShieldBgColor()} ${
            isDragging ? 'opacity-80' : 'opacity-60'
          }`}
          style={{ width: `${(shield.powerAllocation / shield.maxPowerAllocation) * 100}%` }}
        />
        
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 transition-all ${
            isDragging ? 'border-cyan-300 scale-110' : 'border-cyan-400'
          }`}
          style={{ left: `calc(${(shield.powerAllocation / shield.maxPowerAllocation) * 100}% - 12px)` }}
        >
          {isDragging && (
            <div className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-white/80 drop-shadow">
            ⚡ {shield.powerAllocation} / {shield.maxPowerAllocation}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">护盾强度</span>
        <span className={getShieldStatusColor()}>
          {Math.round(strength)} / {shield.maxDurability} ({Math.round(strengthPercent)}%)
        </span>
      </div>
    </div>
  );
}

export default function PowerAllocationPanel() {
  const { state, allocateShieldPower } = useGame();
  const { meteorStorm } = state;
  const { shieldNodes, totalPower, allocatedPower, phase } = meteorStorm;
  const remainingPower = totalPower - allocatedPower;

  const handleSliderChange = useCallback((shieldId: string, value: number) => {
    allocateShieldPower(shieldId, value);
  }, [allocateShieldPower]);

  const handleResetAll = useCallback(() => {
    shieldNodes.forEach(shield => {
      allocateShieldPower(shield.id, 0);
    });
  }, [shieldNodes, allocateShieldPower]);

  const handleAutoDistribute = useCallback(() => {
    const perShield = Math.floor(totalPower / shieldNodes.length);
    let remainder = totalPower - perShield * shieldNodes.length;
    
    shieldNodes.forEach((shield, index) => {
      let power = perShield;
      if (index < remainder) {
        power += 1;
      }
      allocateShieldPower(shield.id, Math.min(power, shield.maxPowerAllocation));
    });
  }, [totalPower, shieldNodes, allocateShieldPower]);

  const handleMaxOut = useCallback(() => {
    let remaining = totalPower;
    const sorted = [...shieldNodes].sort((a, b) => b.maxPowerAllocation - a.maxPowerAllocation);
    
    sorted.forEach(shield => {
      const toAllocate = Math.min(shield.maxPowerAllocation, remaining);
      allocateShieldPower(shield.id, toAllocate);
      remaining -= toAllocate;
      if (remaining <= 0) return;
    });
  }, [totalPower, shieldNodes, allocateShieldPower]);

  if (phase === 'idle') {
    return (
      <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" />
          能源分配系统
        </h3>
        <div className="text-center py-8 text-slate-500 text-sm">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>启动陨石雨防御后</p>
          <p>可分配能源至各护盾节点</p>
        </div>
      </div>
    );
  }

  if (phase === 'storm') {
    return (
      <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4" />
          护盾状态
        </h3>
        <div className="space-y-3">
          {shieldNodes.map(shield => {
            const durabilityPercent = (shield.currentDurability / shield.maxDurability) * 100;
            const getColor = () => {
              const ratio = durabilityPercent / 100;
              if (ratio > 0.6) return 'text-cyan-400 bg-cyan-500';
              if (ratio > 0.3) return 'text-yellow-400 bg-yellow-500';
              return 'text-red-400 bg-red-500';
            };
            const [textColor, bgColor] = getColor().split(' ');
            
            return (
              <div key={shield.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{shield.name}</span>
                  <span className={`text-xs font-bold ${textColor}`}>
                    {Math.round(shield.currentDurability)}/{shield.maxDurability}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${bgColor}`}
                    style={{ width: `${durabilityPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const totalDamage = shieldNodes.reduce(
      (sum, s) => sum + (s.maxDurability - s.currentDurability),
      0
    );
    
    return (
      <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2 mb-4">
          <Info className="w-4 h-4" />
          护盾战损
        </h3>
        <div className="mb-3 p-2 bg-slate-800/50 rounded border border-slate-600 text-center">
          <div className="text-sm text-slate-400">总承受伤害</div>
          <div className="text-xl font-bold text-orange-400">{Math.round(totalDamage)}</div>
        </div>
        <div className="space-y-2">
          {shieldNodes.map(shield => {
            const durabilityPercent = (shield.currentDurability / shield.maxDurability) * 100;
            const damageTaken = shield.maxDurability - shield.currentDurability;
            const isDestroyed = shield.currentDurability <= 0;
            
            return (
              <div key={shield.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{shield.name}</span>
                  <span className={`text-xs font-bold ${
                    isDestroyed ? 'text-red-400' : damageTaken > 0 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {isDestroyed ? '已摧毁' : damageTaken > 0 ? `-${Math.round(damageTaken)}` : '完好'}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isDestroyed ? 'bg-red-500' : durabilityPercent > 60 ? 'bg-cyan-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${durabilityPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4" />
          能源分配
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleResetAll}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
            title="重置所有"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-cyan-300 text-sm">可用能源</span>
          <span className="text-2xl font-bold text-cyan-400">
            {remainingPower}
            <span className="text-sm text-cyan-600"> / {totalPower}</span>
          </span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-200"
            style={{ width: `${(allocatedPower / totalPower) * 100}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>已分配: {allocatedPower}</span>
          <span>剩余: {remainingPower}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAutoDistribute}
          className="flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
        >
          平均分配
        </button>
        <button
          onClick={handleMaxOut}
          className="flex-1 py-1.5 text-xs bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-300 border border-cyan-700/50 rounded transition-colors"
        >
          最大化护盾
        </button>
      </div>

      <div className="space-y-3">
        {shieldNodes.map(shield => (
          <PowerSlider
            key={shield.id}
            shield={shield}
            onChange={handleSliderChange}
            disabled={phase !== 'prep'}
          />
        ))}
      </div>

      <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            拖动滑块分配能源。能源越多，护盾强度越高，能抵挡更多陨石伤害。
            每个护盾有固定的朝向和覆盖范围，合理分配是获胜关键！
          </p>
        </div>
      </div>
    </div>
  );
}
