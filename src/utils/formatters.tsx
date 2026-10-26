import React from 'react';
import { 
  Lightbulb, 
  Zap, 
  Power, 
  Thermometer, 
  Tv, 
  Speaker, 
  Radio, 
  Droplets, 
  Battery, 
  ShieldAlert, 
  ShieldCheck, 
  Gauge, 
  Activity, 
  Flame, 
  DoorClosed, 
  Wind,
  Sun,
  Vibrate,
  CircleDot
} from 'lucide-react';
import { Device, DeviceProperty } from '../types';

export function checkIsOnline(device: Device): boolean {
  if (device.status === 'offline' || device.state === 'offline') {
    return false;
  }
  if (device.status === 'online' || device.state === 'online') {
    return true;
  }
  return true;
}

export interface FormattedProperty {
  name: string;
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  type: string;
}

export function formatProperty(prop: DeviceProperty): FormattedProperty | null {
  const instance = prop.parameters?.instance || prop.state?.instance || '';
  const val = prop.state?.value;

  if (val === undefined || val === null) {
    return null;
  }

  // Water leak sensor
  if (instance === 'water_leak') {
    const isLeak = val === 'leak';
    return {
      name: 'Протечка воды',
      label: isLeak ? 'ПРОТЕЧКА!' : 'Сухо',
      icon: isLeak ? (
        <ShieldAlert size={14} className="text-red-400 shrink-0 animate-bounce" />
      ) : (
        <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
      ),
      badgeClass: isLeak 
        ? 'bg-red-500/20 text-red-300 border-red-500/40' 
        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      type: 'water_leak',
    };
  }

  // Temperature
  if (instance === 'temperature') {
    const rounded = Math.round(Number(val) * 10) / 10;
    return {
      name: 'Температура',
      label: `${rounded} °C`,
      icon: <Thermometer size={14} className="text-amber-400 shrink-0" />,
      badgeClass: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
      type: 'temperature',
    };
  }

  // Humidity
  if (instance === 'humidity') {
    const rounded = Math.round(Number(val) * 10) / 10;
    return {
      name: 'Влажность',
      label: `${rounded}%`,
      icon: <Droplets size={14} className="text-sky-400 shrink-0" />,
      badgeClass: 'bg-sky-500/10 text-sky-200 border-sky-500/20',
      type: 'humidity',
    };
  }

  // Battery level
  if (instance === 'battery_level') {
    const num = Math.round(Number(val));
    const isLow = num <= 20;
    return {
      name: 'Заряд батареи',
      label: `${num}%`,
      icon: <Battery size={14} className={isLow ? "text-red-400 shrink-0" : "text-emerald-400 shrink-0"} />,
      badgeClass: isLow
        ? 'bg-red-500/15 text-red-300 border-red-500/30'
        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      type: 'battery',
    };
  }

  // Atmospheric pressure
  if (instance === 'pressure') {
    const rounded = Math.round(Number(val));
    return {
      name: 'Давление',
      label: `${rounded} мм рт. ст.`,
      icon: <Gauge size={14} className="text-purple-400 shrink-0" />,
      badgeClass: 'bg-purple-500/10 text-purple-200 border-purple-500/20',
      type: 'pressure',
    };
  }

  // Power (Watt)
  if (instance === 'power') {
    const rounded = Math.round(Number(val) * 10) / 10;
    return {
      name: 'Мощность',
      label: `${rounded} Вт`,
      icon: <Zap size={14} className="text-yellow-400 shrink-0" />,
      badgeClass: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20',
      type: 'power',
    };
  }

  // Voltage (Volt)
  if (instance === 'voltage') {
    const rounded = Math.round(Number(val) * 10) / 10;
    return {
      name: 'Напряжение',
      label: `${rounded} В`,
      icon: <Zap size={14} className="text-amber-400 shrink-0" />,
      badgeClass: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
      type: 'voltage',
    };
  }

  // Amperage (Ampere)
  if (instance === 'amperage') {
    const rounded = Math.round(Number(val) * 100) / 100;
    return {
      name: 'Сила тока',
      label: `${rounded} А`,
      icon: <Zap size={14} className="text-yellow-400 shrink-0" />,
      badgeClass: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20',
      type: 'amperage',
    };
  }

  // Open / Close (doors, windows)
  if (instance === 'open') {
    const isOpen = val === 'opened' || val === true;
    return {
      name: 'Состояние',
      label: isOpen ? 'Открыто' : 'Закрыто',
      icon: <DoorClosed size={14} className={isOpen ? "text-amber-400 shrink-0" : "text-emerald-400 shrink-0"} />,
      badgeClass: isOpen ? 'bg-amber-500/15 text-amber-200 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      type: 'open',
    };
  }

  // Carbon dioxide (CO2)
  if (instance === 'co2_level') {
    const rounded = Math.round(Number(val));
    return {
      name: 'Углекислый газ',
      label: `${rounded} ppm`,
      icon: <Wind size={14} className="text-teal-400 shrink-0" />,
      badgeClass: 'bg-teal-500/10 text-teal-200 border-teal-500/20',
      type: 'co2',
    };
  }

  // PM2.5 air quality
  if (instance === 'pm2.5_density') {
    const rounded = Math.round(Number(val));
    return {
      name: 'Качество воздуха',
      label: `${rounded} мкг/м³`,
      icon: <Wind size={14} className="text-teal-400 shrink-0" />,
      badgeClass: 'bg-teal-500/10 text-teal-200 border-teal-500/20',
      type: 'pm2.5',
    };
  }

  // Gas / Smoke
  if (instance === 'smoke' || instance === 'gas') {
    const detected = val === 'detected' || val === true;
    return {
      name: instance === 'smoke' ? 'Дым' : 'Газ',
      label: detected ? 'ТРЕВОГА!' : 'Норма',
      icon: <Flame size={14} className={detected ? "text-red-500 shrink-0 animate-bounce" : "text-emerald-400 shrink-0"} />,
      badgeClass: detected ? 'bg-red-500/25 text-red-200 border-red-500/40' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      type: 'smoke',
    };
  }

  // Vibration
  if (instance === 'vibration') {
    const isVibrating = val === 'vibration' || val === 'tilt' || val === 'fall';
    return {
      name: 'Датчик вибрации',
      label: isVibrating ? 'Движение' : 'Покой',
      icon: <Vibrate size={14} className="text-purple-400 shrink-0" />,
      badgeClass: isVibrating ? 'bg-purple-500/20 text-purple-200 border-purple-500/30' : 'bg-white/5 text-zinc-300 border-white/10',
      type: 'vibration',
    };
  }

  // Illumination
  if (instance === 'illumination') {
    const rounded = Math.round(Number(val));
    return {
      name: 'Освещенность',
      label: `${rounded} лк`,
      icon: <Sun size={14} className="text-yellow-400 shrink-0" />,
      badgeClass: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20',
      type: 'illumination',
    };
  }

  // Generic percent
  if (prop.parameters?.unit === 'unit.percent') {
    const num = isNaN(Number(val)) ? val : Math.round(Number(val));
    return {
      name: 'Показатель',
      label: `${num}%`,
      icon: <CircleDot size={14} className="text-zinc-400 shrink-0" />,
      badgeClass: 'bg-white/5 text-zinc-300 border-white/10',
      type: 'percent',
    };
  }

  // Clean unit formatting fallback
  let unit = prop.parameters?.unit || '';
  unit = unit
    .replace('unit.temperature.celsius', '°C')
    .replace('unit.pressure.mm_hg', 'мм рт. ст.')
    .replace('unit.ppm', 'ppm')
    .replace('unit.watt', 'Вт')
    .replace('unit.volt', 'В')
    .replace('unit.ampere', 'А');

  const displayVal = typeof val === 'number' ? Math.round(val * 10) / 10 : val;

  return {
    name: 'Параметр',
    label: `${displayVal}${unit ? ' ' + unit : ''}`,
    icon: <CircleDot size={14} className="text-zinc-400 shrink-0" />,
    badgeClass: 'bg-white/5 text-zinc-300 border-white/10',
    type: 'generic',
  };
}

/**
 * Devices that show "в сети / не в сети" instead of "включено / выключено".
 * These are passive devices without a meaningful on/off state.
 */
export function isStatusDevice(type: string): boolean {
  return (
    type.includes('sensor') ||
    type.includes('water_leak') ||
    type.includes('hub') ||
    type.includes('remote') ||
    type.includes('smart_speaker') ||
    type.includes('button')
  );
}

export function getDeviceTypeName(type: string): string {
  if (type.includes('light')) return 'Освещение';
  if (type.includes('socket')) return 'Умная розетка';
  if (type.includes('switch')) return 'Выключатель';
  if (type.includes('humidifier')) return 'Увлажнитель воздуха';
  if (type.includes('smart_speaker')) return 'Яндекс Станция';
  if (type.includes('media.tv')) return 'Телевизор';
  if (type.includes('media')) return 'Медиаустройство';
  if (type.includes('thermostat')) return 'Термостат';
  if (type.includes('climate')) return 'Датчик климата';
  if (type.includes('water_leak')) return 'Датчик протечки воды';
  if (type.includes('sensor')) return 'Датчик';
  if (type.includes('vacuum_cleaner')) return 'Робот-пылесос';
  if (type.includes('curtain')) return 'Умные шторы';
  if (type.includes('hub')) return 'Хаб умного дома';
  return 'Умное устройство';
}

export function getDeviceIcon(type: string, size = 22) {
  if (type.includes('light')) return <Lightbulb size={size} className="text-yellow-400" />;
  if (type.includes('socket')) return <Zap size={size} className="text-cyan-400" />;
  if (type.includes('switch')) return <Power size={size} className="text-emerald-400" />;
  if (type.includes('thermostat') || type.includes('climate')) return <Thermometer size={size} className="text-orange-400" />;
  if (type.includes('water_leak')) return <Droplets size={size} className="text-sky-400" />;
  if (type.includes('sensor')) return <Activity size={size} className="text-purple-400" />;
  if (type.includes('tv')) return <Tv size={size} className="text-blue-400" />;
  if (type.includes('smart_speaker') || type.includes('media')) return <Speaker size={size} className="text-violet-400" />;
  if (type.includes('humidifier')) return <Droplets size={size} className="text-cyan-400" />;
  return <Radio size={size} className="text-yandex-subtext" />;
}
