import { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../../hooks/useGame';
import { calculateShieldStrength } from '../../game/meteorStorm';
import { Shield, Zap, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const svgWidth = 520;
const svgHeight = 580;

function getMeteorSize(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small': return 8;
    case 'medium': return 14;
    case 'large': return 22;
    default: return 10;
  }
}

function getShieldColor(durability: number, maxDurability: number): string {
  const ratio = durability / maxDurability;
  if (ratio > 0.6) return '#22d3ee';
  if (ratio > 0.3) return '#f59e0b';
  return '#ef4444';
}

export default function MeteorStormDefense() {
  const { state, startMeteorStormPrep, triggerMeteorStorm, meteorStormTick, endMeteorStorm } = useGame();
  const { meteorStorm } = state;
  const { shieldNodes, meteors, phase, countdown, totalPower, allocatedPower, damageReports, stormWave } = meteorStorm;

  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const stormTimerRef = useRef<number>(0);
  const prepTimerRef = useRef<number>(0);
  const [displayCountdown, setDisplayCountdown] = useState(countdown);

  const startStorm = useCallback(() => {
    triggerMeteorStorm();
    stormTimerRef.current = 0;
  }, [triggerMeteorStorm]);

  useEffect(() => {
    if (phase === 'prep') {
      setDisplayCountdown(countdown);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      let lastTime = performance.now();
      let prepTimeLeft = countdown;
      
      const tick = (currentTime: number) => {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        prepTimeLeft -= deltaTime;
        setDisplayCountdown(Math.max(0, Math.ceil(prepTimeLeft)));
        
        if (prepTimeLeft <= 0) {
          startStorm();
          return;
        }
        
        animationRef.current = requestAnimationFrame(tick);
      };
      
      animationRef.current = requestAnimationFrame(tick);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, countdown, startStorm]);

  useEffect(() => {
    if (phase !== 'storm') return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    let lastTime = performance.now();
    let accumulator = 0;
    const tickInterval = 1000 / 30;
    let stormElapsed = 0;
    const stormDuration = 15000;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      accumulator += deltaTime;
      stormElapsed += deltaTime;

      while (accumulator >= tickInterval) {
        meteorStormTick();
        accumulator -= tickInterval;
      }

      if (stormElapsed >= stormDuration || meteors.length === 0) {
        endMeteorStorm();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, meteorStormTick, endMeteorStorm, meteors.length]);

  const handleStartPrep = () => {
    startMeteorStormPrep();
  };

  const handleTriggerStorm = () => {
    triggerMeteorStorm();
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'idle': return '待机中';
      case 'prep': return '准备阶段 - 分配能源';
      case 'storm': return '陨石雨中！';
      case 'result': return '结算';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'idle': return 'text-slate-400';
      case 'prep': return 'text-yellow-400';
      case 'storm': return 'text-red-400 animate-pulse';
      case 'result': return 'text-cyan-400';
      default: return '';
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4" />
          陨石雨防御系统
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">第 {stormWave} 波</span>
          <span className={`text-xs font-bold ${getPhaseColor()}`}>
            {getPhaseText()}
          </span>
        </div>
      </div>

      {phase === 'prep' && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-bold">
                倒计时: {displayCountdown}秒
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm">
                能源: {allocatedPower}/{totalPower}
              </span>
            </div>
          </div>
          <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(displayCountdown / countdown) * 100}%` }}
            />
          </div>
        </div>
      )}

      {phase === 'storm' && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-red-400 text-sm font-bold animate-pulse">
                陨石雨进行中！
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-sm">
                剩余陨石: {meteors.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && damageReports.length > 0 && (
        <div className="mb-4 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
          <h4 className="text-cyan-400 text-sm font-bold mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            受损报告
          </h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {damageReports.map(report => {
              const module = state.base.modules.find(m => m.id === report.moduleId);
              return (
                <div key={report.moduleId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{module?.name || report.moduleId}</span>
                  <div className="flex items-center gap-2">
                    <span className={report.destroyed ? 'text-red-400' : 'text-yellow-400'}>
                      -{report.damage} 安全值
                    </span>
                    {report.destroyed && <XCircle className="w-3 h-3 text-red-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative bg-slate-950 rounded-lg border border-slate-700 overflow-hidden" style={{ height: svgHeight }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full"
        >
          <defs>
            <radialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
            <filter id="meteorGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="starField" patternUnits="userSpaceOnUse" width="50" height="50">
              <circle cx="10" cy="10" r="0.5" fill="white" opacity="0.5" />
              <circle cx="30" cy="25" r="0.8" fill="white" opacity="0.3" />
              <circle cx="45" cy="40" r="0.5" fill="white" opacity="0.4" />
              <circle cx="15" cy="35" r="0.3" fill="white" opacity="0.6" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#starField)" />

          {phase === 'storm' && (
            <g filter="url(#meteorGlow)">
              {meteors.map(meteor => (
                <g key={meteor.id}>
                  <circle
                    cx={meteor.x}
                    cy={meteor.y}
                    r={getMeteorSize(meteor.size)}
                    fill={meteor.color}
                  />
                  <line
                    x1={meteor.x}
                    y1={meteor.y}
                    x2={meteor.x - meteor.vx * 8}
                    y2={meteor.y - meteor.vy * 8}
                    stroke={meteor.color}
                    strokeWidth={getMeteorSize(meteor.size) / 2}
                    opacity="0.6"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </g>
          )}

          {shieldNodes.map(shield => {
            const strength = calculateShieldStrength(shield);
            const color = getShieldColor(shield.currentDurability, shield.maxDurability);
            const isActive = strength > 0 && shield.currentDurability > 0;
            const startAngle = (shield.angle - shield.coverage / 2) * (Math.PI / 180);
            const endAngle = (shield.angle + shield.coverage / 2) * (Math.PI / 180);
            const radius = 70;

            const x1 = shield.position.x + Math.cos(startAngle) * radius;
            const y1 = shield.position.y + Math.sin(startAngle) * radius;
            const x2 = shield.position.x + Math.cos(endAngle) * radius;
            const y2 = shield.position.y + Math.sin(endAngle) * radius;

            const largeArc = shield.coverage > 180 ? 1 : 0;

            const arcPath = `M ${shield.position.x} ${shield.position.y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return (
              <g key={shield.id}>
                {isActive && phase !== 'idle' && (
                  <>
                    <path
                      d={arcPath}
                      fill={color}
                      opacity={0.15}
                    />
                    <path
                      d={arcPath}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.6}
                    />
                    <circle
                      cx={shield.position.x}
                      cy={shield.position.y}
                      r={40}
                      fill="url(#shieldGlow)"
                      opacity={isActive && phase === 'storm' ? 0.5 : 0.2}
                    />
                  </>
                )}

                <circle
                  cx={shield.position.x}
                  cy={shield.position.y}
                  r={18}
                  fill={isActive ? '#0e7490' : '#374151'}
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.9}
                />

                <text
                  x={shield.position.x}
                  y={shield.position.y + 5}
                  textAnchor="middle"
                  fontSize="16"
                >
                  🛡️
                </text>

                <rect
                  x={shield.position.x - 20}
                  y={shield.position.y + 22}
                  width={40}
                  height={5}
                  fill="#1e293b"
                  rx={2}
                />
                <rect
                  x={shield.position.x - 20}
                  y={shield.position.y + 22}
                  width={40 * (shield.currentDurability / shield.maxDurability)}
                  height={5}
                  fill={color}
                  rx={2}
                />

                <text
                  x={shield.position.x}
                  y={shield.position.y - 25}
                  textAnchor="middle"
                  fill={color}
                  fontSize="10"
                  fontWeight="bold"
                >
                  {shield.name}
                </text>

                {shield.powerAllocation > 0 && (
                  <text
                    x={shield.position.x}
                    y={shield.position.y + 40}
                    textAnchor="middle"
                    fill="#22d3ee"
                    fontSize="9"
                  >
                    ⚡{shield.powerAllocation}
                  </text>
                )}
              </g>
            );
          })}

          {phase === 'prep' && (
            <text
              x={svgWidth / 2}
              y={svgHeight / 2}
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="24"
              fontWeight="bold"
              opacity="0.3"
            >
              拖动滑块分配护盾能源
            </text>
          )}
        </svg>
      </div>

      {phase === 'idle' && (
        <button
          onClick={handleStartPrep}
          disabled={state.status !== 'playing'}
          className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Shield className="w-5 h-5" />
          启动陨石雨防御演练
        </button>
      )}

      {phase === 'prep' && (
        <button
          onClick={handleTriggerStorm}
          className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          立即开始陨石雨
        </button>
      )}

      {phase === 'result' && (
        <button
          onClick={handleStartPrep}
          disabled={state.status !== 'playing'}
          className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Shield className="w-5 h-5" />
          再来一次
        </button>
      )}
    </div>
  );
}
