export type OperationalHealth = "Healthy" | "Degraded" | "Unhealthy" | "Unknown";

export interface Measurement {
  name: string;
  value: number;
  unit: string;
  description?: string | null;
}

export interface ComponentSnapshot {
  component: string;
  health: OperationalHealth;
  collectedAt: string;
  measurements: Measurement[];
  issues: Array<{
    severity: OperationalHealth;
    code: string;
    message: string;
  }>;
}

export interface QueueStatus {
  name: string;
  ready: number;
  unacknowledged: number;
  total: number;
  consumers: number;
  isDeadLetterQueue: boolean;
}

export interface OperationsOverview {
  collectedAt: string;
  overallHealth: OperationalHealth;
  components: ComponentSnapshot[];
  queues: QueueStatus[];
  dependencies: Array<{
    name: string;
    health: OperationalHealth;
    detail: string;
  }>;
}
