export interface DeviceCapability {
  type: string;
  retrievable?: boolean;
  reportable?: boolean;
  state?: {
    instance: string;
    value: any;
    action_result?: {
      status: string;
      error_message?: string;
    };
  };
  parameters?: any;
}

export interface DeviceProperty {
  type: string;
  last_updated?: number;
  parameters?: {
    instance?: string;
    unit?: string;
    events?: Array<{ value: string; name?: string }>;
  };
  state?: {
    instance?: string;
    value: any;
  };
}

export interface Device {
  id: string;
  name: string;
  type: string;
  room?: string;
  status?: string; // "online" | "offline"
  state?: string | any; // Sometimes string or object
  capabilities?: DeviceCapability[];
  properties?: DeviceProperty[];
  household_id?: string;
  skill_id?: string;
  external_id?: string;
}

export interface Room {
  id: string;
  name: string;
  household_id?: string;
  devices?: string[];
}

export interface ScenarioStep {
  type?: string;
  parameters?: {
    device_id?: string;
    action?: any;
  };
}

export interface ScenarioTrigger {
  type?: string;
  filters?: any[];
  properties?: any[];
  value?: any;
}

export interface Scenario {
  id: string;
  name: string;
  is_active?: boolean;
  icon?: string;
  steps?: any[];
  triggers?: any[];
}

export interface Household {
  id: string;
  name: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SensorEvent {
  id: string;
  deviceId: string;
  deviceName: string;
  roomName?: string;
  deviceType: string;
  instance: string;
  value: string;
  valueLabel: string;
  badgeStyle: string;
  timestamp: number;
}
