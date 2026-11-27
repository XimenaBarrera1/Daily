'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setIsSent(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('landing.ctaSignIn')}</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
            D
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">{t('auth.forgotTitle')}</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t('auth.forgotSubtitle')}</p>
        </div>

        {isSent ? (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {t('auth.resetLinkSent')}
            </p>
            <Link href="/auth/login">
              <Button variant="primary" size="md" className="w-full mt-3">
                {t('landing.ctaSignIn')}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-border)] rounded-xl text-xs text-[var(--danger)]">
                {errorMessage}
              </div>
            )}

            <Input
              type="email"
              label={t('auth.email')}
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              {t('auth.sendResetLink')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
