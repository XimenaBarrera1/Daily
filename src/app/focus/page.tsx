'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Task, FocusSessionType } from '@/types';
import { Play, Pause, RotateCcw, CheckCircle2, Sparkles, Volume2, Timer } from 'lucide-react';

function FocusContent() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const queryTaskId = searchParams.get('taskId');

  const [sessionType, setSessionType] = useState<FocusSessionType>('focus');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(queryTaskId || '');

  // Statistics
  const [sessionsToday, setSessionsToday] = useState(0);
  const [focusMinutesToday, setFocusMinutesToday] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load user's pending tasks and today's completed focus sessions
  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Pending tasks for linking
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed');

      if (userTasks) setTasks(userTasks as Task[]);

      // Today's focus sessions
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: userSessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startOfToday.toISOString());

      if (userSessions) {
        setSessionsToday(userSessions.length);
        const totalMins = userSessions.reduce((acc, s) => acc + s.duration_minutes, 0);
        setFocusMinutesToday(totalMins);
      }
    } catch (err) {
      console.error('Error loading focus data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Audio completion sound (pleasant subtle frequency tone using Web Audio API)
  const playChime = () => {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch {
      // Audio not supported or blocked
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isActive && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      // Session finished!
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      playChime();
      handleSessionCompleted();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsRemaining]);

  // Record completed session in Supabase
  const handleSessionCompleted = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('focus_sessions').insert({
        user_id: user.id,
        task_id: selectedTaskId || null,
        duration_minutes: durationMinutes,
        session_type: sessionType,
        completed_at: new Date().toISOString(),
      });

      // Browser native notification if permission granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(t('focus.completedTitle'), {
          body: t('focus.completedMessage'),
          icon: '/icons/icon-192.png',
        });
      }

      loadData();
    } catch (err) {
      console.error('Error logging completed session:', err);
    }
  };

  // Mode Switcher
  const handleSetMode = (type: FocusSessionType, minutes: number) => {
    setIsActive(false);
    setSessionType(type);
    setDurationMinutes(minutes);
    setSecondsRemaining(minutes * 60);
  };

  // Controls
  const toggleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsRemaining(durationMinutes * 60);
  };

  // Time format MM:SS
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Progress percentage
  const totalSeconds = durationMinutes * 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;

  return (
    <AppLayout title={t('nav.focus')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t('focus.title')}</h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('focus.subtitle')}</p>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
          <button
            onClick={() => handleSetMode('focus', 25)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sessionType === 'focus' ? 'bg-[var(--primary)] text-white shadow-xs' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {t('focus.focusSession')}
          </button>
          <button
            onClick={() => handleSetMode('short_break', 5)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sessionType === 'short_break' ? 'bg-[var(--primary)] text-white shadow-xs' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {t('focus.shortBreak')}
          </button>
          <button
            onClick={() => handleSetMode('long_break', 15)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sessionType === 'long_break' ? 'bg-[var(--primary)] text-white shadow-xs' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {t('focus.longBreak')}
          </button>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="max-w-xl mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 sm:p-12 shadow-[var(--card-shadow)] text-center mb-8 relative overflow-hidden">
        {/* Subtle Background Progress Ring or Bar */}
        <div className="w-full bg-[var(--surface-secondary)] h-1.5 rounded-full mb-10 overflow-hidden">
          <div
            className="bg-[var(--primary)] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Associated Task Selector */}
        <div className="mb-8 max-w-sm mx-auto">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
            {t('focus.linkTask')}
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-3.5 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
          >
            <option value="">{t('focus.noTaskLinked')}</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} ({task.estimated_minutes} min)
              </option>
            ))}
          </select>
        </div>

        {/* Big Digital Display */}
        <div className="font-mono text-6xl sm:text-8xl font-bold tracking-tight text-[var(--foreground)] mb-8 select-none">
          {timeDisplay}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleReset}
            className="w-12 h-12 rounded-2xl p-0"
            title={t('focus.reset')}
          >
            <RotateCcw className="w-5 h-5 text-[var(--muted-foreground)]" />
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={toggleStartPause}
            className="px-8 py-3.5 rounded-2xl text-base shadow-sm font-semibold"
          >
            {isActive ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                <span>{t('focus.pause')}</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                <span>{secondsRemaining === totalSeconds ? t('focus.start') : t('focus.resume')}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Today's Focus Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        <Card className="text-center p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {t('focus.sessionsToday')}
          </span>
          <div className="text-3xl font-bold text-[var(--primary)] mt-1">{sessionsToday}</div>
        </Card>

        <Card className="text-center p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {t('focus.totalTimeToday')}
          </span>
          <div className="text-3xl font-bold text-[var(--foreground)] mt-1">
            {focusMinutesToday} {t('common.minutes')}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function FocusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-xs text-[var(--muted-foreground)]">Cargando temporizador...</div>}>
      <FocusContent />
    </Suspense>
  );
}
