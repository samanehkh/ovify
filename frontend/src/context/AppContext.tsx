import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, MedicationStatus } from '../types';
import * as api from '../services/api';
import { i18nContent } from '../content/i18n';

interface AppContextType {
  user: User | null;
  medications: MedicationStatus[];
  todaysMood: string | null;
  moodReassurance: string | null;
  loading: boolean;
  error: string | null;
  toastMessage: string | null;
  activeTab: 'dashboard' | 'medication-guide' | 'settings';
  selectedMedication: MedicationStatus | null;
  refetchData: () => Promise<void>;
  changeTab: (tab: 'dashboard' | 'medication-guide' | 'settings', selectedMed?: MedicationStatus | null) => void;
  submitDose: (prescriptionId: number, actualTime?: string) => Promise<void>;
  submitMood: (mood: string) => Promise<void>;
  login: (phone: string, otp: string) => Promise<void>;
  onboard: (sleepTime: string, comfortLevel: string) => Promise<void>;
  logout: () => void;
  setToastMessage: (msg: string | null) => void;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);



export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [medications, setMedications] = useState<MedicationStatus[]>([]);
  const [todaysMood, setTodaysMood] = useState<string | null>(null);
  const [moodReassurance, setMoodReassurance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'medication-guide' | 'settings'>('dashboard');
  const [selectedMedication, setSelectedMedication] = useState<MedicationStatus | null>(null);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    document.documentElement.dir = i18nContent[language].dir;
    document.documentElement.lang = language;
  }, [language]);

  const mergeOfflineStatus = useCallback((meds: MedicationStatus[]) => {
    const queueKey = 'offline_dose_queue';
    const queueData = JSON.parse(localStorage.getItem(queueKey) || '[]');
    const queuedIds = queueData.map((item: any) => item.prescriptionId);
    
    return meds.map(m => {
      if (queuedIds.includes(m.id)) {
        return { ...m, status: 'Taken' as const, syncPending: true };
      }
      return m;
    });
  }, []);

  const refetchData = useCallback(async () => {
    const cachedId = localStorage.getItem('user_id');
    if (!cachedId) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const uid = parseInt(cachedId, 10);
      const userData = await api.fetchUser(uid);
      setUser(userData);

      if (userData.onboarded) {
        // Fetch active medications
        const medsData = await api.fetchMedications(uid);
        setMedications(mergeOfflineStatus(medsData));

        // Fetch today's symptoms to restore mood check-in state
        const todayStr = new Date().toISOString().split('T')[0];
        try {
          const symptoms = await api.fetchSymptoms(uid, todayStr);
          const moodLog = symptoms.find(s => s.symptom_type === 'mood');
          if (moodLog) {
            setTodaysMood(moodLog.value);
            const text = i18nContent[language].moodReassurance[moodLog.value] || 'Thank you for checking in.';
            setMoodReassurance(text);
          }
        } catch (symptomErr) {
          console.warn("Could not load today's symptoms:", symptomErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load user and medication data');
      localStorage.removeItem('user_id');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [language, mergeOfflineStatus]);

  useEffect(() => {
    refetchData();
  }, [refetchData]);

  const login = async (phone: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await api.verifyOTP(phone, otp);
      setUser(userData);
      localStorage.setItem('user_id', userData.id.toString());
      if (userData.onboarded) {
        const medsData = await api.fetchMedications(userData.id);
        setMedications(mergeOfflineStatus(medsData));
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const onboard = async (sleepTime: string, comfortLevel: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await api.confirmOnboard(user.id, sleepTime, comfortLevel);
      setUser(updatedUser);
      const medsData = await api.fetchMedications(user.id);
      setMedications(mergeOfflineStatus(medsData));
    } catch (err: any) {
      setError(err.message || 'Onboarding failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user_id');
    setUser(null);
    setMedications([]);
    setTodaysMood(null);
    setMoodReassurance(null);
  };

  const changeTab = (tab: 'dashboard' | 'medication-guide' | 'settings', selectedMed: MedicationStatus | null = null) => {
    setActiveTab(tab);
    if (selectedMed) {
      setSelectedMedication(selectedMed);
    }
  };

  const queueOfflineDose = useCallback((prescriptionId: number, actualTime?: string) => {
    if (!user) return;
    const queueKey = 'offline_dose_queue';
    const queueData = JSON.parse(localStorage.getItem(queueKey) || '[]');
    queueData.push({ prescriptionId, userId: user.id, actualTime: actualTime || new Date().toTimeString().split(' ')[0] });
    localStorage.setItem(queueKey, JSON.stringify(queueData));

    // Update state locally so the PWA updates immediately!
    setMedications(prev => prev.map(m => {
      if (m.id === prescriptionId) {
        return { ...m, status: 'Taken' };
      }
      return m;
    }));

    if (selectedMedication && selectedMedication.id === prescriptionId) {
      setSelectedMedication(prev => prev ? { ...prev, status: 'Taken' } : null);
    }

    const medName = medications.find(m => m.id === prescriptionId)?.name || 'Dose';
    setToastMessage(`Saved offline: ${medName} logged locally.`);
    setTimeout(() => setToastMessage(null), 4000);
  }, [user, medications, selectedMedication]);

  const syncOfflineDoses = useCallback(async () => {
    const queueKey = 'offline_dose_queue';
    const queueData = JSON.parse(localStorage.getItem(queueKey) || '[]');
    if (queueData.length === 0) return;

    setToastMessage(`Syncing ${queueData.length} offline logs with clinic...`);
    setTimeout(() => setToastMessage(null), 3000);

    let syncedCount = 0;
    const failedQueue = [];

    for (const item of queueData) {
      try {
        await api.confirmDose(item.prescriptionId, item.userId, item.actualTime);
        syncedCount++;
      } catch (err) {
        console.error("Failed to sync dose offline item:", item, err);
        failedQueue.push(item);
      }
    }

    if (failedQueue.length > 0) {
      localStorage.setItem(queueKey, JSON.stringify(failedQueue));
    } else {
      localStorage.removeItem(queueKey);
    }

    if (syncedCount > 0 && user) {
      const updatedMeds = await api.fetchMedications(user.id);
      setMedications(mergeOfflineStatus(updatedMeds));
      setToastMessage(`Synchronized all offline logs.`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  }, [user]);

  // Bind online/offline window listeners
  useEffect(() => {
    window.addEventListener('online', syncOfflineDoses);
    return () => {
      window.removeEventListener('online', syncOfflineDoses);
    };
  }, [syncOfflineDoses]);

  const submitDose = async (prescriptionId: number, actualTime?: string) => {
    if (!user) return;
    
    // Check if network is offline
    if (!navigator.onLine) {
      queueOfflineDose(prescriptionId, actualTime);
      return;
    }

    try {
      await api.confirmDose(prescriptionId, user.id, actualTime);
      // Refresh medication data to show updated 'Taken' status
      const updatedMeds = await api.fetchMedications(user.id);
      const mergedMeds = mergeOfflineStatus(updatedMeds);
      setMedications(mergedMeds);
      
      // Update selectedMedication if active to keep it in sync
      if (selectedMedication && selectedMedication.id === prescriptionId) {
        const matchingMed = mergedMeds.find(m => m.id === prescriptionId);
        if (matchingMed) setSelectedMedication(matchingMed);
      }

      // Trigger success toast feedback
      const medName = medications.find(m => m.id === prescriptionId)?.name || 'Dose';
      setToastMessage(`${medName} dose logged successfully.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      // If it's a network failure or fetch error, queue it offline!
      if (err.message && (err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('Failed to fetch'))) {
        queueOfflineDose(prescriptionId, actualTime);
        return;
      }
      throw new Error(err.message || 'Failed to confirm dose');
    }
  };

  const submitMood = async (mood: string) => {
    if (!user) return;
    try {
      await api.logSymptom(user.id, 'mood', mood);
      setTodaysMood(mood);
      const text = i18nContent[language].moodReassurance[mood] || 'Thank you for checking in.';
      setMoodReassurance(text);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save mood');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        medications,
        todaysMood,
        moodReassurance,
        loading,
        error,
        toastMessage,
        activeTab,
        selectedMedication,
        refetchData,
        changeTab,
        submitDose,
        submitMood,
        login,
        onboard,
        logout,
        setToastMessage,
        language,
        setLanguage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
