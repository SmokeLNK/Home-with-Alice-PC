import React, { useState } from 'react';
import { 
  X, 
  Power, 
  Sun, 
  Volume2, 
  PhoneCall, 
  WifiOff, 
  HelpCircle,
  History
} from 'lucide-react';
import { Device } from '../types';
import { getDeviceIcon, getDeviceTypeName, checkIsOnline, formatProperty, isStatusDevice } from '../utils/formatters';
import { getSensorHistory, formatEventTimestamp } from '../utils/history';

interface DeviceModalProps {
  device: Device;
  roomName: string | null;
  token: string | null;
  onClose: () => void;
  onTogglePower: (device: Device, e: React.MouseEvent) => void;
  onUpdateCapability: (device: Device, capabilityType: string, instance: string, value: any) => Promise<boolean>;
  isActionLoading: boolean;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function DeviceModal({
  device,
  roomName,
  token,
  onClose,
  onTogglePower,
  onUpdateCapability,
  isActionLoading,
  onShowToast,
}: DeviceModalProps) {
  const isOnline = checkIsOnline(device);
  const isStatusOnly = isStatusDevice(device.type);
  const deviceEvents = getSensorHistory().filter((e) => e.deviceId === device.id);

  // Power capability
  const onOffCap = device.capabilities?.find((c) => c.type === 'devices.capabilities.on_off');
  const isOn = !!onOffCap?.state?.value;

  // Brightness capability
  const brightnessCap = device.capabilities?.find(
    (c) => c.type === 'devices.capabilities.range' && (c.state?.instance === 'brightness' || c.parameters?.instance === 'brightness')
  );
  const [brightness, setBrightness] = useState<number>(brightnessCap?.state?.value ?? 50);

  // Volume capability (only if device actually reports volume support)
  const volumeCap = device.capabilities?.find(
    (c) => c.type === 'devices.capabilities.range' && (c.state?.instance === 'volume' || c.parameters?.instance === 'volume')
  );
  const [volume, setVolume] = useState<number>(volumeCap?.state?.value ?? 5);

  // Smart speaker detection
  const isSpeaker = device.type.includes('smart_speaker') || 
                    device.type.includes('media') ||
                    device.name.toLowerCase().includes('станци') || 
                    device.name.toLowerCase().includes('лайт');

  const showVolume = !!volumeCap;

  const openUrl = (url: string) => {
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleBrightnessChange = async (newVal: number) => {
    setBrightness(newVal);
    await onUpdateCapability(device, 'devices.capabilities.range', 'brightness', newVal);
  };

  const handleVolumeChange = async (newVal: number) => {
    setVolume(newVal);
    await onUpdateCapability(device, 'devices.capabilities.range', 'volume', newVal);
  };

  const handleColorPreset = async (tempK: number) => {
    await onUpdateCapability(device, 'devices.capabilities.color_setting', 'temperature_k', tempK);
  };

  const handleCallSpeaker = () => {
    openUrl('https://telemost.yandex.ru/');
  };

  const handleOpenAliceChat = () => {
    openUrl('https://yandex.ru/chat#/');
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center backdrop-blur-sm z-50 p-4 select-none">
      <div className="bg-yandex-sidebar p-6 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Top Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-yandex-bg rounded-2xl border border-white/5">
              {getDeviceIcon(device.type, 28)}
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">{device.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {roomName && (
                  <span className="text-xs bg-yandex-card px-2.5 py-0.5 rounded-full text-yandex-subtext font-medium">
                    {roomName}
                  </span>
                )}
                <span className="text-xs text-yandex-subtext">
                  {getDeviceTypeName(device.type)}
                </span>
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

        {/* Status bar */}
        <div className="mb-6 p-3.5 bg-yandex-card/50 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-emerald-400">
                  {isStatusOnly ? 'В сети' : 'Устройство в сети'}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-zinc-500" />
                <span className="text-xs font-semibold text-zinc-400">
                  {isStatusOnly ? 'Не в сети' : 'Устройство офлайн'}
                </span>
              </>
            )}
          </div>

          {onOffCap && !isStatusOnly && (
            <button
              onClick={(e) => onTogglePower(device, e)}
              disabled={isActionLoading || !isOnline}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isOn
                  ? 'bg-yandex-accent text-white hover:bg-yandex-accentHover shadow-md shadow-purple-900/40'
                  : 'bg-yandex-bg text-yandex-subtext hover:text-white'
              } disabled:opacity-40`}
            >
              <Power size={14} />
              {isOn ? 'Включено' : 'Выключено'}
            </button>
          )}
        </div>

        {/* Main Controls Section */}
        <div className="space-y-5 mb-6">
          
          {/* Brightness control */}
          {brightnessCap && (
            <div className="p-4 bg-yandex-card/60 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-yandex-subtext font-medium">
                  <Sun size={16} className="text-yellow-400" />
                  <span>Яркость</span>
                </div>
                <span className="font-bold text-white">{brightness}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                onMouseUp={(e) => handleBrightnessChange(Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleBrightnessChange(Number((e.target as HTMLInputElement).value))}
                className="w-full accent-yandex-accent h-2 bg-yandex-bg rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Color temperature presets */}
          {device.capabilities?.some((c) => c.type === 'devices.capabilities.color_setting') && (
            <div className="p-4 bg-yandex-card/60 rounded-2xl border border-white/5 space-y-3">
              <div className="text-sm text-yandex-subtext font-medium">Температура света</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleColorPreset(2700)}
                  className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 transition"
                >
                  Тёплый (2700K)
                </button>
                <button
                  onClick={() => handleColorPreset(4500)}
                  className="py-2 px-3 rounded-xl bg-yellow-100/10 hover:bg-yellow-100/20 text-white text-xs font-semibold border border-white/20 transition"
                >
                  Дневной (4500K)
                </button>
                <button
                  onClick={() => handleColorPreset(6500)}
                  className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-semibold border border-cyan-500/30 transition"
                >
                  Холодный (6500K)
                </button>
              </div>
            </div>
          )}

          {/* Volume control for Speaker */}
          {showVolume && (
            <div className="p-4 bg-yandex-card/60 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-yandex-subtext font-medium">
                  <Volume2 size={16} className="text-violet-400" />
                  <span>Громкость колонки</span>
                </div>
                <span className="font-bold text-white text-base bg-yandex-bg px-2.5 py-0.5 rounded-lg border border-white/5">
                  {volume} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onMouseUp={(e) => handleVolumeChange(Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleVolumeChange(Number((e.target as HTMLInputElement).value))}
                className="w-full accent-yandex-accent h-2.5 bg-yandex-bg rounded-lg cursor-pointer"
              />
              {/* Quick preset buttons */}
              <div className="flex justify-between gap-1.5 pt-1">
                {[1, 3, 5, 7, 10].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleVolumeChange(lvl)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                      volume === lvl 
                        ? 'bg-yandex-accent text-white shadow' 
                        : 'bg-yandex-bg text-yandex-subtext hover:text-white hover:bg-yandex-card'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Speaker-specific features */}
          {isSpeaker && (
            <div className="p-4 bg-yandex-card/60 rounded-2xl border border-white/5 space-y-3">
              <span className="text-sm font-bold flex items-center gap-2 text-white">
                <PhoneCall size={16} className="text-yandex-accent" />
                Яндекс Станция — звонки и связь
              </span>

              <div className="p-3 rounded-xl bg-yandex-bg border border-white/5 text-xs text-yandex-subtext space-y-2 leading-relaxed">
                <p className="text-white/90 font-medium">
                  📞 Как позвонить на Станцию с ПК?
                </p>
                <p>
                  Яндекс не предоставляет прямого API для звонков с ПК на Станцию. Звонок возможен двумя способами:
                </p>
                <ul className="space-y-2 pl-2">
                  <li className="flex items-start gap-2">
                    <span className="text-yandex-accent font-bold shrink-0">1.</span>
                    <span>
                      <span className="text-white font-medium">Яндекс Мессенджер (телефон → ПК)</span> — откройте приложение «Яндекс» на телефоне, перейдите в «Устройства» → ваша Станция → «Позвонить».
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yandex-accent font-bold shrink-0">2.</span>
                    <span>
                      <span className="text-white font-medium">Голосом на любой другой Станции</span> — скажите: <em className="text-white">«Алиса, позвони на [название станции]»</em>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-yandex-bg border border-white/5 text-xs text-yandex-subtext space-y-2 leading-relaxed">
                <p className="text-white/90 font-medium">
                  🔊 Громкость и воспроизведение
                </p>
                <p>
                  Громкость Станции настраивается голосом (<em className="text-white">«Алиса, громкость 5»</em>) или кнопками на корпусе. Облачный API Яндекса не поддерживает изменение громкости колонок через внешние программы.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Sensors & Properties Section (Russian & Clean) */}
        {device.properties && device.properties.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-yandex-subtext">
              Показатели датчиков
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {device.properties.map((prop, idx) => {
                const formatted = formatProperty(prop);
                if (!formatted) return null;
                return (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${formatted.badgeClass}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      {formatted.icon}
                      <span className="truncate">{formatted.name}</span>
                    </div>
                    <span className="font-bold text-sm tracking-tight shrink-0">{formatted.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Specific Sensor Event History */}
        {deviceEvents.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-yandex-subtext flex items-center gap-1.5">
              <History size={14} className="text-yandex-accent" />
              История событий датчика ({deviceEvents.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {deviceEvents.slice(0, 15).map((ev) => (
                <div 
                  key={ev.id}
                  className="p-3 bg-yandex-card/50 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                >
                  <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold ${ev.badgeStyle}`}>
                    {ev.valueLabel}
                  </span>
                  <span className="text-[11px] text-yandex-subtext font-mono">
                    {formatEventTimestamp(ev.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Footer */}
        <div className="pt-4 border-t border-white/10 text-[11px] text-yandex-subtext/60 flex justify-between items-center">
          <span>ID: {device.id.slice(0, 16)}...</span>
          <span>{device.type}</span>
        </div>

      </div>
    </div>
  );
}
