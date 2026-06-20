import { useGame } from '../../hooks/useGame';
import { Wrench, Zap, Hammer, Heart, Clock } from 'lucide-react';

const skillConfig = [
  { key: 'repair', label: '维修', icon: Wrench, color: 'text-cyan-400' },
  { key: 'electrical', label: '电气', icon: Zap, color: 'text-yellow-400' },
  { key: 'engineering', label: '工程', icon: Hammer, color: 'text-green-400' },
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

export default function CrewPanel() {
  const { state, selectedCrew, selectCrew } = useGame();
  const { crew, activeTasks } = state;

  const getCrewTask = (crewId: string) => {
    return activeTasks.find(t => t.assignedCrewId === crewId);
  };

  const getModuleName = (moduleId: string) => {
    const module = state.base.modules.find(m => m.id === moduleId);
    return module?.name || '未知';
  };

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 h-full">
      <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-4">队员管理</h3>

      <div className="space-y-3">
        {crew.map(member => {
          const isSelected = selectedCrew === member.id;
          const task = getCrewTask(member.id);
          const canSelect = member.status === 'idle' && state.status === 'playing';

          return (
            <div
              key={member.id}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-900/30 shadow-lg shadow-cyan-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              } ${canSelect ? 'cursor-pointer' : 'opacity-70'}`}
              onClick={() => canSelect && selectCrew(isSelected ? null : member.id)}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{member.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">{member.name}</h4>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusColors[member.status]} text-white`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      {statusLabels[member.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>📍 {getModuleName(member.currentModule)}</span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" />
                      {member.health}%
                    </span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {skillConfig.map(({ key, label, icon: Icon, color }) => (
                      <div key={key} className="flex items-center gap-1" title={`${label}: ${member.skills[key as keyof typeof member.skills]}`}>
                        <Icon className={`w-3 h-3 ${color}`} />
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
                          {task.type === 'repair_pipe' ? '🔧 修复管线' : '🔒 密封舱门'}
                        </span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.ceil(task.duration - (task.progress / 100) * task.duration)} 回合
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-300"
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

      {selectedCrew && (
        <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
          <p className="text-cyan-300 text-sm text-center">
            ✨ 已选择队员，点击剖面图中的损坏管线或舱门分配任务
          </p>
        </div>
      )}
    </div>
  );
}
