import { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { useNavigate } from 'react-router-dom';
import { Rocket, Play, BookOpen, Settings, AlertTriangle, Wrench, Wind, Zap, Users, Shield } from 'lucide-react';

const difficulties = [
  { id: 'easy', name: '简单', desc: '900秒，故障频率低', color: 'from-green-600 to-green-800' },
  { id: 'normal', name: '普通', desc: '600秒，标准故障频率', color: 'from-yellow-600 to-yellow-800' },
  { id: 'hard', name: '困难', desc: '480秒，高频故障', color: 'from-red-600 to-red-800' },
] as const;

export default function StartScreen() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [showRules, setShowRules] = useState(false);
  const { initGame, loadSavedReplay } = useGame();
  const navigate = useNavigate();

  const handleStartGame = () => {
    initGame(selectedDifficulty);
    navigate('/game');
  };

  const handleLoadReplay = () => {
    const loaded = loadSavedReplay();
    if (loaded) {
      navigate('/result');
    } else {
      alert('没有找到保存的回放记录');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-500 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500 rounded-full blur-[120px]"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-400 rounded-full blur-[150px] opacity-30"></div>
        </div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-900/30 border border-cyan-500/30 rounded-full mb-6">
            <Rocket className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-bold tracking-wider">太空基地生存模拟</span>
          </div>
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              基地危机
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            在倒计时内管理队员修复故障系统，维持氧气和电力供应，确保基地安全运行
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Wind, title: '氧气系统', desc: '监控氧气供应，密封泄漏区域' },
            { icon: Zap, title: '电力网络', desc: '管理电路，确保关键系统供电' },
            { icon: Users, title: '队员调度', desc: '合理分配队员，发挥技能优势' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/30 transition-all">
              <item.icon className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-white font-bold mb-1">{item.title}</h3>
              <p className="text-slate-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            选择难度
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {difficulties.map(diff => (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedDifficulty === diff.id
                    ? `border-cyan-400 bg-gradient-to-br ${diff.color} shadow-lg shadow-cyan-500/20`
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="text-white font-bold text-lg mb-1">{diff.name}</div>
                <div className={`text-xs ${selectedDifficulty === diff.id ? 'text-white/80' : 'text-slate-500'}`}>
                  {diff.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-center mb-4">
          <button
            onClick={handleStartGame}
            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 transition-all transform hover:scale-105"
          >
            <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            开始游戏
          </button>
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-2 px-6 py-4 bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 font-bold rounded-xl transition-all"
          >
            <BookOpen className="w-5 h-5" />
            游戏规则
          </button>
          <button
            onClick={handleLoadReplay}
            className="flex items-center gap-2 px-6 py-4 bg-slate-800/50 border border-slate-700 hover:border-yellow-500/50 text-slate-300 hover:text-yellow-400 font-bold rounded-xl transition-all"
          >
            <Wrench className="w-5 h-5" />
            查看回放
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate('/meteor-storm')}
            className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-400/40 transition-all transform hover:scale-105"
          >
            <Shield className="w-5 h-5" />
            陨石雨防御模式
          </button>
        </div>

        {showRules && (
          <div className="mt-6 bg-slate-900/80 backdrop-blur border border-cyan-500/30 rounded-xl p-6 animate-fadeIn">
            <h3 className="text-cyan-400 font-bold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              游戏规则
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="text-white font-bold mb-2">🎯 游戏目标</h4>
                <p className="text-slate-400 mb-4">
                  在倒计时结束前维持基地整体安全值在0以上。安全值降为0则游戏失败。
                </p>
                <h4 className="text-white font-bold mb-2">⚙️ 核心机制</h4>
                <ul className="text-slate-400 space-y-1">
                  <li>• 氧气发生器通过管线向各模块供应氧气</li>
                  <li>• 动力舱通过管线向各模块供应电力</li>
                  <li>• 管线损坏会切断资源供应</li>
                  <li>• 无氧气的模块每回合损失安全值</li>
                  <li>• 密封舱门可阻止氧气扩散到损坏区域</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-2">👥 队员操作</h4>
                <ul className="text-slate-400 space-y-1">
                  <li>• 点击队员卡片选中，再点击目标分配任务</li>
                  <li>• 维修技能影响管线修复速度</li>
                  <li>• 电气技能影响电力系统操作</li>
                  <li>• 工程技能影响舱门密封速度</li>
                </ul>
                <h4 className="text-white font-bold mt-4 mb-2">🔄 回合流程</h4>
                <ul className="text-slate-400 space-y-1">
                  <li>• 分配任务后点击"结束回合"</li>
                  <li>• 任务进度推进，可能触发新故障</li>
                  <li>• 重新计算连通性和安全值</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
