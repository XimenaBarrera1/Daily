'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Language } from '@/types';

export default function RegisterPage() {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLang, setPreferredLang] = useState<Language>(locale);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage(t('auth.nameRequired'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage(t('auth.emailInvalid'));
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordsDoNotMatch'));
      return;
    }
    if (!termsAccepted) {
      setErrorMessage(locale === 'es' ? 'Debes aceptar los términos y condiciones.' : 'You must accept the terms and conditions.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
            preferred_language: preferredLang,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // Check if session is already active (when email confirmation is turned off in Supabase)
      if (data.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        // Verification email sent
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      alert(locale === 'es' ? 'Correo de confirmación reenviado.' : 'Confirmation email resent.');
    } catch (err: any) {
      alert(err.message || 'Error reenviando correo');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4">
      {/* Top Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('nav.backToHome')}</span>
        </Link>

        <button
          onClick={() => {
            const next = locale === 'es' ? 'en' : 'es';
            setLocale(next);
            setPreferredLang(next);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>{locale.toUpperCase()}</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-white font-bold text-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
            D
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">{t('auth.registerTitle')}</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t('auth.registerSuccessTitle')}</h2>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {t('auth.registerSuccessDesc')} ({email})
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={handleResend} variant="outline" size="sm">
                {locale === 'es' ? 'Reenviar correo de confirmación' : 'Resend confirmation email'}
              </Button>
              <Link href="/auth/login" className="inline-block mt-2">
                <Button variant="primary" size="md" className="w-full">
                  {t('auth.submitLogin')}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-border)] rounded-xl text-xs text-[var(--danger)] mb-5">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label={t('auth.fullName')}
                placeholder="ej. Elena Morales"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                autoFocus
              />

              <Input
                type="email"
                label={t('auth.email')}
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label={t('auth.password')}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Input
                type={showPassword ? 'text' : 'password'}
                label={t('auth.confirmPassword')}
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  {t('auth.preferredLanguage')}
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => {
                    const l = e.target.value as Language;
                    setPreferredLang(l);
                    setLocale(l);
                  }}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                >
                  <option value="es">Español (predeterminado)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-[var(--muted-foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded accent-[var(--primary)]"
                    required
                  />
                  <span>{t('auth.termsAccept')}</span>
                </label>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full mt-3" isLoading={isLoading}>
                {t('auth.submitRegister')}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
              <span>{t('auth.alreadyHaveAccount')} </span>
              <Link href="/auth/login" className="font-semibold text-[var(--primary)] hover:underline">
                {t('landing.ctaSignIn')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
