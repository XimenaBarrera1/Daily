import { Task, CalendarEvent, ScheduleEntry } from '@/types';

export interface BusyBlock {
  title: string;
  startMinutes: number; // minutes from 00:00
  endMinutes: number;   // minutes from 00:00
  type: 'event' | 'schedule';
  id: string;
}

export interface FreeSlot {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export interface PlannedTaskAllocation {
  task: Task;
  plannedStartMinutes: number;
  plannedEndMinutes: number;
  startFormatted: string;
  endFormatted: string;
}

export interface DailyPlanRecommendation {
  plannedTasks: PlannedTaskAllocation[];
  busyBlocks: BusyBlock[];
  totalAvailableMinutes: number;
  totalEstimatedMinutes: number;
  hasOverflow: boolean;
  overflowMinutes: number;
  unassignedTasks: Task[];
}

// Convert "HH:MM" or "HH:MM:SS" to minutes from midnight
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

// Convert minutes from midnight to "HH:MM"
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function computeDailyRecommendation({
  planDate,
  tasks,
  events,
  scheduleEntries,
  dayStartHour = 8,  // 08:00 AM
  dayEndHour = 20,   // 08:00 PM
}: {
  planDate: string; // YYYY-MM-DD
  tasks: Task[];
  events: CalendarEvent[];
  scheduleEntries: ScheduleEntry[];
  dayStartHour?: number;
  dayEndHour?: number;
}): DailyPlanRecommendation {
  const dayStartMinutes = dayStartHour * 60;
  const dayEndMinutes = dayEndHour * 60;

  // 1. Gather all busy blocks for the day
  const rawBusyBlocks: BusyBlock[] = [];

  // Add Calendar Events on that date
  for (const ev of events) {
    const startDate = new Date(ev.starts_at);
    const endDate = new Date(ev.ends_at);
    const startMins = startDate.getHours() * 60 + startDate.getMinutes();
    const endMins = endDate.getHours() * 60 + endDate.getMinutes();

    if (endMins > startMins) {
      rawBusyBlocks.push({
        title: ev.title,
        startMinutes: Math.max(dayStartMinutes, startMins),
        endMinutes: Math.min(dayEndMinutes, endMins),
        type: 'event',
        id: ev.id,
      });
    }
  }

  // Add Recurring Schedule Entries
  for (const entry of scheduleEntries) {
    if (!entry.is_active) continue;
    const startMins = timeStringToMinutes(entry.starts_at_time);
    const endMins = timeStringToMinutes(entry.ends_at_time);

    if (endMins > startMins) {
      rawBusyBlocks.push({
        title: entry.title,
        startMinutes: Math.max(dayStartMinutes, startMins),
        endMinutes: Math.min(dayEndMinutes, endMins),
        type: 'schedule',
        id: entry.id,
      });
    }
  }

  // Sort busy blocks by start time
  rawBusyBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Merge overlapping busy blocks to find truly occupied time
  const mergedBusy: { startMinutes: number; endMinutes: number }[] = [];
  for (const block of rawBusyBlocks) {
    if (mergedBusy.length === 0) {
      mergedBusy.push({ startMinutes: block.startMinutes, endMinutes: block.endMinutes });
    } else {
      const prev = mergedBusy[mergedBusy.length - 1];
      if (block.startMinutes <= prev.endMinutes) {
        prev.endMinutes = Math.max(prev.endMinutes, block.endMinutes);
      } else {
        mergedBusy.push({ startMinutes: block.startMinutes, endMinutes: block.endMinutes });
      }
    }
  }

  // 2. Identify Free Slots between dayStartMinutes and dayEndMinutes
  const freeSlots: FreeSlot[] = [];
  let pointer = dayStartMinutes;

  for (const busy of mergedBusy) {
    if (busy.startMinutes > pointer) {
      freeSlots.push({
        startMinutes: pointer,
        endMinutes: busy.startMinutes,
        durationMinutes: busy.startMinutes - pointer,
      });
    }
    pointer = Math.max(pointer, busy.endMinutes);
  }

  if (pointer < dayEndMinutes) {
    freeSlots.push({
      startMinutes: pointer,
      endMinutes: dayEndMinutes,
      durationMinutes: dayEndMinutes - pointer,
    });
  }

  const totalAvailableMinutes = freeSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0);

  // 3. Sort pending tasks by priority (high > medium > low) and due date
  const priorityWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const pA = priorityWeights[a.priority] || 2;
    const pB = priorityWeights[b.priority] || 2;
    if (pB !== pA) return pB - pA;

    // Earlier due date first
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }
    if (a.due_at) return -1;
    if (b.due_at) return 1;

    return 0;
  });

  const totalEstimatedMinutes = sortedTasks.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0);

  // 4. Allocate tasks into free slots
  const plannedTasks: PlannedTaskAllocation[] = [];
  const unassignedTasks: Task[] = [];

  let currentSlotIndex = 0;
  let currentSlotOffset = freeSlots.length > 0 ? freeSlots[0].startMinutes : 0;

  for (const task of sortedTasks) {
    const duration = task.estimated_minutes || 30;
    let placed = false;

    while (currentSlotIndex < freeSlots.length) {
      const slot = freeSlots[currentSlotIndex];
      const remainingInSlot = slot.endMinutes - currentSlotOffset;

      if (remainingInSlot >= duration) {
        // Fits completely in current slot
        const start = currentSlotOffset;
        const end = start + duration;
        plannedTasks.push({
          task,
          plannedStartMinutes: start,
          plannedEndMinutes: end,
          startFormatted: minutesToTimeString(start),
          endFormatted: minutesToTimeString(end),
        });
        currentSlotOffset = end;
        placed = true;
        break;
      } else {
        // Doesn't fit in remaining space of current slot; advance to next slot
        currentSlotIndex++;
        if (currentSlotIndex < freeSlots.length) {
          currentSlotOffset = freeSlots[currentSlotIndex].startMinutes;
        }
      }
    }

    if (!placed) {
      unassignedTasks.push(task);
    }
  }

  const hasOverflow = unassignedTasks.length > 0 || totalEstimatedMinutes > totalAvailableMinutes;
  const overflowMinutes = Math.max(0, totalEstimatedMinutes - totalAvailableMinutes);

  return {
    plannedTasks,
    busyBlocks: rawBusyBlocks,
    totalAvailableMinutes,
    totalEstimatedMinutes,
    hasOverflow,
    overflowMinutes,
    unassignedTasks,
  };
}
