import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { useNavigate } from 'react-router-dom';
import { Trophy, Skull, Home, RotateCcw, Play, AlertTriangle, TrendingDown, Users, Wrench, Clock, Package, ChevronDown, ChevronRight } from 'lucide-react';
import ReplayControls from './game/ReplayControls';
import BaseSection from './game/BaseSection';
import { getKeyFrames, calculateMistakeScore } from '../game/replay';
import type { MistakeCategory, MistakeDetail } from '../game/types';

export default function ResultScreen() {
  const { state, initGame, replayFrame, jumpToFrame } = useGame();
  const navigate = useNavigate();

  const isVictory = state.status === 'victory';
  const isDefeat = state.status === 'defeat';
  const isReplay = replayFrame !== null;

  useEffect(() => {
    if (state.status === 'playing' && replayFrame === null) {
      navigate('/');
    }
  }, [state.status, replayFrame, navigate]);

  const handleRestart = () => {
    initGame(state.difficulty);
    navigate('/game');
  };

  const handleHome = () => {
    navigate('/');
  };

  const finalSafety = state.overallSafety;
  const totalTurns = state.turn;
  const totalEvents = state.events.length;
  const dangerEvents = state.events.filter(e => e.severity === 'danger').length;
  const warningEvents = state.events.filter(e => e.severity === 'warning').length;
  const successEventsList = state.events.filter(e => e.severity === 'success');
  const successEvents = successEventsList.length;
  const totalRepairs = state.activeTasks.length + successEventsList.filter(e => e.type === 'system_repaired').length;
  const idleCrewEnd = state.crew.filter(c => c.status === 'idle').length;
  const workingCrewEnd = state.crew.filter(c => c.status === 'working').length;
  const criticalModules = state.base.modules.filter(m => m.safetyLevel < 30).length;

  const keyFrames = getKeyFrames(state.history);

  const mistakeScore = useMemo(() => {
    if (!isDefeat || state.history.length === 0) return null;
    return calculateMistakeScore(state.history, state);
  }, [isDefeat, state.history, state]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleMistakeClick = (detail: MistakeDetail) => {
    if (detail.frameIndex >= 0 && detail.frameIndex < state.history.length) {
      jumpToFrame(detail.frameIndex);
    }
  };

  const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    unrepaired_pipes: Wrench,
    idle_crew: Users,
    material_waste: Package,
  };

  const categoryColorMap: Record<string, string> = {
    unrepaired_pipes: 'text-red-400',
    idle_crew: 'text-yellow-400',
    material_waste: 'text-orange-400',
  };

  const categoryBorderMap: Record<string, string> = {
    unrepaired_pipes: 'border-red-500/50',
    idle_crew: 'border-yellow-500/50',
    material_waste: 'border-orange-500/50',
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-20 left-20 w-96 h-96 rounded-full blur-[120px] ${isVictory ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className={`absolute bottom-20 right-20 w-80 h-80 rounded-full blur-[100px] ${isVictory ? 'bg-cyan-500' : 'bg-orange-500'}`}></div>
        </div>
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full mb-4 ${
              isVictory
                ? 'bg-green-900/30 border border-green-500/50'
                : 'bg-red-900/30 border border-red-500/50'
            }`}>
              {isVictory ? (
                <Trophy className="w-8 h-8 text-yellow-400" />
              ) : (
                <Skull className="w-8 h-8 text-red-400" />
              )}
              <h1 className={`text-4xl font-bold ${
                isVictory ? 'text-green-400' : 'text-red-400'
              }`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {isReplay ? '回放模式' : isVictory ? '任务成功！' : '基地沦陷...'}
              </h1>
            </div>

            {!isReplay && (
              <p className="text-slate-400 text-lg">
                {isVictory
                  ? '恭喜！你成功维持了基地运转，坚持到了救援到来。'
                  : state.defeatReason || '基地系统完全崩溃，任务失败。'}
              </p>
            )}
          </div>

          {isDefeat && state.defeatAnalysis && !isReplay && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-6 mb-6 max-w-3xl mx-auto">
              <h3 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                失败原因分析
              </h3>
              <div className="space-y-2">
                {state.defeatAnalysis.map((analysis, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{analysis}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isDefeat && mistakeScore && mistakeScore.totalDeduction > 0 && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-6 mb-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-red-400 font-bold text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  关键失误评分
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">总扣分</span>
                  <span className="text-red-400 text-2xl font-bold" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    -{mistakeScore.totalDeduction}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mistakeScore.categories.map((category) => {
                  const Icon = categoryIconMap[category.key] ?? AlertTriangle;
                  const color = categoryColorMap[category.key] ?? 'text-red-400';
                  const borderColor = categoryBorderMap[category.key] ?? 'border-red-500/50';
                  const isExpanded = expandedCategories.has(category.key);

                  return (
                    <div key={category.key} className={`bg-slate-900/50 backdrop-blur border ${borderColor} rounded-xl overflow-hidden`}>
                      <div
                        className="p-4 cursor-pointer hover:bg-slate-800/50 transition-all"
                        onClick={() => toggleCategory(category.key)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${color}`} />
                            <span className="text-slate-300 text-sm font-bold">{category.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`${color} text-lg font-bold`}>-{category.totalDeduction}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded && category.details.length > 0 && (
                        <div className="border-t border-slate-700/50 max-h-48 overflow-y-auto">
                          {category.details.map((detail, didx) => {
                            const isActive = replayFrame === detail.frameIndex;
                            return (
                              <div
                                key={didx}
                                onClick={(e) => { e.stopPropagation(); handleMistakeClick(detail); }}
                                className={`px-4 py-2 border-b border-slate-800/50 cursor-pointer transition-all flex items-center justify-between group ${
                                  isActive ? 'bg-cyan-900/30' : 'hover:bg-slate-800/30'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-xs font-bold ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                                      回合 {detail.turn}
                                    </span>
                                    <span className={`${color} text-xs font-bold`}>
                                      -{detail.deduction}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 truncate">{detail.description}</p>
                                </div>
                                <span className={`text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                                  {isActive ? '查看中' : '跳转'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isExpanded && category.details.length === 0 && (
                        <div className="px-4 py-3 border-t border-slate-700/50 text-xs text-slate-600 text-center">
                          此项无扣分记录
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {[
              { icon: Clock, label: '坚持回合', value: totalTurns, color: 'text-cyan-400' },
              { icon: TrendingDown, label: '最终安全值', value: `${finalSafety}%`, color: finalSafety < 30 ? 'text-red-400' : finalSafety < 60 ? 'text-yellow-400' : 'text-green-400' },
              { icon: Users, label: '空闲队员', value: idleCrewEnd, color: 'text-slate-400' },
              { icon: Wrench, label: '维修次数', value: totalRepairs, color: 'text-green-400' },
              { icon: AlertTriangle, label: '严重故障', value: dangerEvents, color: 'text-red-400' },
              { icon: Play, label: '关键节点', value: keyFrames.length, color: 'text-yellow-400' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
              <div className="text-sm text-slate-500 mb-2">事件统计</div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-xl font-bold text-red-400">{dangerEvents}</div>
                  <div className="text-xs text-slate-600">危险</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{warningEvents}</div>
                  <div className="text-xs text-slate-600">警告</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{successEvents}</div>
                  <div className="text-xs text-slate-600">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-cyan-400">{totalEvents}</div>
                  <div className="text-xs text-slate-600">总计</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
              <div className="text-sm text-slate-500 mb-2">队员状态</div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{idleCrewEnd}</div>
                  <div className="text-xs text-slate-600">空闲</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{workingCrewEnd}</div>
                  <div className="text-xs text-slate-600">工作中</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-400">{criticalModules}</div>
                  <div className="text-xs text-slate-600">危险模块</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 col-span-2">
              <div className="text-sm text-slate-500 mb-2">难度设置</div>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  state.difficulty === 'easy'
                    ? 'bg-green-900/50 text-green-400 border border-green-700'
                    : state.difficulty === 'normal'
                    ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                    : 'bg-red-900/50 text-red-400 border border-red-700'
                }`}>
                  {state.difficulty === 'easy' ? '简单' : state.difficulty === 'normal' ? '普通' : '困难'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 rounded-lg transition-all text-sm font-bold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    再来一局
                  </button>
                  <button
                    onClick={handleHome}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 rounded-lg transition-all text-sm font-bold"
                  >
                    <Home className="w-4 h-4" />
                    返回主页
                  </button>
                </div>
              </div>
            </div>
          </div>

          {state.history.length > 0 && (
            <div className="space-y-4">
              <ReplayControls />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <BaseSection />
                </div>
                <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
                  <h3 className="text-cyan-400 font-bold text-sm mb-3">关键时间节点</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {keyFrames.map((frame, idx) => {
                      const events = frame.stateSnapshot.events?.filter(
                        e => e.turn === frame.turn && (e.severity === 'danger' || e.severity === 'success')
                      ) || [];
                      const safety = frame.stateSnapshot.overallSafety ?? 100;

                      return (
                        <div
                          key={idx}
                          onClick={() => useGameStore.getState().setReplayFrame(state.history.indexOf(frame))}
                          className={`p-2 rounded-lg border cursor-pointer transition-all ${
                            replayFrame === state.history.indexOf(frame)
                              ? 'border-cyan-500 bg-cyan-900/20'
                              : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-cyan-400 font-bold">回合 {frame.turn}</span>
                            <span className={safety < 30 ? 'text-red-400' : 'text-slate-400'}>
                              安全值: {safety}%
                            </span>
                          </div>
                          {events.length > 0 && (
                            <div className="space-y-1">
                              {events.slice(0, 2).map((event, eidx) => (
                                <div key={eidx} className="text-xs text-slate-400 truncate">
                                  {event.message}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useGameStore } from '../game/state';
