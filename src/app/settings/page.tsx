'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';
import { Profile, Language, TimeFormat, DateFormat, ThemeStyle } from '@/types';
import {
  User,
  Globe,
  Clock,
  Bell,
  Lock,
  Trash2,
  Check,
  AlertCircle,
  ShieldCheck,
  Server,
  Mail,
  Zap,
  Palette,
} from 'lucide-react';

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme, availableThemes } = useTheme();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState<Language>(locale);
  const [timezone, setTimezone] = useState('America/Bogota');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY');
  const [emailReminders, setEmailReminders] = useState(true);
  const [pushReminders, setPushReminders] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [defaultReminder, setDefaultReminder] = useState(15);

  // Password update
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  // Delete account modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Save profile state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnostics
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [vapidConfigured, setVapidConfigured] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || '');

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data as Profile);
          setFullName(data.full_name || '');
          setLanguage(data.preferred_language || locale);
          setTimezone(data.timezone || 'America/Bogota');
          setTimeFormat(data.time_format || '12h');
          setDateFormat(data.date_format || 'DD/MM/YYYY');
          setEmailReminders(data.email_reminders_enabled ?? true);
          setPushReminders(data.push_reminders_enabled ?? true);
          setQuietHoursStart(data.quiet_hours_start || '22:00');
          setQuietHoursEnd(data.quiet_hours_end || '07:00');
          setDefaultReminder(data.default_reminder_minutes || 15);
        }
      }

      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      setSupabaseConfigured(Boolean(sbUrl && !sbUrl.includes('placeholder')));
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      setVapidConfigured(Boolean(vapidKey && vapidKey.length > 20));
    } catch (err) {
      console.warn('Error loading settings:', err);
    }
  }, [locale]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Save Profile Preferences
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          preferred_language: language,
          timezone,
          time_format: timeFormat,
          date_format: dateFormat,
          email_reminders_enabled: emailReminders,
          push_reminders_enabled: pushReminders,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd,
          default_reminder_minutes: Number(defaultReminder) || 15,
        })
        .eq('id', user.id);

      if (error) throw error;

      if (language !== locale) {
        setLocale(language);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage(locale === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordMessage(locale === 'es' ? 'Contraseña actualizada exitosamente.' : 'Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage(err.message || 'Error updating password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting account');
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout title={t('settings.title')}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t('settings.title')}</h2>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('settings.subtitle')}</p>
      </div>

      {saveSuccess && (
        <div className="bg-[var(--success-light)] border border-[var(--success)]/30 text-[var(--success)] p-4 rounded-2xl mb-6 flex items-center gap-2 text-xs font-semibold shadow-xs">
          <Check className="w-4 h-4" />
          <span>{t('settings.savedSuccess')}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger)]/30 text-[var(--danger)] p-4 rounded-2xl mb-6 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Section 0: Visual Styles & Themes (Slide 6 - Personalization) */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)] mb-6">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shadow-xs">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  {t('settings.appearanceSection')}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {locale === 'es'
                    ? 'Personaliza la paleta de colores de tu espacio de trabajo universitario.'
                    : 'Customize the color palette of your student digital workspace.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {availableThemes.map((thm) => {
                const isSelected = theme === thm.id;
                return (
                  <button
                    key={thm.id}
                    type="button"
                    onClick={() => setTheme(thm.id)}
                    className={`p-4 rounded-3xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-sm'
                        : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                    }`}
                    style={{ backgroundColor: thm.bgPreview }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-5 h-5 rounded-full shadow-xs border border-black/10 inline-block"
                            style={{ backgroundColor: thm.primaryColor }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block opacity-70"
                            style={{ backgroundColor: thm.accentColor }}
                          />
                        </div>

                        {isSelected ? (
                          <span className="text-[10px] font-bold text-[var(--primary-foreground)] bg-[var(--primary)] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{locale === 'es' ? 'Activo' : 'Active'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--muted-foreground)]">DAILY</span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-[var(--foreground)] mb-1">
                        {locale === 'es' ? thm.nameEs : thm.nameEn}
                      </h4>
                      <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">
                        {locale === 'es' ? thm.descEs : thm.descEn}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${thm.badgePreview}`}>
                        Aa
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)]/60">Preset</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Profile & Preferences */}
          <form onSubmit={handleSaveProfile} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">{t('settings.profileSection')}</h3>
                <p className="text-xs text-[var(--muted-foreground)]">{email || 'estudiante@universidad.edu'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('settings.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  {t('settings.language')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
                >
                  <option value="es">Español (es)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  {t('settings.timezone')}
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
                >
                  <option value="America/Bogota">Bogotá (UTC-5)</option>
                  <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                  <option value="America/Lima">Lima (UTC-5)</option>
                  <option value="America/Santiago">Santiago (UTC-4)</option>
                  <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                  <option value="America/New_York">New York (EST/EDT)</option>
                  <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  {t('settings.timeFormat')}
                </label>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
                >
                  <option value="12h">{t('settings.format12h')}</option>
                  <option value="24h">{t('settings.format24h')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  {t('settings.dateFormat')}
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
              >
                {t('settings.saveChanges')}
              </Button>
            </div>
          </form>

          {/* Section 2: Security & Password */}
          <form onSubmit={handleUpdatePassword} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)] text-[var(--primary)] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">{t('settings.securitySection')}</h3>
            </div>

            {passwordMessage && (
              <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)]">
                {passwordMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="password"
                label={t('settings.newPassword')}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                label={t('auth.confirmPassword')}
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="outline" size="sm" isLoading={isUpdatingPassword}>
                {t('settings.updatePassword')}
              </Button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="bg-[var(--danger-light)]/30 border border-[var(--danger)]/30 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--danger)] mb-1">{t('settings.deleteAccount')}</h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">
              {t('settings.deleteAccountDesc')}
            </p>
            <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
              <Trash2 className="w-4 h-4 mr-1" />
              {t('settings.deleteAccount')}
            </Button>
          </div>
        </div>

        {/* Right Column: Diagnostics */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                {t('settings.credentialsGuideTitle')}
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[var(--primary)]" />
                  <span>Supabase PostgreSQL</span>
                </div>
                <Badge variant={supabaseConfigured ? 'success' : 'warning'}>
                  {supabaseConfigured ? 'Conectado' : 'Pendiente .env'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--primary)]" />
                  <span>Web Push VAPID</span>
                </div>
                <Badge variant={vapidConfigured ? 'success' : 'warning'}>
                  {vapidConfigured ? 'Activo' : 'Generar claves'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--primary)]" />
                  <span>Resend Email</span>
                </div>
                <Badge variant="neutral">
                  Configurado en .env
                </Badge>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-[var(--primary-light)] rounded-2xl text-[11px] text-[var(--foreground)] leading-relaxed">
              <strong>DAILY Workspace:</strong>
              <p className="mt-1">
                {locale === 'es'
                  ? 'Diseñado para conectar tus materias, apuntes, tareas y horarios en un solo lugar sereno.'
                  : 'Designed to connect your courses, notes, assignments, and schedule in one calm place.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('settings.deleteAccount')}
        maxWidth="sm"
      >
        <p className="text-xs text-[var(--muted-foreground)] mb-5 leading-relaxed">
          {t('settings.deleteAccountConfirm')}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteAccount} isLoading={isDeleting}>
            {t('common.delete')}
          </Button>
        </div>
      </Dialog>
    </AppLayout>
  );
}
