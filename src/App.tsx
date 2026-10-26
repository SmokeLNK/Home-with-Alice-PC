import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Zap, 
  Power, 
  Play, 
  Settings, 
  RefreshCw, 
  Layers, 
  GripVertical, 
  ChevronLeft, 
  ChevronRight, 
  WifiOff, 
  Loader2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  History
} from 'lucide-react';
import SettingsModal from './SettingsModal';
import DeviceModal from './components/DeviceModal';
import ScenarioModal from './components/ScenarioModal';
import SensorHistoryModal from './components/SensorHistoryModal';
import { Device, Room, Scenario, Toast, SensorEvent } from './types';
import { checkIsOnline, formatProperty, getDeviceIcon, isStatusDevice } from './utils/formatters';
import { updateSensorHistory, getSensorHistory, clearSensorHistory } from './utils/history';
import appLogo from './assets/icon.png';

declare global {
  interface Window {
    api?: {
      openOAuthWindow: (clientId: string) => Promise<{ success: boolean; token?: string; error?: string }>;
      openExternal?: (url: string) => Promise<{ success: boolean; error?: string }>;
      openReadme?: () => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [toast, setToast] = useState<Toast | null>(null);

  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showSensorHistory, setShowSensorHistory] = useState(false);
  const [sensorEvents, setSensorEvents] = useState<SensorEvent[]>(() => getSensorHistory());

  // Drag and drop room state
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  };

  // Sort rooms based on user's saved order
  const sortRooms = (roomList: Room[]): Room[] => {
    try {
      const saved = localStorage.getItem('yandex_rooms_order');
      if (!saved) return roomList;
      const order: string[] = JSON.parse(saved);
      const map = new Map<string, number>();
      order.forEach((id, index) => map.set(id, index));

      return [...roomList].sort((a, b) => {
        const idxA = map.has(a.id) ? map.get(a.id)! : 999;
        const idxB = map.has(b.id) ? map.get(b.id)! : 999;
        return idxA - idxB;
      });
    } catch {
      return roomList;
    }
  };

  const loadData = async (accessToken: string) => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const response = await fetch('https://api.iot.yandex.net/v1.0/user/info', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.status === 401) {
        showToast('Токен Яндекс недействителен или срок его действия истек.', 'error');
        setToken(null);
        localStorage.removeItem('yandex_access_token');
        setShowSettings(true);
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (data.status === 'ok') {
        const loadedDevices: Device[] = data.devices || [];
        setDevices(loadedDevices);
        
        // Rooms with persisted order
        const loadedRooms: Room[] = data.rooms || [];
        setRooms(sortRooms(loadedRooms));

        // Cloud scenarios
        setScenarios(data.scenarios || []);

        // Track and persist sensor history events
        const updatedEvents = updateSensorHistory(loadedDevices, loadedRooms);
        setSensorEvents(updatedEvents);
      } else {
        showToast(`Ошибка API Яндекса: ${data.message || 'Сбой получения данных'}`, 'error');
      }
    } catch {
      showToast('Ошибка сети: не удалось связаться с серверами Яндекса', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Mount effect
  useEffect(() => {
    const savedToken = localStorage.getItem('yandex_access_token');
    if (savedToken) {
      setToken(savedToken);
      loadData(savedToken);
    } else {
      setShowSettings(true);
    }
  }, []);

  const handleSaveToken = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('yandex_access_token', newToken);
    setShowSettings(false);
    loadData(newToken);
    showToast('Токен сохранен, данные дома загружаются...', 'success');
  };

  const handleSaveClientId = async (clientId: string) => {
    localStorage.setItem('yandex_client_id', clientId);

    if (!window.api?.openOAuthWindow) {
      showToast('Вход через окно доступен в приложении Electron. Вставьте токен напрямую.', 'error');
      return;
    }

    showToast('Открываем окно авторизации Яндекс...', 'info');
    const result = await window.api.openOAuthWindow(clientId);

    if (result.success && result.token) {
      handleSaveToken(result.token);
    } else {
      showToast(`Ошибка авторизации: ${result.error || 'Не удалось получить токен'}`, 'error');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setDevices([]);
    setRooms([]);
    setScenarios([]);
    localStorage.removeItem('yandex_access_token');
    setShowSettings(false);
    showToast('Вы вышли из аккаунта', 'info');
  };

  // Device Power On/Off
  const handleToggleDevice = async (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    const onOffCap = device.capabilities?.find((c) => c.type === 'devices.capabilities.on_off');
    if (!onOffCap) return;

    const currentVal = !!onOffCap.state?.value;
    const nextVal = !currentVal;

    // Optimistic UI update
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== device.id) return d;
        return {
          ...d,
          capabilities: d.capabilities?.map((c) => {
            if (c.type === 'devices.capabilities.on_off') {
              return { ...c, state: { ...c.state, instance: 'on', value: nextVal } };
            }
            return c;
          }),
        };
      })
    );

    // Also update selectedDevice if modal is open
    if (selectedDevice && selectedDevice.id === device.id) {
      setSelectedDevice((prev) =>
        prev
          ? {
              ...prev,
              capabilities: prev.capabilities?.map((c) => {
                if (c.type === 'devices.capabilities.on_off') {
                  return { ...c, state: { ...c.state, instance: 'on', value: nextVal } };
                }
                return c;
              }),
            }
          : null
      );
    }

    setActionLoading((prev) => ({ ...prev, [device.id]: true }));

    try {
      const response = await fetch('https://api.iot.yandex.net/v1.0/devices/actions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devices: [
            {
              id: device.id,
              actions: [
                {
                  type: 'devices.capabilities.on_off',
                  state: {
                    instance: 'on',
                    value: nextVal,
                  },
                },
              ],
            },
          ],
        }),
      });

      const resData = await response.json();
      if (resData.status !== 'ok') {
        showToast(`Не удалось переключить «${device.name}»`, 'error');
        if (token) loadData(token);
      }
    } catch {
      showToast('Ошибка сети при отправке команды устройству', 'error');
      if (token) loadData(token);
    } finally {
      setActionLoading((prev) => ({ ...prev, [device.id]: false }));
    }
  };

  // Update specific capability (brightness, volume, color temperature)
  const handleUpdateCapability = async (
    device: Device,
    capabilityType: string,
    instance: string,
    value: any
  ): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch('https://api.iot.yandex.net/v1.0/devices/actions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devices: [
            {
              id: device.id,
              actions: [
                {
                  type: capabilityType,
                  state: {
                    instance,
                    value,
                  },
                },
              ],
            },
          ],
        }),
      });

      const resData = await response.json();
      if (resData.status === 'ok') {
        showToast(`«${device.name}» обновлено!`, 'success');
        return true;
      } else {
        showToast(`Ошибка: ${resData.message || 'Сбой обновления параметра'}`, 'error');
        return false;
      }
    } catch {
      showToast('Ошибка сети при обновлении параметра', 'error');
      return false;
    }
  };

  // Run Scenario
  const handleRunScenario = async (scenario: Scenario, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;

    setActionLoading((prev) => ({ ...prev, [`scenario-${scenario.id}`]: true }));

    // Check if it's a local PC macro
    if (scenario.id.startsWith('local-')) {
      try {
        const localActions = scenario.steps?.map((step: any) => ({
          id: step.parameters.device_id,
          actions: [
            {
              type: 'devices.capabilities.on_off',
              state: {
                instance: 'on',
                value: step.parameters.action,
              },
            },
          ],
        })) || [];

        const response = await fetch('https://api.iot.yandex.net/v1.0/devices/actions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ devices: localActions }),
        });

        const resData = await response.json();
        if (resData.status === 'ok') {
          showToast(`Быстрый сценарий «${scenario.name}» выполнен!`, 'success');
          setTimeout(() => loadData(token), 1000);
        } else {
          showToast(`Ошибка сценария: ${resData.message || 'Сбой'}`, 'error');
        }
      } catch {
        showToast('Ошибка сети при выполнении сценария', 'error');
      } finally {
        setActionLoading((prev) => ({ ...prev, [`scenario-${scenario.id}`]: false }));
      }
      return;
    }

    // Cloud scenario
    try {
      const response = await fetch(`https://api.iot.yandex.net/v1.0/scenarios/${scenario.id}/actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const resData = await response.json();
      if (resData.status === 'ok') {
        showToast(`Сценарий «${scenario.name}» успешно запущен!`, 'success');
        setTimeout(() => loadData(token), 1200);
      } else {
        showToast(`Ошибка: ${resData.message || 'Не удалось запустить сценарий'}`, 'error');
      }
    } catch {
      showToast('Ошибка сети при запуске сценария', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`scenario-${scenario.id}`]: false }));
    }
  };

  // Room drag & drop handlers
  const handleRoomDragStart = (e: React.DragEvent, roomId: string) => {
    e.dataTransfer.setData('text/plain', roomId);
    setDraggedRoomId(roomId);
  };

  const handleRoomDrop = (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    if (!draggedRoomId || draggedRoomId === targetRoomId) return;

    const sourceIdx = rooms.findIndex((r) => r.id === draggedRoomId);
    const targetIdx = rooms.findIndex((r) => r.id === targetRoomId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...rooms];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    setRooms(reordered);
    const orderIds = reordered.map((r) => r.id);
    localStorage.setItem('yandex_rooms_order', JSON.stringify(orderIds));
    setDraggedRoomId(null);
  };

  const handleMoveRoom = (roomId: string, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rooms.length) return;

    const reordered = [...rooms];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    setRooms(reordered);
    const orderIds = reordered.map((r) => r.id);
    localStorage.setItem('yandex_rooms_order', JSON.stringify(orderIds));
  };

  // Filtering
  const filteredDevices = devices.filter((device) => {
    if (activeTab === 'all') return true;
    if (device.room === activeTab) return true;
    const currentRoom = rooms.find((r) => r.id === activeTab);
    return currentRoom?.devices?.includes(device.id);
  });

  const getRoomName = (roomId?: string) => {
    if (!roomId) return null;
    const r = rooms.find((room) => room.id === roomId);
    return r ? r.name : null;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-yandex-bg text-white font-sans select-none">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold border backdrop-blur-md transition-all animate-bounce ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40' 
            : toast.type === 'error'
            ? 'bg-red-950/90 text-red-200 border-red-500/40'
            : 'bg-yandex-card/90 text-white border-white/20'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={18} className="text-red-400 shrink-0" />}
          {toast.type === 'info' && <AlertCircle size={18} className="text-yandex-accent shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar: Real Scenarios & Settings */}
      <aside className="w-64 bg-yandex-sidebar flex flex-col justify-between p-4 border-r border-white/10 shrink-0">
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Logo / Header */}
          <div className="flex items-center gap-3 px-2 mb-6">
            <img 
              src={appLogo} 
              alt="Дом с Алисой" 
              className="w-9 h-9 rounded-2xl shadow-lg shadow-purple-900/40 object-cover border border-white/10" 
            />
            <div>
              <h1 className="font-bold text-base leading-tight">Дом с Алисой</h1>
              <p className="text-[11px] text-yandex-subtext">Управление с ПК</p>
            </div>
          </div>

          {/* Scenarios Header (View and Run only) */}
          <div className="flex items-center justify-between px-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-yandex-subtext">Сценарии</h2>
            <span className="text-[11px] font-semibold text-yandex-subtext/60">{scenarios.length}</span>
          </div>

          {/* Scenarios List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {scenarios.length > 0 ? (
              scenarios.map((scenario) => {
                const isRunning = !!actionLoading[`scenario-${scenario.id}`];
                const isActive = scenario.is_active !== false;

                return (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`w-full p-2.5 rounded-2xl border transition flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-yandex-card/50 hover:bg-yandex-card border-white/5 hover:border-yandex-accent/40 text-white'
                        : 'bg-yandex-card/20 hover:bg-yandex-card/40 border-dashed border-white/10 text-yandex-subtext opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <Zap 
                        size={16} 
                        className={`shrink-0 transition ${
                          isActive 
                            ? 'text-yandex-accent group-hover:scale-110' 
                            : 'text-zinc-600'
                        }`} 
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold truncate block">
                          {scenario.name}
                        </span>
                        {!isActive && (
                          <span className="text-[10px] text-amber-400 font-medium block">
                            Отключен
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dedicated Play Button */}
                    <button
                      onClick={(e) => handleRunScenario(scenario, e)}
                      disabled={isRunning}
                      className="p-2 rounded-xl bg-yandex-bg/70 hover:bg-yandex-accent hover:text-white text-yandex-subtext transition shrink-0 border border-white/5 disabled:opacity-40"
                      title="Запустить сценарий"
                    >
                      {isRunning ? (
                        <Loader2 size={14} className="animate-spin text-yandex-accent" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-yandex-subtext/70 bg-yandex-card/20 rounded-2xl border border-dashed border-white/5">
                {token ? 'Нет доступных сценариев' : 'Войдите, чтобы загрузить сценарии'}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Button: Settings */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full p-3 rounded-2xl bg-yandex-card hover:bg-yandex-cardHover transition flex items-center justify-between text-sm font-medium border border-white/5"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-yandex-subtext" />
              <span>Настройки</span>
            </div>
            {token ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Tabs: Reorderable Rooms & Refresh Button */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-yandex-sidebar/30">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            
            {/* Pinned "Все устройства" tab (Cannot be dragged) */}
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-yandex-accent text-white shadow-lg shadow-purple-900/30'
                  : 'bg-yandex-card/60 text-yandex-subtext hover:text-white hover:bg-yandex-card'
              }`}
            >
              <Layers size={14} />
              Все устройства ({devices.length})
            </button>

            {/* Draggable Room Tabs */}
            {rooms.map((room, index) => {
              const isSelected = activeTab === room.id;
              const roomDeviceCount = devices.filter(
                (d) => d.room === room.id || room.devices?.includes(d.id)
              ).length;

              return (
                <div
                  key={room.id}
                  draggable
                  onDragStart={(e) => handleRoomDragStart(e, room.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleRoomDrop(e, room.id)}
                  onClick={() => setActiveTab(room.id)}
                  className={`group relative px-3 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-yandex-accent text-white shadow-lg shadow-purple-900/30 border-yandex-accent'
                      : 'bg-yandex-card/60 text-yandex-subtext hover:text-white hover:bg-yandex-card border-white/5'
                  }`}
                  title="Перетащите для изменения порядка"
                >
                  <GripVertical size={12} className="opacity-40 group-hover:opacity-100 cursor-grab" />
                  <span>{room.name} ({roomDeviceCount})</span>

                  {/* Left / Right mini-arrows on hover */}
                  <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                    {index > 0 && (
                      <button
                        onClick={(e) => handleMoveRoom(room.id, 'left', e)}
                        className="hover:text-white opacity-60 hover:opacity-100 p-0.5"
                        title="Сдвинуть влево"
                      >
                        <ChevronLeft size={12} />
                      </button>
                    )}
                    {index < rooms.length - 1 && (
                      <button
                        onClick={(e) => handleMoveRoom(room.id, 'right', e)}
                        className="hover:text-white opacity-60 hover:opacity-100 p-0.5"
                        title="Сдвинуть вправо"
                      >
                        <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sensor History button */}
            <button
              onClick={() => setShowSensorHistory(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-yandex-card hover:bg-yandex-cardHover text-yandex-subtext hover:text-white transition border border-white/5 flex items-center gap-2 text-xs font-bold"
              title="История событий датчиков"
            >
              <History size={16} className="text-yandex-accent" />
              <span className="hidden sm:inline">История событий</span>
              {sensorEvents.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-yandex-accent/25 text-purple-200 text-[10px] font-mono">
                  {sensorEvents.length}
                </span>
              )}
            </button>

            {/* Refresh Data button */}
            <button
              onClick={() => token && loadData(token)}
              disabled={isLoading || !token}
              className="p-2.5 rounded-2xl bg-yandex-card hover:bg-yandex-cardHover text-yandex-subtext hover:text-white transition shrink-0 border border-white/5 disabled:opacity-40"
              title="Обновить устройства"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin text-yandex-accent' : ''} />
            </button>
          </div>
        </header>

        {/* Content: Device Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading && devices.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-yandex-subtext gap-3">
              <Loader2 size={36} className="animate-spin text-yandex-accent" />
              <p className="text-sm">Загрузка умного дома...</p>
            </div>
          ) : !token ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <img 
                src={appLogo} 
                alt="Дом с Алисой" 
                className="w-16 h-16 rounded-3xl mb-4 shadow-xl shadow-purple-950/40 object-cover border border-white/10" 
              />
              <h2 className="text-xl font-bold mb-2">Умный дом не подключен</h2>
              <p className="text-yandex-subtext text-sm mb-6">
                Введите OAuth токен в настройках, чтобы получить доступ к вашим устройствам и сценариям.
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="bg-yandex-accent hover:bg-yandex-accentHover px-6 py-3 rounded-2xl font-bold transition shadow-lg shadow-purple-900/40"
              >
                Подключить умный дом
              </button>
            </div>
          ) : filteredDevices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredDevices.map((device) => {
                const onOffCap = device.capabilities?.find((c) => c.type === 'devices.capabilities.on_off');
                const hasPowerControl = !!onOffCap;
                const isOn = !!onOffCap?.state?.value;
                const isOnline = checkIsOnline(device);
                const isWorking = !!actionLoading[device.id];
                const roomName = getRoomName(device.room);
                // Status-only devices show "в сети / не в сети" regardless of on/off state
                const isStatusOnly = isStatusDevice(device.type);

                return (
                  <div
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className={`bg-yandex-card p-5 rounded-3xl border transition duration-200 flex flex-col justify-between relative group cursor-pointer ${
                      isOn && !isStatusOnly
                        ? 'border-yandex-accent/60 shadow-lg shadow-purple-950/20' 
                        : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: Icon + Power Switch */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-yandex-bg rounded-2xl border border-white/5 group-hover:scale-105 transition">
                        {getDeviceIcon(device.type, 24)}
                      </div>

                      {hasPowerControl && !isStatusOnly && (
                        <button
                          onClick={(e) => handleToggleDevice(device, e)}
                          disabled={isWorking || !isOnline}
                          className={`p-3 rounded-2xl transition flex items-center justify-center ${
                            isOn
                              ? 'bg-yandex-accent text-white shadow-md shadow-purple-900/40 hover:bg-yandex-accentHover'
                              : 'bg-yandex-bg text-yandex-subtext hover:text-white hover:bg-yandex-cardHover'
                          } disabled:opacity-30`}
                          title={isOn ? 'Выключить' : 'Включить'}
                        >
                          {isWorking ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Power size={18} />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Middle: Name & Room */}
                    <div>
                      <h3 className="font-bold text-base text-white truncate" title={device.name}>
                        {device.name}
                      </h3>
                      {roomName && (
                        <p className="text-yandex-subtext text-xs mt-0.5 truncate">
                          {roomName}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Status + Sensor Properties */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {isOnline ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="text-emerald-400 font-semibold">
                              {isStatusOnly
                                ? 'В сети'
                                : isOn ? 'Включено' : 'Выключено'}
                            </span>
                          </>
                        ) : (
                          <>
                            <WifiOff size={13} className="text-zinc-500" />
                            <span className="text-zinc-500 font-medium">
                              {isStatusOnly ? 'Не в сети' : 'Офлайн'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Display Sensor Properties */}
                      {device.properties && device.properties.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {device.properties
                            .map((p) => formatProperty(p))
                            .filter((f): f is NonNullable<typeof f> => f !== null)
                            .slice(0, 2)
                            .map((formatted, idx) => (
                              <span 
                                key={idx} 
                                title={`${formatted.name}: ${formatted.label}`}
                                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 ${formatted.badgeClass}`}
                              >
                                {formatted.icon}
                                {formatted.label}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-yandex-subtext">
              <p className="text-base font-semibold">В этой комнате нет устройств</p>
              <p className="text-xs mt-1">Выберите вкладку «Все устройства», чтобы увидеть полный список.</p>
            </div>
          )}
        </div>
      </main>

      {/* Device Details Modal */}
      {selectedDevice && (
        <DeviceModal
          device={selectedDevice}
          roomName={getRoomName(selectedDevice.room)}
          token={token}
          onClose={() => setSelectedDevice(null)}
          onTogglePower={handleToggleDevice}
          onUpdateCapability={handleUpdateCapability}
          isActionLoading={!!actionLoading[selectedDevice.id]}
          onShowToast={showToast}
        />
      )}

      {/* Scenario Details Modal */}
      {selectedScenario && (
        <ScenarioModal
          scenario={selectedScenario}
          devices={devices}
          rooms={rooms}
          onClose={() => setSelectedScenario(null)}
          onRun={(sc) => handleRunScenario(sc)}
          isRunning={!!actionLoading[`scenario-${selectedScenario.id}`]}
        />
      )}

      {/* Sensor History Modal */}
      {showSensorHistory && (
        <SensorHistoryModal
          events={sensorEvents}
          onClose={() => setShowSensorHistory(false)}
          onClear={() => {
            clearSensorHistory();
            setSensorEvents([]);
            showToast('История событий датчиков очищена', 'info');
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaveToken={handleSaveToken}
          onSaveClientId={handleSaveClientId}
          currentToken={token}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
