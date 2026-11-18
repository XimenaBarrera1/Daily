'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMessage(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-white font-bold text-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
            D
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">{t('auth.resetTitle')}</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t('auth.resetSubtitle')}</p>
        </div>

        {isSuccess ? (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {t('auth.passwordUpdated')}
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
              type="password"
              label={t('auth.password')}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />

            <Input
              type="password"
              label={t('auth.confirmPassword')}
              placeholder="Confirma la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              {t('auth.updatePassword')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
