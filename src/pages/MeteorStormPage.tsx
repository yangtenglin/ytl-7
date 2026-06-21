import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import MeteorStormDefense from '../components/game/MeteorStormDefense';
import PowerAllocationPanel from '../components/game/PowerAllocationPanel';
import StatusBar from '../components/game/StatusBar';
import EventLog from '../components/game/EventLog';
import { loadPresets, savePreset, deletePreset } from '../game/meteorStorm';
import type { EnergyPreset } from '../game/types';
import { Shield, ArrowLeft, Zap, AlertTriangle, CheckCircle, Save, Trash2, Upload, BookOpen } from 'lucide-react';

function PresetCard({
  preset,
  index,
  onLoad,
  onDelete,
  canLoad,
}: {
  preset: EnergyPreset;
  index: number;
  onLoad: (preset: EnergyPreset) => void;
  onDelete: (id: string) => void;
  canLoad: boolean;
}) {
  const gradeColors: Record<string, string> = {
    S: 'text-yellow-400',
    A: 'text-green-400',
    B: 'text-cyan-400',
    C: 'text-yellow-400',
    D: 'text-red-400',
  };

  const allocationEntries = Object.entries(preset.shieldAllocations);
  const totalAllocated = allocationEntries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-600/50">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">#{index + 1}</span>
          <span className="text-sm text-slate-200 font-medium truncate max-w-[80px]">
            {preset.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-lg font-bold ${gradeColors[preset.grade] || 'text-slate-400'}`}>
            {preset.grade}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
        <div className="flex justify-between">
          <span className="text-slate-500">能源分配</span>
          <span className="text-cyan-400">{totalAllocated}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">总伤害</span>
          <span className="text-orange-400">{preset.totalDamage}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">受损模块</span>
          <span className="text-yellow-400">{preset.damageReports.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">评级</span>
          <span className="text-slate-300">{preset.gradeDesc}</span>
        </div>
      </div>

      {preset.damageReports.length > 0 && (
        <div className="mb-2 p-1.5 bg-slate-900/50 rounded text-xs max-h-14 overflow-y-auto">
          {preset.damageReports.map(r => (
            <div key={r.moduleId} className="flex justify-between">
              <span className="text-slate-500">{r.moduleId}</span>
              <span className={r.destroyed ? 'text-red-400' : 'text-yellow-400'}>
                -{r.damage}{r.destroyed ? ' 💥' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={() => onLoad(preset)}
          disabled={!canLoad}
          className="flex-1 py-1 text-xs bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-300 border border-cyan-700/40 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <Upload className="w-3 h-3" />
          加载方案
        </button>
        <button
          onClick={() => onDelete(preset.id)}
          className="py-1 px-2 text-xs bg-slate-700/50 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-slate-600/50 hover:border-red-700/40 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function MeteorStormPage() {
  const { state, startMeteorStormPrep, initGame, allocateShieldPower } = useGame();
  const navigate = useNavigate();
  const { meteorStorm } = state;

  const [presets, setPresets] = useState<EnergyPreset[]>(() => loadPresets());
  const [presetName, setPresetName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    initGame('normal');
  }, [initGame]);

  useEffect(() => {
    if (state.status === 'playing' && meteorStorm.phase === 'idle') {
      startMeteorStormPrep();
    }
  }, [state.status, meteorStorm.phase, startMeteorStormPrep]);

  const totalDamage = meteorStorm.damageReports.reduce((sum, r) => sum + r.damage, 0);
  const destroyedCount = meteorStorm.damageReports.filter(r => r.destroyed).length;

  const getResultGrade = () => {
    if (totalDamage === 0) return { grade: 'S', color: 'text-yellow-400', desc: '完美防御！' };
    if (totalDamage < 20) return { grade: 'A', color: 'text-green-400', desc: '优秀' };
    if (totalDamage < 50) return { grade: 'B', color: 'text-cyan-400', desc: '良好' };
    if (totalDamage < 80) return { grade: 'C', color: 'text-yellow-400', desc: '一般' };
    return { grade: 'D', color: 'text-red-400', desc: '需要改进' };
  };

  const resultGrade = meteorStorm.phase === 'result' ? getResultGrade() : null;

  const handleSavePreset = useCallback(() => {
    if (!resultGrade) return;
    const name = presetName.trim() || `方案 ${presets.length + 1}`;
    const updated = savePreset(
      name,
      meteorStorm.shieldNodes,
      meteorStorm.damageReports,
      resultGrade.grade,
      resultGrade.desc,
    );
    setPresets(updated);
    setPresetName('');
    setSaveMsg('方案已保存');
    setTimeout(() => setSaveMsg(null), 2000);
  }, [presetName, presets.length, resultGrade, meteorStorm.shieldNodes, meteorStorm.damageReports]);

  const handleLoadPreset = useCallback((preset: EnergyPreset) => {
    if (meteorStorm.phase !== 'prep') return;
    meteorStorm.shieldNodes.forEach(shield => {
      const power = preset.shieldAllocations[shield.id] ?? 0;
      allocateShieldPower(shield.id, power);
    });
  }, [meteorStorm.phase, meteorStorm.shieldNodes, allocateShieldPower]);

  const handleDeletePreset = useCallback((presetId: string) => {
    const updated = deletePreset(presetId);
    setPresets(updated);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'linear-gradient(rgba(0,212,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}></div>
        </div>
      </div>

      <div className="relative z-10 p-4 pb-0">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">返回</span>
            </button>

            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                陨石雨防御系统
              </h1>
            </div>

            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 p-4 pt-0">
        <div className="max-w-[1400px] mx-auto h-full">
          <div className="grid grid-cols-12 gap-4 h-full">
            <div className="col-span-3 flex flex-col gap-4">
              <PowerAllocationPanel />
              <EventLog />
            </div>

            <div className="col-span-6">
              <MeteorStormDefense />
            </div>

            <div className="col-span-3 flex flex-col gap-4">
              <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  战斗统计
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">波次</span>
                    <span className="text-cyan-400 font-bold">第 {meteorStorm.stormWave} 波</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">总能源</span>
                    <span className="text-yellow-400 font-bold">{meteorStorm.totalPower}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">护盾节点</span>
                    <span className="text-green-400 font-bold">{meteorStorm.shieldNodes.length}</span>
                  </div>

                  {meteorStorm.phase === 'storm' && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">剩余陨石</span>
                      <span className="text-red-400 font-bold animate-pulse">{meteorStorm.meteors.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {meteorStorm.phase === 'result' && resultGrade && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                  <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    战斗评价
                  </h3>
                  
                  <div className="text-center py-4">
                    <div className={`text-6xl font-bold ${resultGrade.color} mb-2`}>
                      {resultGrade.grade}
                    </div>
                    <div className="text-slate-400 text-sm mb-4">
                      {resultGrade.desc}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">总伤害</span>
                        <span className="text-slate-300">{totalDamage} 点</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">受损模块</span>
                        <span className="text-slate-300">{meteorStorm.damageReports.length} 个</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">被摧毁</span>
                        <span className={destroyedCount > 0 ? 'text-red-400' : 'text-green-400'}>
                          {destroyedCount} 个
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Save className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-cyan-400 font-bold">保存为预设方案</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={presetName}
                        onChange={e => setPresetName(e.target.value)}
                        placeholder={`方案 ${presets.length + 1}`}
                        maxLength={12}
                        className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleSavePreset}
                        className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded transition-colors flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        保存
                      </button>
                    </div>
                    {saveMsg && (
                      <div className="mt-1.5 text-xs text-green-400">{saveMsg}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  能源预设方案
                  {presets.length > 0 && (
                    <span className="text-xs text-slate-500 font-normal">({presets.length}/3)</span>
                  )}
                </h3>

                {presets.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-xs">
                    <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p>尚无保存的方案</p>
                    <p className="mt-1">完成一次防御后可保存方案</p>
                    {meteorStorm.phase === 'prep' && (
                      <p className="mt-1 text-cyan-500">分配能源后可随时保存</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {presets.map((preset, i) => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        index={i}
                        onLoad={handleLoadPreset}
                        onDelete={handleDeletePreset}
                        canLoad={meteorStorm.phase === 'prep'}
                      />
                    ))}
                  </div>
                )}

                {meteorStorm.phase === 'prep' && presets.length > 0 && (
                  <div className="mt-3 p-2 bg-cyan-900/20 border border-cyan-700/30 rounded text-xs text-cyan-400">
                    💡 点击「加载方案」可快速应用已保存的护盾能源分配
                  </div>
                )}
              </div>

              <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  操作提示
                </h3>
                <ul className="text-xs text-slate-500 space-y-2">
                  <li>• 准备阶段：拖动滑块分配护盾能源</li>
                  <li>• 能源越多，护盾强度越高</li>
                  <li>• 每个护盾有固定的朝向和覆盖范围</li>
                  <li>• 陨石雨结束后检查受损模块</li>
                  <li>• 合理分配能源是获胜关键！</li>
                  <li>• 保存预设方案可在下次快速复用</li>
                </ul>
              </div>

              <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-3">
                  陨石类型
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span className="text-xs text-slate-400">小型 - 低伤害</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-slate-400">中型 - 中伤害</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-500"></div>
                    <span className="text-xs text-slate-400">大型 - 高伤害</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
