import { useMemo } from 'react';
import { useGame } from '../../hooks/useGame';
import { baseConfig } from '../../game/config';
import type { Module, Pipe, Door } from '../../game/types';

const moduleColors: Record<string, string> = {
  command: '#4a5568',
  living: '#2d3748',
  lab: '#2c5282',
  storage: '#553c9a',
  engine: '#744210',
  airlock: '#1a365d',
};

const moduleIcons: Record<string, string> = {
  command: '🎛️',
  living: '🛏️',
  lab: '🔬',
  storage: '📦',
  engine: '⚡',
  airlock: '🚪',
};

function getModuleStatusColor(module: Module): string {
  if (module.safetyLevel < 30) return '#ef4444';
  if (module.safetyLevel < 60) return '#f59e0b';
  if (!module.hasOxygen) return '#f59e0b';
  if (!module.hasPower) return '#8b5cf6';
  return '#10b981';
}

function getPipeColor(pipe: Pipe, canRepair: boolean): string {
  if (pipe.status === 'broken') return canRepair ? '#ef4444' : '#7f1d1d';
  if (pipe.status === 'damaged') return canRepair ? '#f59e0b' : '#92400e';
  return pipe.type === 'oxygen' ? '#06b6d4' : '#22c55e';
}

function getPipeDashArray(pipe: Pipe): string {
  if (pipe.status === 'broken') return '5,5';
  if (pipe.status === 'damaged') return '10,5';
  return 'none';
}

function formatMaterialCost(pipe: Pipe): string {
  const cost = baseConfig.repairMaterialCost[pipe.type][pipe.status];
  const parts: string[] = [];
  if (cost.parts) parts.push(`🔧×${cost.parts}`);
  if (cost.oxygen_filter) parts.push(`🫁×${cost.oxygen_filter}`);
  if (cost.battery) parts.push(`🔋×${cost.battery}`);
  return parts.join(' ');
}

export default function BaseSection() {
  const { state, selectedCrew, selectedTarget, selectTarget, checkRepairMaterials } = useGame();
  const { modules, pipes, doors } = state.base;

  const moduleCrewCount = useMemo(() => {
    const count = new Map<string, number>();
    state.crew.forEach(c => {
      count.set(c.currentModule, (count.get(c.currentModule) || 0) + 1);
    });
    return count;
  }, [state.crew]);

  const pipeMaterialStatus = useMemo(() => {
    const status = new Map<string, { sufficient: boolean; cost: string }>();
    pipes.forEach(pipe => {
      if (pipe.status !== 'normal') {
        const check = checkRepairMaterials(pipe.id);
        status.set(pipe.id, {
          sufficient: check.sufficient,
          cost: formatMaterialCost(pipe),
        });
      }
    });
    return status;
  }, [pipes, checkRepairMaterials]);

  const svgWidth = 520;
  const svgHeight = 580;

  const buildPipePath = (pipe: Pipe): string => {
    if (pipe.path.length < 2) return '';
    const fromModule = modules.find(m => m.id === pipe.from);
    const toModule = modules.find(m => m.id === pipe.to);
    if (!fromModule || !toModule) return '';

    let path = `M ${pipe.path[0].x} ${pipe.path[0].y}`;
    for (let i = 1; i < pipe.path.length; i++) {
      path += ` L ${pipe.path[i].x} ${pipe.path[i].y}`;
    }
    return path;
  };

  const handlePipeClick = (pipe: Pipe) => {
    if (pipe.status === 'normal') return;
    selectTarget(pipe.id, 'pipe');
  };

  const handleDoorClick = (door: Door) => {
    if (door.isSealed) return;
    selectTarget(door.id, 'door');
  };

  return (
    <div className="relative w-full h-full bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
      <div className="absolute top-3 left-4 z-10">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider">基地剖面图</h3>
      </div>

      <div className="absolute top-3 right-4 z-10 flex gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
          <span className="text-slate-400">氧气正常</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-slate-400">电力正常</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span className="text-slate-400">警告</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-slate-400">危险</span>
        </div>
      </div>

      <svg
        width={svgWidth}
        height={svgHeight}
        className="w-full h-auto"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        <defs>
          <pattern id="scanlines" patternUnits="userSpaceOnUse" width="4" height="4">
            <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,212,255,0.03)" strokeWidth="1" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#scanlines)" />

        {pipes.map(pipe => {
          const path = buildPipePath(pipe);
          if (!path) return null;
          const isSelected = selectedTarget === pipe.id;
          const matStatus = pipeMaterialStatus.get(pipe.id);
          const canRepair = pipe.status === 'normal' || matStatus?.sufficient;
          const color = getPipeColor(pipe, canRepair);
          const isClickable = pipe.status !== 'normal';

          return (
            <g key={pipe.id}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 5 : 3}
                strokeDasharray={getPipeDashArray(pipe)}
                opacity={isSelected ? 1 : canRepair ? 0.8 : 0.5}
                filter={isSelected ? 'url(#glow)' : undefined}
                className={isClickable ? 'cursor-pointer' : ''}
                onClick={() => isClickable && handlePipeClick(pipe)}
              >
                {pipe.status === 'normal' && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="20"
                    to="0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </path>
              {isClickable && (
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  className={canRepair ? 'cursor-pointer' : 'cursor-not-allowed'}
                  onClick={() => canRepair && handlePipeClick(pipe)}
                />
              )}
              {pipe.status !== 'normal' && (
                <g>
                  <text
                    x={pipe.path[pipe.path.length - 1].x}
                    y={pipe.path[pipe.path.length - 1].y - 5}
                    fill={color}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {pipe.status === 'broken' ? '⚠' : '🔧'}
                    {!canRepair && '🚫'}
                  </text>
                  {isSelected && matStatus && (
                    <g>
                      <rect
                        x={pipe.path[pipe.path.length - 1].x - 50}
                        y={pipe.path[pipe.path.length - 1].y - 35}
                        width={100}
                        height={22}
                        fill={canRepair ? 'rgba(6, 182, 212, 0.9)' : 'rgba(239, 68, 68, 0.9)'}
                        rx={4}
                      />
                      <text
                        x={pipe.path[pipe.path.length - 1].x}
                        y={pipe.path[pipe.path.length - 1].y - 20}
                        fill="white"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {canRepair ? matStatus.cost : '材料不足!'}
                      </text>
                    </g>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {doors.map(door => {
          const isSelected = selectedTarget === door.id;
          const isClickable = !door.isSealed;

          return (
            <g
              key={door.id}
              className={isClickable ? 'cursor-pointer' : ''}
              onClick={() => isClickable && handleDoorClick(door)}
            >
              <rect
                x={door.position.x - 8}
                y={door.position.y - 8}
                width={16}
                height={16}
                fill={door.isSealed ? '#ef4444' : door.isOpen ? '#22c55e' : '#eab308'}
                stroke={isSelected ? '#06b6d4' : '#475569'}
                strokeWidth={isSelected ? 3 : 1}
                rx={2}
                filter={isSelected ? 'url(#glow)' : undefined}
              />
              <text
                x={door.position.x}
                y={door.position.y + 3}
                fill="white"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                pointerEvents="none"
              >
                {door.isSealed ? '🔒' : '🚪'}
              </text>
            </g>
          );
        })}

        {modules.map(module => {
          const statusColor = getModuleStatusColor(module);
          const crewCount = moduleCrewCount.get(module.id) || 0;
          const isFlashing = module.safetyLevel < 30 && state.status === 'playing';

          return (
            <g key={module.id}>
              <rect
                x={module.position.x}
                y={module.position.y}
                width={module.position.width}
                height={module.position.height}
                fill={moduleColors[module.type]}
                stroke={statusColor}
                strokeWidth={2}
                rx={4}
                className={isFlashing ? 'animate-pulse' : ''}
                filter={module.safetyLevel < 30 ? 'url(#glow)' : undefined}
              />

              <rect
                x={module.position.x}
                y={module.position.y + module.position.height - 6}
                width={module.position.width * (module.safetyLevel / 100)}
                height={6}
                fill={statusColor}
                rx={2}
              />

              <text
                x={module.position.x + 10}
                y={module.position.y + 25}
                fill="white"
                fontSize="14"
                fontWeight="bold"
              >
                {moduleIcons[module.type]} {module.name}
              </text>

              <g transform={`translate(${module.position.x + 10}, ${module.position.y + 45})`}>
                <rect
                  x={0}
                  y={0}
                  width={24}
                  height={16}
                  fill={module.hasOxygen ? '#06b6d4' : '#6b7280'}
                  rx={3}
                />
                <text x={12} y={12} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">
                  O₂
                </text>

                <rect
                  x={30}
                  y={0}
                  width={24}
                  height={16}
                  fill={module.hasPower ? '#22c55e' : '#6b7280'}
                  rx={3}
                />
                <text x={42} y={12} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">
                  ⚡
                </text>

                <text
                  x={70}
                  y={13}
                  fill={module.oxygenLevel < 30 ? '#ef4444' : '#94a3b8'}
                  fontSize="11"
                  fontWeight="bold"
                >
                  O₂: {module.oxygenLevel}%
                </text>

                <text
                  x={115}
                  y={13}
                  fill={module.safetyLevel < 30 ? '#ef4444' : '#94a3b8'}
                  fontSize="11"
                  fontWeight="bold"
                >
                  安全: {module.safetyLevel}%
                </text>
              </g>

              {crewCount > 0 && (
                <g
                  transform={`translate(${module.position.x + module.position.width - 35}, ${module.position.y + 10})`}
                >
                  <rect
                    x={0}
                    y={0}
                    width={25}
                    height={20}
                    fill="#1e3a5f"
                    stroke="#06b6d4"
                    strokeWidth={1}
                    rx={4}
                  />
                  <text x={12.5} y={14} fill="white" fontSize="11" textAnchor="middle" fontWeight="bold">
                    👤{crewCount}
                  </text>
                </g>
              )}

              {module.isOxygenGenerator && (
                <text
                  x={module.position.x + module.position.width - 15}
                  y={module.position.y + module.position.height - 15}
                  fontSize="16"
                >
                  🌬️
                </text>
              )}
              {module.isPowerSource && (
                <text
                  x={module.position.x + module.position.width - 35}
                  y={module.position.y + module.position.height - 15}
                  fontSize="16"
                >
                  ⚡
                </text>
              )}
            </g>
          );
        })}

        {selectedCrew && (
          <text
            x={svgWidth / 2}
            y={svgHeight - 15}
            fill="#06b6d4"
            fontSize="12"
            textAnchor="middle"
            fontWeight="bold"
          >
            点击损坏的管线或舱门分配任务（材料不足的管线已禁用）
          </text>
        )}
      </svg>
    </div>
  );
}
