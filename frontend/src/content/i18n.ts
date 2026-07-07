export interface LanguageContent {
  dir: 'ltr' | 'rtl';
  textAlign: string;
  moodReassurance: Record<string, string>;
  recoveryTitle: string;
  recoveryText: string;
  recoveryGuidelineHeader: string;
  recoverySteps: string[];
  recoveryGreeting: string;
  recoveryPauseNote: string;
  callbackHeader: string;
  callbackText: string;
  callbackBtnLabel: string;
  callbackRequestedLabel: string;
  callbackSubmittingLabel: string;
  callbackErrorFallback: string;
  guideQuickHeader: string;
  guideShowFullLabel: string;
  guideHideFullLabel: string;
  settingsTitle: string;
  settingsSubtitle: string;
  settingsOnboardingPrefs: string;
  settingsSleepWindow: string;
  settingsComfortLevel: string;
  settingsUpdateBtn: string;
  settingsSupporterHeader: string;
  settingsPartnerPhone: string;
  settingsConsentText: string;
  settingsSaveSupporterBtn: string;
  settingsExitAccount: string;
  settingsSignOutBtn: string;
  homeTitle: string;
}

export const i18nContent: Record<'en' | 'ar', LanguageContent> = {
  en: {
    dir: 'ltr',
    textAlign: 'text-left',
    moodReassurance: {
      Amazing: "That's wonderful to hear! We've updated your partner with your positive status today.",
      Good: "Glad you're doing well. Keep taking it one step at a time.",
      Normal: "Normal days are progress too. Let your supporter know if you need anything.",
      Low: "It's completely okay to feel low. We have updated your partner to send a gentle check-in.",
      Anxious: "Anxiety is common during cycles. Your companion phone line is open, and your partner is notified."
    },
    recoveryTitle: "Active Recovery Plan",
    recoveryText: "We recognize this cycle did not result in a pregnancy. This is emotionally and physically challenging. Focus on gentle recovery guidelines below, and reach out to your clinical support line anytime.",
    recoveryGuidelineHeader: "Recommended Recovery Walkthrough",
    recoverySteps: [
      "Hydrate and eat warm, nourishing meals.",
      "Rest and avoid high-impact workouts.",
      "Schedule follow-up review with your coordinator.",
      "Allow yourself space to feel and process emotions."
    ],
    recoveryGreeting: "Thinking of you",
    recoveryPauseNote: "All injection alarms and daily schedules have been automatically paused. No protocol actions are required of you today.",
    callbackHeader: "Speak with a Clinic Nurse",
    callbackText: "If you need supportive advice or want to coordinate cycle logs, click below. A clinic coordinator will call you back.",
    callbackBtnLabel: "Request Nurse Callback",
    callbackRequestedLabel: "✓ Callback Requested (Within 24 Hours)",
    callbackSubmittingLabel: "Contacting your clinic…",
    callbackErrorFallback: "Could not reach the clinic. Please try again or call directly.",
    guideQuickHeader: "Quick Confirm",
    guideShowFullLabel: "Show full step-by-step guide",
    guideHideFullLabel: "Hide full guide",
    settingsTitle: "Settings Console",
    settingsSubtitle: "Configure Companion",
    settingsOnboardingPrefs: "Onboarding Preferences",
    settingsSleepWindow: "Typical Sleep Window",
    settingsComfortLevel: "Injection Comfort Level",
    settingsUpdateBtn: "Update Preferences",
    settingsSupporterHeader: "Supporter Companion Settings",
    settingsPartnerPhone: "Partner / Supporter Phone",
    settingsConsentText: "Granular Consent Grant: I authorize secure cycle logs and daily mood sharing with my supporter. I can revoke this sharing at any time.",
    settingsSaveSupporterBtn: "Save Supporter Settings",
    settingsExitAccount: "Exit Account",
    settingsSignOutBtn: "Sign Out of Account",
    homeTitle: "Ovarian Stimulation Protocol"
  },
  ar: {
    dir: 'rtl',
    textAlign: 'text-right',
    moodReassurance: {
      Amazing: "هذا رائع جداً! لقد قمنا بتحديث شريكك بحالتك الإيجابية اليوم.",
      Good: "يسعدنا أنك بخير. استمري في اتخاذ خطواتك واحدة تلو الأخرى.",
      Normal: "الأيام العادية تعتبر تقدماً أيضاً. أخبري شريكك إذا كنت بحاجة لأي شيء.",
      Low: "من الطبيعي تماماً الشعور بالإحباط. لقد أخبرنا شريكك ليتواصل معك بلطف.",
      Anxious: "القلق أمر شائع أثناء الدورات العلاجية. خط الاتصال الهاتفي مفتوح، وتم إخطار شريكك."
    },
    recoveryTitle: "خطة التعافي النشطة",
    recoveryText: "نحن ندرك أن هذه الدورة لم تؤدِ إلى الحمل. هذا تحدٍ جسدي ونفسي كبير. ركزي على إرشادات التعافي اللطيفة أدناه، وتواصلي مع خط الدعم الطبي في أي وقت.",
    recoveryGuidelineHeader: "خطوات التعافي الموصى بها",
    recoverySteps: [
      "شرب السوائل وتناول وجبات دافئة ومغذية.",
      "الراحة وتجنب التمارين البدنية الشاقة.",
      "جدولة موعد مراجعة للمتابعة مع منسق الحالة الخاص بك.",
      "امنحي نفسك المساحة الكافية للشعور بالمشاعر ومعالجتها."
    ],
    recoveryGreeting: "نفكر فيكِ",
    recoveryPauseNote: "تم إيقاف جميع تنبيهات الحقن والجداول اليومية تلقائياً. لا يُطلب منكِ أي إجراءات علاجية اليوم.",
    callbackHeader: "التحدث مع ممرضة العيادة",
    callbackText: "إذا كنتِ بحاجة إلى نصيحة داعمة أو تنسيق سجلات الدورة، اضغطي أدناه. سيتصل بكِ منسق العيادة.",
    callbackBtnLabel: "طلب اتصال من الممرضة",
    callbackRequestedLabel: "✓ تم طلب الاتصال (خلال ٢٤ ساعة)",
    callbackSubmittingLabel: "جارٍ التواصل مع عيادتك…",
    callbackErrorFallback: "تعذر الوصول إلى العيادة. يرجى المحاولة مرة أخرى أو الاتصال مباشرة.",
    guideQuickHeader: "تأكيد سريع",
    guideShowFullLabel: "عرض الدليل الكامل خطوة بخطوة",
    guideHideFullLabel: "إخفاء الدليل الكامل",
    settingsTitle: "لوحة التحكم بالإعدادات",
    settingsSubtitle: "تهيئة رفيق الدعم",
    settingsOnboardingPrefs: "تفضيلات التهيئة الأولى",
    settingsSleepWindow: "فترة النوم المعتادة",
    settingsComfortLevel: "مستوى ارتياح الحقن",
    settingsUpdateBtn: "تحديث التفضيلات",
    settingsSupporterHeader: "إعدادات رفيق الدعم المتابع",
    settingsPartnerPhone: "رقم هاتف الشريك / الداعم",
    settingsConsentText: "الموافقة الممنوحة: أصرح بمشاركة سجلات الدورة الآمنة والحالة المزاجية اليومية مع الداعم الخاص بي. يمكنني إلغاء هذه المشاركة في أي وقت.",
    settingsSaveSupporterBtn: "حفظ إعدادات الداعم",
    settingsExitAccount: "الخروج من الحساب",
    settingsSignOutBtn: "تسجيل الخروج من الحساب",
    homeTitle: "بروتوكول تحفيز المبايض"
  }
};
