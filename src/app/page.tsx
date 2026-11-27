'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import {
  Compass,
  CheckCircle2,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Timer,
  Bell,
  ArrowRight,
  Globe,
  Palette,
  Layers,
  GraduationCap,
  Target,
  FileText,
  Layout,
} from 'lucide-react';

export default function LandingPage() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme, availableThemes } = useTheme();

  const handleLanguageToggle = () => {
    setLocale(locale === 'es' ? 'en' : 'es');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col selection:bg-[var(--primary-light)] selection:text-[var(--primary)] transition-colors duration-200">
      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-lg shadow-xs">
            D
          </div>
          <div>
            <span className="font-bold text-xl text-[var(--foreground)] tracking-tight">DAILY</span>
            <span className="text-[10px] text-[var(--muted-foreground)] font-medium block leading-none">
              Student Workspace
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLanguageToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>{locale.toUpperCase()}</span>
          </button>

          <Link
            href="/auth/login"
            className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-3 py-1.5 transition-colors"
          >
            {t('landing.ctaSignIn')}
          </Link>

          <Link
            href="/auth/register"
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95"
          >
            {t('landing.ctaStart')}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-12 pb-20 text-center">
        {/* Slide 1 - Introduction Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-6 animate-fade-in">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>{t('landing.badge')}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--foreground)] max-w-3xl mx-auto leading-[1.15] mb-6">
          {t('landing.heroTitle')}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          {t('landing.heroSubtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-16">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-sm sm:text-base font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-sm active:scale-95"
          >
            <span>{t('landing.ctaStart')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/auth/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--foreground)] text-sm sm:text-base font-medium px-6 py-3.5 rounded-2xl transition-all shadow-xs"
          >
            <span>{t('landing.ctaSignIn')}</span>
          </Link>
        </div>

        {/* Interactive Workspace Preview Banner (Slide 4 - Notion-like modular) */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)] text-left mb-20 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[var(--border)]" />
              <div className="w-3 h-3 rounded-full bg-[var(--border)]" />
              <div className="w-3 h-3 rounded-full bg-[var(--border)]" />
              <span className="text-xs font-semibold text-[var(--muted-foreground)] ml-2">
                daily.app / workspace / universidad
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--primary)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-full">
                {locale === 'es' ? 'Semestre Activo' : 'Active Semester'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Materias & Entregas */}
            <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)] mb-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                <span>{locale === 'es' ? 'Entregas por Materia' : 'Course Assignments'}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[var(--foreground)] block">Taller 2: Subredes</span>
                    <span className="text-[10px] text-[var(--primary)] font-medium">Redes de Datos</span>
                  </div>
                  <span className="text-[10px] text-[var(--danger)] font-semibold">Hoy 23:59</span>
                </div>
                <div className="p-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[var(--foreground)] block">Examen Parcial I</span>
                    <span className="text-[10px] text-[var(--primary)] font-medium">Cálculo Integral</span>
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)]">Jueves</span>
                </div>
              </div>
            </div>

            {/* Box 2: Apuntes & Notas */}
            <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)] mb-3">
                <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                <span>{locale === 'es' ? 'Apuntes de Clase' : 'Lecture Notebooks'}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--primary)] font-semibold block">Sistemas Operativos</span>
                  <p className="font-semibold text-[var(--foreground)] line-clamp-1">Hilos y Sincronización</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5">Semáforos y exclusión mutua...</p>
                </div>
                <div className="p-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--primary)] font-semibold block">Algoritmos</span>
                  <p className="font-semibold text-[var(--foreground)] line-clamp-1">Grafos: Dijkstra & BFS</p>
                </div>
              </div>
            </div>

            {/* Box 3: Horario & Pomodoro */}
            <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)] mb-3">
                <Timer className="w-4 h-4 text-[var(--primary)]" />
                <span>{locale === 'es' ? 'Sesión de Estudio' : 'Focus Session'}</span>
              </div>
              <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] text-center">
                <span className="text-3xl font-bold text-[var(--foreground)] block tracking-tight">25:00</span>
                <span className="text-[10px] text-[var(--muted-foreground)] block mt-1">
                  {locale === 'es' ? 'Estudiar para Redes' : 'Study for Networks'}
                </span>
                <div className="mt-3 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-[11px] font-semibold inline-block">
                  {locale === 'es' ? 'Concentración Activa' : 'Deep Study'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: The 5 Core Capabilities (Slide 5) */}
        <div className="mb-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] mb-3">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xl mx-auto mb-12">
            {locale === 'es'
              ? 'Cinco herramientas esenciales en un solo espacio armónico para que nunca pierdas el foco.'
              : 'Five essential tools in one harmonious workspace so you never lose focus.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] transition-all">
              <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">{t('landing.feature1Title')}</h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.feature1Desc')}</p>
            </div>

            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] transition-all">
              <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">{t('landing.feature2Title')}</h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.feature2Desc')}</p>
            </div>

            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] transition-all">
              <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">{t('landing.feature3Title')}</h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.feature3Desc')}</p>
            </div>

            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] transition-all">
              <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-4">
                <Timer className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">{t('landing.feature4Title')}</h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.feature4Desc')}</p>
            </div>

            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] transition-all md:col-span-2">
              <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-4">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">{t('landing.feature5Title')}</h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.feature5Desc')}</p>

              {/* Theme chips */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
                {availableThemes.map((thm) => (
                  <button
                    key={thm.id}
                    onClick={() => setTheme(thm.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-secondary)] text-[var(--foreground)] transition-all"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: thm.primaryColor }} />
                    <span>{locale === 'es' ? thm.nameEs : thm.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section: 4-Step Workflow (Slide 7) */}
        <div className="mb-24 bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 sm:p-12 text-left shadow-[var(--shadow-card)]">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] block mb-1">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              {t('landing.workflowTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--primary)] block mb-2">01</span>
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">{t('landing.workflow1Title')}</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.workflow1Desc')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--primary)] block mb-2">02</span>
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">{t('landing.workflow2Title')}</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.workflow2Desc')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--primary)] block mb-2">03</span>
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">{t('landing.workflow3Title')}</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.workflow3Desc')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--primary)] block mb-2">04</span>
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">{t('landing.workflow4Title')}</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('landing.workflow4Desc')}</p>
            </div>
          </div>
        </div>

        {/* Slide 10 - Conclusion & Final CTA */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white text-center shadow-md">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
            {t('app.tagline')}
          </h3>
          <p className="text-xs sm:text-sm text-white/90 max-w-xl mx-auto mb-6 leading-relaxed">
            {locale === 'es'
              ? 'Únete a DAILY y transforma la manera en que organizas tus materias, apuntes y tiempo.'
              : 'Join DAILY and transform the way you organize your courses, notes, and time.'}
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-xs"
          >
            <span>{t('landing.ctaStart')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border)] py-8 text-center text-xs text-[var(--muted-foreground)] bg-[var(--surface)]">
        <p>{t('landing.footerText')}</p>
      </footer>
    </div>
  );
}
