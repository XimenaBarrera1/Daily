'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Globe, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(t('auth.emailInvalid'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage(locale === 'es' ? 'Credenciales incorrectas. Verifica tu correo y contraseña.' : 'Invalid credentials. Please verify your email and password.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage(locale === 'es' ? 'Tu correo no ha sido verificado. Por favor revisa tu bandeja de entrada.' : 'Email not confirmed. Please check your inbox.');
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('common.error'));
      setIsLoading(false);
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
          onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>{locale.toUpperCase()}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-white font-bold text-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
            D
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">{t('auth.loginTitle')}</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-border)] rounded-xl text-xs text-[var(--danger)] mb-5">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label={t('auth.email')}
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label={t('auth.password')}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 transition-colors"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-[var(--muted-foreground)] cursor-pointer">
              <input type="checkbox" className="rounded accent-[var(--primary)]" defaultChecked />
              <span>{t('auth.rememberMe')}</span>
            </label>

            <Link
              href="/auth/forgot-password"
              className="font-medium text-[var(--primary)] hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
            {t('auth.submitLogin')}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
          <span>{t('auth.dontHaveAccount')} </span>
          <Link href="/auth/register" className="font-semibold text-[var(--primary)] hover:underline">
            {t('landing.ctaStart')}
          </Link>
        </div>
      </div>
    </div>
  );
}
