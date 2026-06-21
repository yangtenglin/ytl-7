import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import MeteorStormDefense from '../components/game/MeteorStormDefense';
import PowerAllocationPanel from '../components/game/PowerAllocationPanel';
import StatusBar from '../components/game/StatusBar';
import EventLog from '../components/game/EventLog';
import { Shield, ArrowLeft, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

export default function MeteorStormPage() {
  const { state, startMeteorStormPrep, initGame } = useGame();
  const navigate = useNavigate();
  const { meteorStorm } = state;

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
                </div>
              )}

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
