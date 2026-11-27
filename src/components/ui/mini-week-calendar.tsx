'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { CalendarEvent, Task } from '@/types';

interface MiniWeekCalendarProps {
  events: CalendarEvent[];
  tasks: Task[];
  onDayClick?: (date: Date) => void;
}

export function MiniWeekCalendar({ events, tasks, onDayClick }: MiniWeekCalendarProps) {
  const { locale, formatTime } = useI18n();

  // Obtener los días de la semana actual (Lunes a Domingo)
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes...
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });

  const dayNames = locale === 'es' 
    ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] 
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Función para obtener los items (eventos o tareas) de un día específico
  const getItemsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const dayEvents = events.filter(e => e.starts_at.startsWith(dateStr));
    const dayTasks = tasks.filter(t => t.due_at?.startsWith(dateStr) && t.status !== 'completed');
    
    return { dayEvents, dayTasks };
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] shadow-sm transition-colors">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, index) => {
          const { dayEvents, dayTasks } = getItemsForDay(date);
          const hasItems = dayEvents.length > 0 || dayTasks.length > 0;
          const activeToday = isToday(date);
          const canSelectDay = Boolean(onDayClick);
          const handleDayClick = onDayClick ? () => onDayClick(date) : undefined;
          const handleDayKeyDown = onDayClick
            ? (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onDayClick(date);
                }
              }
            : undefined;

          return (
            <div 
              key={index} 
              role={canSelectDay ? 'button' : undefined}
              tabIndex={canSelectDay ? 0 : undefined}
              aria-label={canSelectDay
                ? date.toLocaleDateString(locale === 'es' ? 'es' : 'en', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : undefined}
              className={`flex flex-col items-center p-2 rounded-xl transition ${canSelectDay ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]' : ''} ${
                activeToday ? 'bg-[var(--primary-light)]/40' : 'hover:bg-[var(--surface-hover)]'
              }`}
              onClick={handleDayClick}
              onKeyDown={handleDayKeyDown}
            >
              {/* Nombre del día */}
              <span className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                activeToday ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
              }`}>
                {dayNames[index]}
              </span>

              {/* Número del día */}
              <span className={`text-sm font-semibold flex items-center justify-center h-7 w-7 rounded-full ${
                activeToday 
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--foreground)]'
              }`}>
                {date.getDate()}
              </span>

              {/* Puntos o mini barras de eventos/tareas */}
              <div className="flex flex-col gap-0.5 mt-2 w-full items-center">
                {dayTasks.slice(0, 2).map((task, i) => (
                  <div key={`task-${i}`} className="h-1 w-4 rounded-full bg-[var(--primary)] opacity-80" />
                ))}
                {dayEvents.slice(0, 2).map((event, i) => (
                  <div key={`event-${i}`} className="h-1 w-4 rounded-full bg-[var(--accent)] opacity-80" />
                ))}
                {(dayTasks.length + dayEvents.length) > 4 && (
                  <span className="text-[8px] text-[var(--muted-foreground)]">+</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
