import { Device, Room, SensorEvent } from '../types';

export function formatEventValue(instance: string, value: any): { label: string; badgeStyle: string } {
  const val = String(value);

  if (instance === 'button') {
    if (val === 'click' || val === 'single_click') {
      return { 
        label: 'Одинарное нажатие', 
        badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
      };
    }
    if (val === 'double_click') {
      return { 
        label: 'Двойное нажатие', 
        badgeStyle: 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
      };
    }
    if (val === 'long_press' || val === 'hold') {
      return { 
        label: 'Длинное нажатие (удержание)', 
        badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
      };
    }
    return { 
      label: `Нажатие (${val})`, 
      badgeStyle: 'bg-white/10 text-white border-white/20' 
    };
  }

  if (instance === 'open') {
    const isOpened = val === 'opened' || val === 'true';
    return {
      label: isOpened ? 'Открыто' : 'Закрыто',
      badgeStyle: isOpened 
        ? 'bg-amber-500/15 text-amber-200 border-amber-500/30' 
        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    };
  }

  if (instance === 'water_leak') {
    const isLeak = val === 'leak';
    return {
      label: isLeak ? 'ПРОТЕЧКА ОБНАРУЖЕНА!' : 'Сухо (в норме)',
      badgeStyle: isLeak 
        ? 'bg-red-500/20 text-red-200 border-red-500/40 font-bold animate-pulse' 
        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    };
  }

  if (instance === 'motion') {
    const isMotion = val === 'detected';
    return {
      label: isMotion ? 'Движение обнаружено' : 'Движение прекратилось',
      badgeStyle: isMotion 
        ? 'bg-purple-500/15 text-purple-200 border-purple-500/30' 
        : 'bg-white/10 text-zinc-300 border-white/20',
    };
  }

  if (instance === 'vibration') {
    let name = 'Вибрация';
    if (val === 'tilt') name = 'Наклон';
    if (val === 'fall') name = 'Падение';
    return {
      label: name,
      badgeStyle: 'bg-purple-500/15 text-purple-200 border-purple-500/30',
    };
  }

  return {
    label: val,
    badgeStyle: 'bg-white/10 text-white border-white/20',
  };
}

export function formatEventTimestamp(timestamp: number): string {
  if (!timestamp) return 'Недавно';

  const date = new Date(timestamp);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (isToday) {
    return `Сегодня в ${timeStr}`;
  }
  if (isYesterday) {
    return `Вчера в ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${dateStr}, ${timeStr}`;
}

const STORAGE_KEY = 'yandex_sensor_history';

export function getSensorHistory(): SensorEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSensorHistory(events: SensorEvent[]) {
  try {
    // Keep max 150 events
    const trimmed = events.slice(0, 150);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save sensor history', e);
  }
}

export function clearSensorHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

// Inspect devices from user/info and register new events
export function updateSensorHistory(devices: Device[], rooms: Room[]): SensorEvent[] {
  const currentHistory = getSensorHistory();
  const existingIds = new Set(currentHistory.map((e) => e.id));
  const newEvents: SensorEvent[] = [];

  devices.forEach((device) => {
    if (!device.properties || !Array.isArray(device.properties)) return;

    device.properties.forEach((prop) => {
      const instance = prop.parameters?.instance || prop.state?.instance;
      const value = prop.state?.value;

      // Only track event-type sensors
      const isEventSensor = 
        prop.type === 'devices.properties.event' ||
        ['button', 'open', 'motion', 'water_leak', 'vibration'].includes(instance || '');

      if (!isEventSensor || value === undefined || value === null) return;

      const timestamp = prop.last_updated ? Math.round(prop.last_updated * 1000) : Date.now();
      const eventId = `${device.id}_${instance}_${timestamp}_${value}`;

      if (!existingIds.has(eventId)) {
        existingIds.add(eventId);
        const roomName = rooms.find((r) => r.id === device.room)?.name;
        const formatted = formatEventValue(instance || 'event', value);

        newEvents.push({
          id: eventId,
          deviceId: device.id,
          deviceName: device.name,
          roomName,
          deviceType: device.type,
          instance: instance || 'event',
          value: String(value),
          valueLabel: formatted.label,
          badgeStyle: formatted.badgeStyle,
          timestamp,
        });
      }
    });
  });

  if (newEvents.length > 0) {
    const merged = [...newEvents, ...currentHistory].sort((a, b) => b.timestamp - a.timestamp);
    saveSensorHistory(merged);
    return merged;
  }

  return currentHistory;
}
