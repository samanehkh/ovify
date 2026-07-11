import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogOut, Save, Globe } from 'lucide-react';
import { updatePartnerConsent } from '../services/api';
import { i18nContent } from '../content/i18n';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const SettingsPage: React.FC = () => {
  const { user, onboard, logout, setToastMessage, language, setLanguage } = useApp();

  // Onboarding States
  const [sleepTime, setSleepTime] = useState(user?.sleep_time || '10:00 PM - 12:00 AM');
  const [comfortLevel, setComfortLevel] = useState(user?.injection_comfort || 'First time');
  const [reminderOffset, setReminderOffset] = useState<number>((user as any)?.reminder_offset_minutes ?? 30);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Partner Consent States
  const [partnerPhone, setPartnerPhone] = useState(user?.partner_phone || '');
  const [partnerConsent, setPartnerConsent] = useState(user?.partner_consent || false);
  const [savingConsent, setSavingConsent] = useState(false);

  if (!user) return null;

  const t = i18nContent[language];

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPreferences(true);
    try {
      await onboard(sleepTime, comfortLevel, reminderOffset);
      setToastMessage('Preferences updated successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage('Failed to update preferences.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleSaveConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConsent(true);
    try {
      const normalizedPhone = partnerPhone.replace(/\s+/g, '');
      await updatePartnerConsent(user.id, normalizedPhone, partnerConsent);
      setToastMessage('Supporter sharing preferences saved.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage('Failed to save sharing settings.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSavingConsent(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col pt-4 px-5 pb-24 overflow-y-auto no-scrollbar ${t.textAlign}`}>
      {/* Header */}
      <div className="flex flex-col items-center text-center mt-2 mb-6">
        <span className="font-data text-[12px] font-bold text-navy-55 tracking-widest uppercase">
          {t.settingsSubtitle}
        </span>
        <h2 className="font-heading text-2xl font-bold text-navy mt-1">
          {t.settingsTitle}
        </h2>
      </div>

      {/* Language Selector */}
      <Card variant="glass" className="mb-6 p-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-lavender-dark" />
            <div>
              <h4 className="font-heading text-xs font-bold text-navy">App Language / لغة التطبيق</h4>
              <p className="font-body text-[10px] text-navy-55">Toggle layout and direction</p>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
            className="px-3 py-1.5 rounded-lg border border-navy-10 font-data text-xs text-navy focus:outline-none focus:ring-2 focus:ring-lavender bg-[#F8F5F1]/30 cursor-pointer"
          >
            <option value="en">English (LTR)</option>
            <option value="ar">العربية (RTL)</option>
          </select>
        </div>
      </Card>

      {/* Account Settings Forms */}
      <div className="space-y-6">
        {/* Onboarding Preferences */}
        <Card variant="glass">
          <h3 className="font-heading text-sm font-bold text-navy mb-4 uppercase tracking-wider">{t.settingsOnboardingPrefs}</h3>
          
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="block font-heading text-[10px] font-bold text-navy-55 mb-1.5 uppercase">{t.settingsSleepWindow}</label>
              <select
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-navy-10 font-data text-sm text-navy focus:outline-none focus:border-lavender focus:ring-2 focus:ring-lavender/50 bg-[#F8F5F1]/30 cursor-pointer"
              >
                <option value="9:00 PM - 11:00 PM">Early Bird · 9:00 PM – 11:00 PM</option>
                <option value="10:00 PM - 12:00 AM">Standard · 10:00 PM – 12:00 AM</option>
                <option value="11:00 PM - 1:00 AM">Night Owl · 11:00 PM – 1:00 AM</option>
              </select>
            </div>

            <div>
              <label className="block font-heading text-[10px] font-bold text-navy-55 mb-1.5 uppercase">{t.settingsComfortLevel}</label>
              <select
                value={comfortLevel}
                onChange={(e) => setComfortLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-navy-10 font-data text-sm text-navy focus:outline-none focus:border-lavender focus:ring-2 focus:ring-lavender/50 bg-[#F8F5F1]/30 cursor-pointer"
              >
                <option value="First time">First time (Show full walkthroughs)</option>
                <option value="Experienced">Experienced (Show minimal checklists)</option>
              </select>
            </div>

            <div>
              <label className="block font-heading text-[10px] font-bold text-navy-55 mb-1.5 uppercase">Injection Reminder</label>
              <select
                value={reminderOffset}
                onChange={(e) => setReminderOffset(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-navy-10 font-data text-sm text-navy focus:outline-none focus:border-lavender focus:ring-2 focus:ring-lavender/50 bg-[#F8F5F1]/30 cursor-pointer"
              >
                <option value={0}>At scheduled time</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={savingPreferences}
              fullWidth
            >
              <Save className="w-4 h-4" />
              {savingPreferences ? '...' : t.settingsUpdateBtn}
            </Button>
          </form>
        </Card>

        {/* Supporter Consent Setup */}
        <Card variant="glass">
          <h3 className="font-heading text-sm font-bold text-navy mb-4 uppercase tracking-wider">{t.settingsSupporterHeader}</h3>
          
          <form onSubmit={handleSaveConsent} className="space-y-4">
            <div>
              <Input
                label={t.settingsPartnerPhone}
                type="tel"
                value={partnerPhone}
                onChange={(e) => setPartnerPhone(e.target.value)}
                placeholder="e.g. +971509999999"
              />
            </div>

            <div className="flex gap-2.5 items-start">
              <Input
                type="checkbox"
                id="partnerConsentCheckbox"
                checked={partnerConsent}
                onChange={(e) => setPartnerConsent(e.target.checked)}
                label={t.settingsConsentText}
              />
            </div>

            <Button
              type="submit"
              disabled={savingConsent}
              fullWidth
            >
              <Save className="w-4 h-4" />
              {savingConsent ? '...' : t.settingsSaveSupporterBtn}
            </Button>
          </form>
        </Card>

        {/* Discoverable Clear Sign Out Button */}
        <Card variant="glass" className="border-due/30 bg-due-soft/5">
          <h4 className="font-heading text-sm font-bold text-due mb-1">{t.settingsExitAccount}</h4>
          <p className="font-body text-xs text-navy-55 mb-4">Click below to sign out and clear your active local session.</p>
          <Button
            variant="due"
            onClick={logout}
            fullWidth
          >
            <LogOut className="w-4 h-4" />
            {t.settingsSignOutBtn}
          </Button>
        </Card>
      </div>
    </div>
  );
};
