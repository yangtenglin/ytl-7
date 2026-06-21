import { useGame } from '../../hooks/useGame';
import { Wrench, Zap, Hammer, Heart, Clock, Activity, Wind, Stethoscope } from 'lucide-react';
import type { Crew } from '../../game/types';

const skillConfig = [
  { key: 'repair', label: '维修', icon: Wrench, color: 'text-cyan-400' },
  { key: 'electrical', label: '电气', icon: Zap, color: 'text-yellow-400' },
  { key: 'engineering', label: '工程', icon: Hammer, color: 'text-green-400' },
  { key: 'medical', label: '医疗', icon: Stethoscope, color: 'text-pink-400' },
];

const statusColors: Record<string, string> = {
  idle: 'bg-green-500',
  working: 'bg-yellow-500',
  moving: 'bg-blue-500',
  resting: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  idle: '空闲',
  working: '工作中',
  moving: '移动中',
  resting: '休息中',
};

function getHealthColor(health: number): string {
  if (health <= 20) return 'text-red-500';
  if (health <= 50) return 'text-orange-400';
  if (health <= 80) return 'text-yellow-400';
  return 'text-green-400';
}

function getHealthBarColor(health: number): string {
  if (health <= 20) return 'bg-red-500';
  if (health <= 50) return 'bg-orange-400';
  if (health <= 80) return 'bg-yellow-400';
  return 'bg-green-500';
}

function getStatusColor(value: number): string {
  if (value >= 70) return 'bg-red-500';
  if (value >= 40) return 'bg-orange-400';
  if (value >= 20) return 'bg-yellow-400';
  return 'bg-green-500';
}

function needsTreatment(member: Crew): boolean {
  return member.health < member.maxHealth || member.injury > 0 || member.fatigue > 60 || member.hypoxia > 0;
}

export default function CrewPanel() {
  const { state, selectedCrew, selectedTarget, selectCrew, selectTarget, selectedTargetType, assignRestTask } = useGame();
  const { crew, activeTasks } = state;

  const getCrewTask = (crewId: string) => {
    return activeTasks.find(t => t.assignedCrewId === crewId);
  };

  const getModuleName = (moduleId: string) => {
    const module = state.base.modules.find(m => m.id === moduleId);
    return module?.name || '未知';
  };

  const selectedCrewData = crew.find(c => c.id === selectedCrew);
  const isDoctorSelected = selectedCrewData && selectedCrewData.skills.medical >= 50;

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 h-full">
      <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-4">队员管理</h3>

      <div className="space-y-3">
        {crew.map(member => {
          const isSelected = selectedCrew === member.id;
          const isTargetSelected = selectedTarget === member.id && selectedTargetType === 'crew';
          const task = getCrewTask(member.id);
          const canSelect = member.status === 'idle' && state.status === 'playing' && member.health > 0;
          const canBeTreated = isDoctorSelected && selectedCrew !== member.id && needsTreatment(member) && !task;

          return (
            <div
              key={member.id}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-900/30 shadow-lg shadow-cyan-500/20'
                  : isTargetSelected
                  ? 'border-pink-400 bg-pink-900/30 shadow-lg shadow-pink-500/20'
                  : canBeTreated
                  ? 'border-pink-500/50 bg-slate-800/50 hover:border-pink-400 cursor-pointer'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              } ${canSelect || canBeTreated ? 'cursor-pointer' : 'opacity-70'}`}
              onClick={() => {
                if (canBeTreated) {
                  selectTarget(member.id, 'crew');
                } else if (canSelect) {
                  selectCrew(isSelected ? null : member.id);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="text-3xl">{member.avatar}</div>
                  {member.health <= 0 && (
                    <div className="absolute -top-1 -right-1 text-sm">💀</div>
                  )}
                  {member.hypoxia >= 50 && member.health > 0 && (
                    <div className="absolute -top-1 -right-1 text-sm animate-pulse">🫁</div>
                  )}
                  {member.injury >= 40 && member.health > 0 && (
                    <div className="absolute -bottom-1 -right-1 text-sm">🩹</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">{member.name}</h4>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${member.health <= 0 ? 'bg-gray-600' : statusColors[member.status]} text-white`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      {member.health <= 0 ? '已阵亡' : statusLabels[member.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>📍 {getModuleName(member.currentModule)}</span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Heart className={`w-3 h-3 ${getHealthColor(member.health)}`} />
                        生命值
                      </span>
                      <span className={`font-bold ${getHealthColor(member.health)}`}>
                        {member.health}/{member.maxHealth}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getHealthBarColor(member.health)} transition-all duration-300`}
                        style={{ width: `${(member.health / member.maxHealth) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mt-2">
                    <div className="text-center" title={`伤情: ${member.injury}%`}>
                      <div className="flex items-center justify-center gap-0.5 text-xs text-slate-400 mb-0.5">
                        <Activity className="w-2.5 h-2.5 text-red-400" />
                        伤情
                      </div>
                      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getStatusColor(member.injury)} transition-all duration-300`}
                          style={{ width: `${member.injury}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{member.injury}%</div>
                    </div>

                    <div className="text-center" title={`疲劳: ${member.fatigue}%`}>
                      <div className="flex items-center justify-center gap-0.5 text-xs text-slate-400 mb-0.5">
                        <Clock className="w-2.5 h-2.5 text-orange-400" />
                        疲劳
                      </div>
                      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getStatusColor(member.fatigue)} transition-all duration-300`}
                          style={{ width: `${member.fatigue}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{member.fatigue}%</div>
                    </div>

                    <div className="text-center" title={`缺氧: ${member.hypoxia}%`}>
                      <div className="flex items-center justify-center gap-0.5 text-xs text-slate-400 mb-0.5">
                        <Wind className="w-2.5 h-2.5 text-blue-400" />
                        缺氧
                      </div>
                      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getStatusColor(member.hypoxia)} transition-all duration-300`}
                          style={{ width: `${member.hypoxia}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{member.hypoxia}%</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {skillConfig.map(({ key, label, icon: Icon, color }) => (
                      <div key={key} className="flex items-center gap-1" title={`${label}: ${member.skills[key as keyof typeof member.skills]}`}>
                        <Icon className={`w-3 h-3 ${color}`} />
                        <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color.replace('text-', 'bg-')}`}
                            style={{ width: `${member.skills[key as keyof typeof member.skills]}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {task && (
                    <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-600">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          {task.type === 'repair_pipe' ? '🔧 修复管线' : task.type === 'seal_door' ? '🔒 密封舱门' : task.type === 'restock_material' ? '📦 物资补给' : task.type === 'rest' ? '😴 休息恢复' : '🏥 医疗救治'}
                        </span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.ceil(task.duration - (task.progress / 100) * task.duration)} 回合
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${task.type === 'rest' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-cyan-500 to-green-500'}`}
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCrew && !selectedTarget && (
        <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
          <p className="text-cyan-300 text-sm text-center mb-2">
            {isDoctorSelected
              ? '✨ 已选择医生，点击受伤队员进行治疗，或点击剖面图中的损坏管线/舱门分配任务'
              : '✨ 已选择队员，点击剖面图中的损坏管线或舱门分配任务'}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              assignRestTask(selectedCrew);
            }}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>😴</span>
            <span>安排休息（2回合）</span>
          </button>
        </div>
      )}

      {selectedCrew && selectedTarget && selectedTargetType === 'crew' && (
        <div className="mt-4 p-3 bg-pink-900/20 border border-pink-500/30 rounded-lg">
          <p className="text-pink-300 text-sm text-center">
            🏥 已选择目标病人，点击"结束回合"执行治疗
          </p>
        </div>
      )}
    </div>
  );
}
