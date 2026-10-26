import React from 'react';
import { 
  X, 
  Zap, 
  Play, 
  Loader2, 
  Clock, 
  Mic, 
  Sliders, 
  AlertCircle,
  HelpCircle,
  Power,
  ShieldAlert,
  Droplets,
  Activity,
  DoorClosed,
  Thermometer,
  Volume2,
  Sun,
  Timer,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { Scenario, Device, Room } from '../types';
import { getDeviceIcon } from '../utils/formatters';

interface ScenarioModalProps {
  scenario: Scenario;
  devices: Device[];
  rooms?: Room[];
  onClose: () => void;
  onRun: (scenario: Scenario) => void;
  isRunning: boolean;
}

interface ParsedAction {
  id: string;
  device?: Device;
  deviceName: string;
  deviceType: string;
  roomName?: string;
  actionText: string;
  badgeStyle: string;
  badgeIcon?: React.ReactNode;
}

interface ParsedTrigger {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function ScenarioModal({
  scenario,
  devices,
  rooms = [],
  onClose,
  onRun,
  isRunning,
}: ScenarioModalProps) {
  const isActive = scenario.is_active !== false;

  const getRoomName = (roomId?: string) => {
    if (!roomId) return null;
    const r = rooms.find((room) => room.id === roomId);
    return r ? r.name : null;
  };

  // Helper to extract human-readable action text from capability
  const formatCapabilityAction = (cap: any, deviceName: string): { text: string; style: string; icon: React.ReactNode } => {
    const isValve = deviceName.toLowerCase().includes('кран') || deviceName.toLowerCase().includes('перекрыт');

    if (cap?.type === 'devices.capabilities.on_off') {
      const val = cap.state?.value ?? cap.value;
      if (val === false) {
        return {
          text: isValve ? 'Перекрыть кран' : 'Выключить',
          style: 'bg-red-500/15 text-red-300 border-red-500/30',
          icon: <Power size={12} className="text-red-400" />
        };
      } else {
        return {
          text: isValve ? 'Открыть кран' : 'Включить',
          style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: <Power size={12} className="text-emerald-400" />
        };
      }
    }

    if (cap?.type === 'devices.capabilities.range') {
      const instance = cap.state?.instance || cap.parameters?.instance || 'значение';
      const val = cap.state?.value ?? cap.value;
      if (instance === 'brightness') {
        return {
          text: `Яркость: ${val}%`,
          style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: <Sun size={12} className="text-amber-400" />
        };
      }
      if (instance === 'volume') {
        return {
          text: `Громкость: ${val}`,
          style: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
          icon: <Volume2 size={12} className="text-violet-400" />
        };
      }
      return {
        text: `Уровень: ${val}`,
        style: 'bg-white/10 text-white border-white/20',
        icon: <Sliders size={12} />
      };
    }

    if (cap?.type === 'devices.capabilities.color_setting') {
      return {
        text: 'Установить цвет/свет',
        style: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        icon: <Sun size={12} className="text-purple-400" />
      };
    }

    if (cap?.type?.includes('quasar') || cap?.state?.instance === 'phrase_action') {
      const phrase = cap.state?.value || '';
      return {
        text: phrase ? `Алиса: «${phrase}»` : 'Голосовое оповещение',
        style: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        icon: <Mic size={12} className="text-purple-400" />
      };
    }

    return {
      text: 'Выполнить действие',
      style: 'bg-white/10 text-white border-white/20',
      icon: <CheckCircle2 size={12} />
    };
  };

  // Comprehensive parser for Scenario Steps
  const parseActions = (): ParsedAction[] => {
    if (!scenario.steps || !Array.isArray(scenario.steps) || scenario.steps.length === 0) {
      return [];
    }

    const actionsList: ParsedAction[] = [];

    scenario.steps.forEach((step, idx) => {
      // 1. Check launch_devices (standard Yandex IoT API structure)
      const launchDevices = step.parameters?.launch_devices || step.parameters?.devices;
      if (Array.isArray(launchDevices) && launchDevices.length > 0) {
        launchDevices.forEach((ld: any, ldIdx: number) => {
          const deviceId = ld.id || ld.device_id;
          const foundDev = devices.find((d) => d.id === deviceId);
          const name = foundDev?.name || ld.name || `Устройство (${(deviceId || '').slice(0, 8)})`;
          const type = foundDev?.type || ld.type || 'device';
          const room = getRoomName(foundDev?.room);

          const cap = ld.capabilities?.[0] || ld.actions?.[0];
          const actionInfo = formatCapabilityAction(cap, name);

          actionsList.push({
            id: `${idx}-${ldIdx}-${deviceId}`,
            device: foundDev,
            deviceName: name,
            deviceType: type,
            roomName: room || undefined,
            actionText: actionInfo.text,
            badgeStyle: actionInfo.style,
            badgeIcon: actionInfo.icon
          });
        });
        return;
      }

      // 2. Check direct device_id in step.parameters or step
      const directId = step.parameters?.device_id || step.parameters?.id || step.device_id || step.id;
      const foundDirect = devices.find((d) => d.id === directId);
      if (foundDirect) {
        const name = foundDirect.name;
        const room = getRoomName(foundDirect.room);
        const cap = step.parameters?.action || step.parameters?.capabilities?.[0];
        const actionInfo = formatCapabilityAction(cap, name);

        actionsList.push({
          id: `${idx}-${directId}`,
          device: foundDirect,
          deviceName: name,
          deviceType: foundDirect.type,
          roomName: room || undefined,
          actionText: actionInfo.text,
          badgeStyle: actionInfo.style,
          badgeIcon: actionInfo.icon
        });
        return;
      }

      // 3. Check for delay / timer step
      if (step.type?.includes('delay') || step.parameters?.delay_ms) {
        const ms = step.parameters?.delay_ms || 1000;
        const sec = Math.round(ms / 1000);
        actionsList.push({
          id: `delay-${idx}`,
          deviceName: 'Ожидание',
          deviceType: 'timer',
          actionText: `Пауза ${sec} сек`,
          badgeStyle: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          badgeIcon: <Timer size={12} className="text-sky-400" />
        });
        return;
      }

      // 4. Fallback search: does any device ID match within the JSON string of this step?
      const stepJson = JSON.stringify(step);
      const matchedDevice = devices.find((d) => stepJson.includes(d.id));
      if (matchedDevice) {
        const name = matchedDevice.name;
        const room = getRoomName(matchedDevice.room);
        const isOff = stepJson.includes('"value":false') || stepJson.includes('"instance":"on","value":false');
        const isOn = stepJson.includes('"value":true') || stepJson.includes('"instance":"on","value":true');
        const isValve = name.toLowerCase().includes('кран');

        let text = 'Выполнить действие';
        let style = 'bg-white/10 text-white border-white/20';
        let icon: React.ReactNode = <CheckCircle2 size={12} />;

        if (isOff) {
          text = isValve ? 'Перекрыть кран' : 'Выключить';
          style = 'bg-red-500/15 text-red-300 border-red-500/30';
          icon = <Power size={12} className="text-red-400" />;
        } else if (isOn) {
          text = isValve ? 'Открыть кран' : 'Включить';
          style = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
          icon = <Power size={12} className="text-emerald-400" />;
        }

        actionsList.push({
          id: `${idx}-${matchedDevice.id}`,
          device: matchedDevice,
          deviceName: name,
          deviceType: matchedDevice.type,
          roomName: room || undefined,
          actionText: text,
          badgeStyle: style,
          badgeIcon: icon
        });
        return;
      }

      // 5. Ultimate fallback if completely unknown
      actionsList.push({
        id: `unknown-${idx}`,
        deviceName: `Действие #${idx + 1}`,
        deviceType: 'unknown',
        actionText: 'Выполнить',
        badgeStyle: 'bg-white/10 text-white border-white/20',
        badgeIcon: <Zap size={12} />
      });
    });

    return actionsList;
  };

  // Parser for Scenario Triggers
  const parseTriggers = (): ParsedTrigger[] => {
    const rawTriggers = scenario.triggers || (scenario as any).trigger || (scenario as any).conditions;

    if (Array.isArray(rawTriggers) && rawTriggers.length > 0) {
      const list: ParsedTrigger[] = [];

      rawTriggers.forEach((trigger) => {
        const tJson = JSON.stringify(trigger);

        // Find device (sensor) in trigger
        const matchedSensor = devices.find((d) => tJson.includes(d.id));

        if (matchedSensor) {
          if (tJson.includes('water_leak') || tJson.includes('leak') || matchedSensor.type.includes('water_leak')) {
            list.push({
              icon: <ShieldAlert size={16} className="text-red-400 shrink-0" />,
              title: `Датчик протечки: ${matchedSensor.name}`,
              subtitle: 'Срабатывает при обнаружении протечки воды'
            });
            return;
          }
          if (tJson.includes('motion') || matchedSensor.type.includes('motion')) {
            list.push({
              icon: <Activity size={16} className="text-purple-400 shrink-0" />,
              title: `Датчик движения: ${matchedSensor.name}`,
              subtitle: 'Срабатывает при обнаружении движения'
            });
            return;
          }
          if (tJson.includes('open') || matchedSensor.type.includes('open')) {
            list.push({
              icon: <DoorClosed size={16} className="text-amber-400 shrink-0" />,
              title: `Датчик открытия: ${matchedSensor.name}`,
              subtitle: 'Срабатывает при открытии двери или окна'
            });
            return;
          }
          if (tJson.includes('temperature')) {
            list.push({
              icon: <Thermometer size={16} className="text-orange-400 shrink-0" />,
              title: `Датчик температуры: ${matchedSensor.name}`,
              subtitle: 'Срабатывает по порогу температуры'
            });
            return;
          }

          list.push({
            icon: getDeviceIcon(matchedSensor.type, 16),
            title: matchedSensor.name,
            subtitle: 'Срабатывание датчика умного дома'
          });
          return;
        }

        // Voice trigger
        if (tJson.includes('voice') || tJson.includes('phrase') || trigger.type?.includes('voice')) {
          const phrase = trigger.parameters?.phrase || trigger.value;
          list.push({
            icon: <Mic size={16} className="text-purple-400 shrink-0" />,
            title: 'Голосовая команда Алисе',
            subtitle: phrase ? `«${phrase}»` : 'Фраза голосовой активации'
          });
          return;
        }

        // Schedule trigger
        if (tJson.includes('timetable') || tJson.includes('schedule') || tJson.includes('time')) {
          list.push({
            icon: <Clock size={16} className="text-sky-400 shrink-0" />,
            title: 'По расписанию',
            subtitle: 'Автоматический запуск в заданное время'
          });
          return;
        }

        list.push({
          icon: <Zap size={16} className="text-yandex-accent shrink-0" />,
          title: 'Условие сценария',
          subtitle: trigger.type || 'Условие триггера'
        });
      });

      return list;
    }

    // Smart fallback based on scenario name
    const lowerName = scenario.name.toLowerCase();

    if (lowerName.includes('протечк')) {
      const leakSensors = devices.filter((d) => d.type.includes('water_leak') || d.name.toLowerCase().includes('протечк'));
      const sensorNames = leakSensors.length > 0 ? leakSensors.map((s) => s.name).join(', ') : 'Датчик протечки в ванной';

      return [
        {
          icon: <ShieldAlert size={16} className="text-red-400 shrink-0" />,
          title: 'Срабатывание датчика протечки',
          subtitle: `Автоматический запуск при обнаружении воды (${sensorNames})`
        }
      ];
    }

    if (lowerName.includes('утро')) {
      return [
        {
          icon: <Mic size={16} className="text-purple-400 shrink-0" />,
          title: 'Голосовая фраза Алисе',
          subtitle: '«Алиса, доброе утро» или запуск по кнопке'
        }
      ];
    }

    if (lowerName.includes('ночь') || lowerName.includes('сон')) {
      return [
        {
          icon: <Mic size={16} className="text-purple-400 shrink-0" />,
          title: 'Голосовая фраза Алисе',
          subtitle: '«Алиса, спокойной ночи» или запуск по кнопке'
        }
      ];
    }

    if (lowerName.includes('уйти') || lowerName.includes('ухожу')) {
      return [
        {
          icon: <Mic size={16} className="text-purple-400 shrink-0" />,
          title: 'Голосовая фраза Алисе',
          subtitle: '«Алиса, я ухожу» или запуск по кнопке'
        }
      ];
    }

    return [
      {
        icon: <Mic size={16} className="text-purple-400 shrink-0" />,
        title: 'Голосовая команда или запуск вручную',
        subtitle: 'Сценарий запускается фразой Алисе или кликом по кнопке «Запустить»'
      }
    ];
  };

  const parsedActions = parseActions();
  const parsedTriggers = parseTriggers();

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center backdrop-blur-sm z-50 p-4 select-none">
      <div className="bg-yandex-sidebar p-6 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl border ${
              isActive 
                ? 'bg-yandex-accent/20 border-yandex-accent/30 text-yandex-accent' 
                : 'bg-zinc-800/40 border-white/5 text-zinc-500'
            }`}>
              <Zap size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">{scenario.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {isActive ? (
                  <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Сценарий активен
                  </span>
                ) : (
                  <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Сценарий отключен
                  </span>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="hover:bg-yandex-card p-2 rounded-xl text-yandex-subtext hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Alert if disabled */}
        {!isActive && (
          <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-xs text-amber-200">
            <AlertCircle size={18} className="text-amber-400 shrink-0" />
            <span>
              Этот сценарий выключен в приложении Яндекс. Вы можете запустить его вручную кнопкой ниже.
            </span>
          </div>
        )}

        {/* Conditions Section (IF...) */}
        <div className="mb-5 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-yandex-subtext flex items-center gap-1.5">
            <Clock size={14} className="text-yandex-accent" />
            Условия запуска (Если)
          </h3>

          <div className="space-y-2">
            {parsedTriggers.map((trig, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-yandex-card/50 rounded-2xl border border-white/5 flex items-start gap-3"
              >
                <div className="p-2 bg-yandex-bg rounded-xl border border-white/5 shrink-0 mt-0.5">
                  {trig.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white leading-tight">
                    {trig.title}
                  </div>
                  <div className="text-[11px] text-yandex-subtext mt-0.5 leading-snug">
                    {trig.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Section (THEN...) */}
        <div className="mb-6 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-yandex-subtext flex items-center gap-1.5">
              <Sliders size={14} className="text-yandex-accent" />
              Действия сценария (Тогда)
            </h3>
            {parsedActions.length > 0 && (
              <span className="text-[11px] text-yandex-subtext bg-yandex-card px-2 py-0.5 rounded-full font-medium">
                {parsedActions.length} действ.
              </span>
            )}
          </div>

          {parsedActions.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {parsedActions.map((action) => (
                <div 
                  key={action.id} 
                  className="p-3 bg-yandex-card/50 hover:bg-yandex-card rounded-2xl border border-white/5 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-yandex-bg rounded-xl border border-white/5 shrink-0">
                      {action.deviceType === 'timer' ? (
                        <Timer size={18} className="text-sky-400" />
                      ) : (
                        getDeviceIcon(action.deviceType, 18)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate" title={action.deviceName}>
                        {action.deviceName}
                      </div>
                      {action.roomName && (
                        <div className="text-[11px] text-yandex-subtext truncate">
                          {action.roomName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Badge */}
                  <span className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold shrink-0 flex items-center gap-1.5 ${action.badgeStyle}`}>
                    {action.badgeIcon}
                    <span>{action.actionText}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-yandex-card/40 rounded-2xl border border-white/5 text-xs text-yandex-subtext space-y-1 text-center">
              <p className="text-white font-medium">Облачный сценарий Яндекса</p>
              <p>Команды для умных устройств сохранены в облаке Яндекса и запускаются нажатием кнопки ниже.</p>
            </div>
          )}
        </div>

        {/* Run Scenario Button */}
        <button
          onClick={() => onRun(scenario)}
          disabled={isRunning}
          className="w-full bg-yandex-accent hover:bg-yandex-accentHover py-3.5 rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Запуск сценария...</span>
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              <span>Запустить сценарий</span>
            </>
          )}
        </button>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-yandex-subtext/60">
          <span>ID: {scenario.id.slice(0, 16)}...</span>
          <span className="flex items-center gap-1">
            <HelpCircle size={11} /> Настройки логики в приложении Яндекс
          </span>
        </div>

      </div>
    </div>
  );
}
