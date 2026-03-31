import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Plus, PieChart, Calendar, TrendingUp, User, Loader2, AlertTriangle } from 'lucide-react';
import { auth, db, appId } from './firebase';
import { AppContext } from './context/AppContext';
import AuthScreen from './components/AuthScreen';
import DailyView from './components/DailyView';
import WeeklyPlanner from './components/WeeklyPlanner';
import TrendsAnalytics from './components/TrendsAnalytics';
import AddFood from './components/AddFood';
import UserProfile from './components/UserProfile';
import BackgroundPattern from './components/ui/BackgroundPattern';
import NavBtn from './components/ui/NavBtn';

export default function NutriAIPro() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [profile, setProfile] = useState({ name: '', age: '', weight: '', height: '', goal: 'Mantenimento', gender: 'Uomo' });
  const [apiKey, setApiKey] = useState(null);
  const [authMode, setAuthMode] = useState('app');
  const [loadingKey, setLoadingKey] = useState(true);

  // 1. Init Auth Listener
  useEffect(() => {
    const init = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      }
    };
    init();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setAuthMode('login');
    });
  }, []);

  // 2. Fetch Profile & API Key
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoadingKey(true);
      try {
        const profileSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'));
        if (profileSnap.exists()) setProfile(profileSnap.data());
      } catch (e) { console.warn(e); }

      try {
        const keySnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'secrets'));
        if (keySnap.exists() && keySnap.data().gemini_key) {
          setApiKey(keySnap.data().gemini_key);
        } else {
          setApiKey("");
        }
      } catch (e) { console.error(e); setApiKey(""); }

      setLoadingKey(false);
      setAuthMode('app');
    };
    loadData();
  }, [user]);

  // 3. Gestione Aggiornamenti Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  if (!user && (authMode === 'login' || authMode === 'register')) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} />;
  }

  if (loadingKey) return <div className="h-screen flex flex-col items-center justify-center bg-emerald-600 text-white"><Loader2 className="animate-spin mb-2" size={40} /><p className="text-sm opacity-80">Caricamento NutriAI...</p></div>;

  const contextValue = { user, apiKey, setApiKey, profile, setProfile, setActiveTab, setAuthMode };

  return (
    <AppContext.Provider value={contextValue}>
    <div className="relative min-h-screen font-sans text-gray-800 pb-24 md:max-w-md md:mx-auto md:shadow-2xl md:min-h-screen md:border-x border-gray-200 bg-gray-50">

      <BackgroundPattern />

      <div className="relative z-10 p-4 min-h-screen">
        {!apiKey && (
          <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-red-100 text-xs text-red-800 text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2 font-bold">
              <AlertTriangle size={16} className="text-red-500" />
              <span>API Key Mancante</span>
            </div>
            <p className="mb-2 opacity-80">Inserisci la chiave per attivare l'AI:</p>
            <div className="flex justify-center">
              <input
                type="text"
                placeholder="Incolla API Key qui..."
                className="p-2 w-full max-w-xs rounded-lg border border-red-200 bg-white focus:ring-2 focus:ring-red-500 outline-none text-center"
                onKeyDown={(e) => { if (e.key === 'Enter') setApiKey(e.target.value); }}
                onBlur={(e) => { if (e.target.value) setApiKey(e.target.value); }}
              />
            </div>
          </div>
        )}

        <div className="animate-in fade-in duration-300">
          {activeTab === 'daily' && <DailyView />}
          {activeTab === 'planner' && <WeeklyPlanner />}
          {activeTab === 'trends' && <TrendsAnalytics />}
          {activeTab === 'profile' && <UserProfile />}
        </div>
      </div>

      {activeTab === 'add' && <AddFood />}

      <div className="fixed bottom-0 left-0 right-0 md:w-full md:max-w-md md:mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 px-6 py-3 flex justify-between items-end z-50 pb-safe shadow-lg-up rounded-t-3xl">
        <NavBtn icon={<PieChart size={22} />} label="Oggi" active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />
        <NavBtn icon={<Calendar size={22} />} label="Piano" active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} />
        <div className="relative -top-8">
          <button
            onClick={() => setActiveTab('add')}
            className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform border-4 border-white"
          >
            <Plus size={32} />
          </button>
        </div>
        <NavBtn icon={<TrendingUp size={22} />} label="Analisi" active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} />
        <NavBtn icon={<User size={22} />} label="Tu" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
      </div>
    </div>
    </AppContext.Provider>
  );
}
