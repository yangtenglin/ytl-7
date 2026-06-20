import { useState, useEffect, useRef } from 'react';
import { useGame } from '../../hooks/useGame';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, AlertCircle } from 'lucide-react';

export default function ReplayControls() {
  const { state, replayFrame, jumpToFrame, getReplayFrames, initGame } = useGame();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<number | null>(null);
  const frames = getReplayFrames();

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      intervalRef.current = window.setInterval(() => {
        const current = replayFrame ?? 0;
        if (current < frames.length - 1) {
          jumpToFrame(current + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, frames.length, replayFrame, jumpToFrame]);

  const handlePlayPause = () => {
    if (replayFrame === null) {
      jumpToFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    jumpToFrame(0);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    const current = replayFrame ?? 0;
    if (current > 0) {
      jumpToFrame(current - 1);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    const current = replayFrame ?? 0;
    if (current < frames.length - 1) {
      jumpToFrame(current + 1);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    const value = parseInt(e.target.value);
    jumpToFrame(value);
  };

  const handleNewGame = () => {
    initGame('normal');
  };

  const currentFrame = replayFrame !== null ? frames[replayFrame] : null;
  const keyActions = currentFrame?.actions.filter(a => a.type !== 'end_turn') || [];

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          回放控制
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">速度:</span>
          {[0.5, 1, 2, 4].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 text-xs rounded border transition-all ${
                playbackSpeed === speed
                  ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400'
                  : 'border-slate-700 text-slate-500 hover:border-slate-600'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleRestart}
          className="p-2 rounded border border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-400 transition-all"
          title="重新开始"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handlePrev}
          disabled={replayFrame === null || replayFrame === 0}
          className="p-2 rounded border border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="上一帧"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-3 rounded-full border-2 border-cyan-500 bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/50 transition-all"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={handleNext}
          disabled={replayFrame === null || replayFrame >= frames.length - 1}
          className="p-2 rounded border border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="下一帧"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={replayFrame ?? 0}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>回合 1</span>
            <span>回合 {frames.length}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-mono font-bold text-cyan-400">
            {replayFrame !== null ? `T${frames[replayFrame]?.turn || 0}` : '--'}
          </div>
          <div className="text-xs text-slate-500">
            {replayFrame !== null ? `${replayFrame + 1}/${frames.length}` : '--/--'}
          </div>
        </div>
      </div>

      {keyActions.length > 0 && (
        <div className="border-t border-slate-700 pt-3">
          <h4 className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            当前回合操作
          </h4>
          <div className="space-y-1">
            {keyActions.map((action, idx) => (
              <div key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                {action.type === 'assign_task' && (
                  <span>分配任务: {action.payload.taskType === 'repair_pipe' ? '修复管线' : '密封舱门'}</span>
                )}
                {action.type === 'switch_circuit' && (
                  <span>切换电路</span>
                )}
                {action.type === 'seal_door' && (
                  <span>密封舱门</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-700 pt-3 mt-3 flex justify-end">
        <button
          onClick={handleNewGame}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all"
        >
          开始新游戏
        </button>
      </div>
    </div>
  );
}
