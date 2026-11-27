export type Language = 'es' | 'en';

export type TimeFormat = '12h' | '24h';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export type ThemeStyle = 'sage' | 'slate' | 'lavender' | 'warm' | 'forest' | 'dawn' | 'dusk';

export interface WorkspaceLayout {
  showFocus: boolean;
  showDeadlines: boolean;
  showSchedule: boolean;
  showNotes: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  preferred_language: Language;
  timezone: string;
  time_format: TimeFormat;
  date_format: DateFormat;
  theme?: ThemeStyle;
  workspace_layout?: WorkspaceLayout;
  email_reminders_enabled: boolean;
  push_reminders_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  default_reminder_minutes: number;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type StandardCategory = 'university' | 'work' | 'personal' | 'health' | 'other';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  subject?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  estimated_minutes: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  subject?: string;
  category: string;
  is_pinned: boolean;
  color?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  subject?: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntry {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  subject?: string;
  weekday: number; // 0=Sunday, 1=Monday... 6=Saturday
  starts_at_time: string; // "HH:MM:SS" or "HH:MM"
  ends_at_time: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string; // "YYYY-MM-DD"
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailyPlanItem {
  id: string;
  daily_plan_id: string;
  task_id: string | null;
  event_id: string | null;
  custom_title: string | null;
  planned_start: string | null;
  planned_end: string | null;
  position: number;
  is_completed: boolean;
  created_at: string;
  // Hydrated joins
  task?: Task;
  event?: CalendarEvent;
}

export type ReminderChannel = 'all' | 'in_app' | 'push' | 'email';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface Reminder {
  id: string;
  user_id: string;
  task_id: string | null;
  event_id: string | null;
  schedule_entry_id: string | null;
  scheduled_at: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  idempotency_key: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  related_task_id: string | null;
  related_event_id: string | null;
  is_read: boolean;
  created_at: string;
}

export type FocusSessionType = 'focus' | 'short_break' | 'long_break';

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  duration_minutes: number;
  session_type: FocusSessionType;
  completed_at: string;
  created_at: string;
}
