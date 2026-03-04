export type MedicationScheduleItem = {
  hour: number; // 0–23
  minute: number; // 0–59
};

export type MedicationTemplateItem = {
  name: string;
  dosage: string;
  route: string;
  schedule: MedicationScheduleItem[];
  instructions?: string;
  isPRN?: boolean;
  prnRule?: string;
};

export type MedicationTemplateRow = {
  id: string;
  templateKey: string;
  templateName: string;
  version: number;
  isActive: boolean;
  scope: "GLOBAL" | "PARTICIPANT";
  participantId: string | null;
  defaultRangePreset: "day" | "week_plus" | "month_plus";
  items: MedicationTemplateItem[];
  createdAt: string;
  updatedAt: string;
};
