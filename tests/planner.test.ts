import { describe, it, expect } from 'vitest';
import { computeDailyRecommendation, timeStringToMinutes, minutesToTimeString } from '../src/lib/planner/algorithm';
import { Task, CalendarEvent, ScheduleEntry } from '../src/types';

describe('Planner Algorithm', () => {
  it('converts time strings to minutes and back accurately', () => {
    expect(timeStringToMinutes('08:30')).toBe(510);
    expect(timeStringToMinutes('14:00')).toBe(840);
    expect(minutesToTimeString(510)).toBe('08:30');
    expect(minutesToTimeString(840)).toBe('14:00');
  });

  it('allocates tasks in free slots between commitments prioritizing high priority', () => {
    const tasks: Task[] = [
      {
        id: 't-low',
        user_id: 'u1',
        title: 'Low Priority Review',
        description: '',
        category: 'personal',
        priority: 'low',
        status: 'pending',
        due_at: '2026-11-13T18:00:00Z',
        estimated_minutes: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 't-high',
        user_id: 'u1',
        title: 'High Priority Math Exam Prep',
        description: '',
        category: 'university',
        priority: 'high',
        status: 'pending',
        due_at: '2026-11-13T17:00:00Z',
        estimated_minutes: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    // Schedule entry from 10:00 to 12:00 (600 to 720 mins)
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'sch-1',
        user_id: 'u1',
        title: 'Physics Class',
        description: '',
        category: 'university',
        weekday: 5,
        starts_at_time: '10:00',
        ends_at_time: '12:00',
        start_date: null,
        end_date: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = computeDailyRecommendation({
      planDate: '2026-11-13',
      tasks,
      events: [],
      scheduleEntries,
      dayStartHour: 8, // 08:00
      dayEndHour: 18,  // 18:00
    });

    expect(result.plannedTasks.length).toBe(2);
    // High priority task should be scheduled first (at 08:00 to 09:00)
    expect(result.plannedTasks[0].task.id).toBe('t-high');
    expect(result.plannedTasks[0].startFormatted).toBe('08:00');
    expect(result.plannedTasks[0].endFormatted).toBe('09:00');

    // Low priority task scheduled next (at 09:00 to 10:00, before class)
    expect(result.plannedTasks[1].task.id).toBe('t-low');
    expect(result.plannedTasks[1].startFormatted).toBe('09:00');
    expect(result.plannedTasks[1].endFormatted).toBe('10:00');

    expect(result.hasOverflow).toBe(false);
  });

  it('detects overflow when tasks exceed available hours', () => {
    const tasks: Task[] = [
      {
        id: 't-huge-1',
        user_id: 'u1',
        title: 'Major Project Coding',
        description: '',
        category: 'work',
        priority: 'high',
        status: 'pending',
        due_at: null,
        estimated_minutes: 300, // 5 hours
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 't-huge-2',
        user_id: 'u1',
        title: 'Thesis Writing',
        description: '',
        category: 'university',
        priority: 'high',
        status: 'pending',
        due_at: null,
        estimated_minutes: 300, // 5 hours
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    // Day only has 4 hours total (08:00 to 12:00 = 240 mins)
    const result = computeDailyRecommendation({
      planDate: '2026-11-13',
      tasks,
      events: [],
      scheduleEntries: [],
      dayStartHour: 8,
      dayEndHour: 12,
    });

    expect(result.hasOverflow).toBe(true);
    expect(result.overflowMinutes).toBe(360); // 600 - 240 = 360
    expect(result.unassignedTasks.length).toBeGreaterThan(0);
  });
});
