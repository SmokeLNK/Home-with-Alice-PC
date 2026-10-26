import React, { useState } from 'react';
import { 
  X, 
  History, 
  Trash2, 
  Search, 
  ShieldAlert, 
  DoorClosed, 
  Activity, 
  Radio, 
  Filter
} from 'lucide-react';
import { SensorEvent } from '../types';
import { formatEventTimestamp, clearSensorHistory } from '../utils/history';
import { getDeviceIcon } from '../utils/formatters';

interface SensorHistoryModalProps {
  events: SensorEvent[];
  onClose: () => void;
  onClear: () => void;
}

export default function SensorHistoryModal({
  events,
  onClose,
  onClear,
}: SensorHistoryModalProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = events.filter((ev) => {
    if (filterType !== 'all' && ev.instance !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ev.deviceName.toLowerCase().includes(q);
      const matchRoom = (ev.roomName || '').toLowerCase().includes(q);
      const matchVal = ev.valueLabel.toLowerCase().includes(q);
      if (!matchName && !matchRoom && !matchVal) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center backdrop-blur-sm z-50 p-4 select-none">
      <div className="bg-yandex-sidebar p-6 rounded-3xl w-full max-w-xl border border-white/10 shadow-2xl relative text-white max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yandex-accent/20 text-yandex-accent rounded-2xl border border-yandex-accent/30">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">История событий датчиков</h2>
              <p className="text-xs text-yandex-subtext">Нажатия кнопок, открытие дверей, протечки</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <button
                onClick={onClear}
                className="hover:bg-red-500/10 text-red-400 p-2 rounded-xl text-xs font-semibold border border-transparent hover:border-red-500/20 transition flex items-center gap-1.5"
                title="Очистить историю"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button 
              onClick={onClose} 
              className="hover:bg-yandex-card p-2 rounded-xl text-yandex-subtext hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-3 shrink-0 text-xs">
          {[
            { id: 'all', label: 'Все события' },
            { id: 'button', label: 'Кнопки и клики' },
            { id: 'open', label: 'Открытие' },
            { id: 'water_leak', label: 'Протечки' },
            { id: 'motion', label: 'Движение' },
            { id: 'vibration', label: 'Вибрация' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 border ${
                filterType === tab.id
                  ? 'bg-yandex-accent text-white border-yandex-accent shadow-sm'
                  : 'bg-yandex-card/60 text-yandex-subtext hover:text-white border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative mb-4 shrink-0">
          <Search size={16} className="absolute left-3.5 top-3 text-yandex-subtext" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию датчика или комнате..."
            className="w-full bg-yandex-bg pl-10 pr-4 py-2.5 rounded-xl border border-white/10 text-xs text-white placeholder-yandex-subtext/60 focus:outline-none focus:border-yandex-accent"
          />
        </div>

        {/* Events List */}
        <div className="overflow-y-auto custom-scrollbar space-y-2.5 flex-1 pr-1">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 bg-yandex-card/50 hover:bg-yandex-card rounded-2xl border border-white/5 transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-yandex-bg rounded-xl border border-white/5 shrink-0">
                    {getDeviceIcon(ev.deviceType, 18)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate" title={ev.deviceName}>
                      {ev.deviceName}
                    </div>
                    {ev.roomName && (
                      <div className="text-[11px] text-yandex-subtext truncate">
                        {ev.roomName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className={`px-2.5 py-0.5 rounded-xl border text-[11px] font-semibold ${ev.badgeStyle}`}>
                    {ev.valueLabel}
                  </span>
                  <span className="text-[10px] text-yandex-subtext font-mono">
                    {formatEventTimestamp(ev.timestamp)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center text-yandex-subtext gap-2">
              <History size={32} className="opacity-30" />
              <p className="text-xs">
                {events.length === 0 
                  ? 'События датчиков пока не зафиксированы. Они появятся здесь при первом срабатывании кнопок или датчиков.'
                  : 'Событий по выбранному фильтру не найдено.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-yandex-subtext/60 shrink-0">
          <span>Всего записей: {filteredEvents.length}</span>
          <span>История сохраняется локально на ПК</span>
        </div>

      </div>
    </div>
  );
}
