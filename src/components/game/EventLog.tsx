import { useEffect, useRef } from 'react';
import { useGame } from '../../hooks/useGame';
import { getSeverityColor } from '../../game/events';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
  success: CheckCircle,
};

const severityBg = {
  info: 'bg-cyan-900/20 border-cyan-700/50',
  warning: 'bg-yellow-900/20 border-yellow-700/50',
  danger: 'bg-red-900/20 border-red-700/50 animate-pulse',
  success: 'bg-green-900/20 border-green-700/50',
};

export default function EventLog() {
  const { state } = useGame();
  const { events } = state;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 h-full flex flex-col">
      <h3 className="text-cyan-400 font-bold text-sm tracking-wider mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        事件日志
        <span className="ml-auto text-xs text-slate-500 font-normal">
          共 {events.length} 条
        </span>
      </h3>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-xs"
        style={{ maxHeight: '300px' }}
      >
        {events.map((event, index) => {
          const Icon = severityIcons[event.severity];
          const isNew = index === events.length - 1;

          return (
            <div
              key={event.id}
              className={`p-2 rounded border-l-2 ${severityBg[event.severity]} ${
                isNew ? 'ring-1 ring-cyan-500/50' : ''
              } transition-all duration-300`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${getSeverityColor(event.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-slate-500 mb-0.5">
                    <span className="text-cyan-500">T{event.turn}</span>
                    <span>{formatTime(event.timestamp)}</span>
                  </div>
                  <p className={`${getSeverityColor(event.severity)} ${isNew ? 'font-bold' : ''}`}>
                    {event.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="text-center text-slate-600 py-8">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无事件记录</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>当前回合: <span className="text-cyan-400 font-bold">{state.turn}</span></span>
          <span>任务进行中: <span className="text-yellow-400 font-bold">{state.activeTasks.length}</span></span>
        </div>
      </div>
    </div>
  );
}
