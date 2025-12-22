import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, User, PieChart, Calendar, TrendingUp, ScanLine, X, Save, ChevronLeft, Loader2, Scale, CheckCircle2, LogOut, Mail, Lock, Download, AlertTriangle, Edit2, ChefHat, Sparkles, ArrowLeft } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, deleteDoc, doc, setDoc, getDoc, orderBy, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZp4rC_LYox1YlBW8eDqsycmqH08i4zP8",
  authDomain: "nutriai-f081c.firebaseapp.com",
  projectId: "nutriai-f081c",
  storageBucket: "nutriai-f081c.firebasestorage.app",
  messagingSenderId: "841982374698",
  appId: "1:841982374698:web:0289d0aac7d926b07ce453"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// FIX ID APP
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const appId = rawAppId.replace(/\//g, '_');

// --- UTILS & API ---
async function callGemini(prompt, apiKey, imageBase64 = null, jsonMode = true) {
  if (!apiKey) {
    console.error("API Key mancante");
    return null;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const contents = [{
    role: "user",
    parts: [{ text: prompt }, imageBase64 ? { inlineData: { mimeType: "image/jpeg", data: imageBase64 } } : null].filter(Boolean)
  }];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : {}
      })
    });
    
    if (!response.ok) throw new Error(`Errore API Gemini: ${response.status}`);
    
    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return null;

    if (jsonMode) {
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Errore parsing JSON:", e, text);
        return null;
      }
    }
    return text;
  } catch (error) {
    console.error("Errore Gemini:", error);
    return null;
  }
}

// --- BACKGROUND PATTERN COMPONENT ---
const BackgroundPattern = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-emerald-600">
    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 to-emerald-700 opacity-90"></div>
    <svg className="absolute top-0 left-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10%" cy="10%" r="50" fill="white" />
      <circle cx="90%" cy="20%" r="30" fill="white" />
      <circle cx="50%" cy="50%" r="80" fill="white" />
      <circle cx="20%" cy="80%" r="40" fill="white" />
      <circle cx="80%" cy="90%" r="60" fill="white" />
      <path d="M0 100 Q 250 250 500 100 T 1000 100" stroke="white" strokeWidth="2" fill="none" />
      <path d="M0 300 Q 250 450 500 300 T 1000 300" stroke="white" strokeWidth="2" fill="none" />
      <path d="M0 500 Q 250 650 500 500 T 1000 500" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  </div>
);

// --- APP COMPONENT ---
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

  return (
    <div className="relative min-h-screen font-sans text-gray-800 pb-24 md:max-w-md md:mx-auto md:shadow-2xl md:min-h-screen md:border-x border-gray-200 bg-gray-50">
      
      <BackgroundPattern />

      <div className="relative z-10 p-4 min-h-screen">
        {!apiKey && (
           <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-red-100 text-xs text-red-800 text-center mb-4">
             <div className="flex items-center justify-center gap-2 mb-2 font-bold">
               <AlertTriangle size={16} className="text-red-500"/>
               <span>API Key Mancante</span>
             </div>
             <p className="mb-2 opacity-80">Inserisci la chiave per attivare l'AI:</p>
             <div className="flex justify-center">
               <input 
                 type="text" 
                 placeholder="Incolla API Key qui..." 
                 className="p-2 w-full max-w-xs rounded-lg border border-red-200 bg-white focus:ring-2 focus:ring-red-500 outline-none text-center"
                 onKeyDown={(e) => { if(e.key === 'Enter') setApiKey(e.target.value); }}
                 onBlur={(e) => { if(e.target.value) setApiKey(e.target.value); }}
               />
             </div>
           </div>
        )}

        <div className="animate-in fade-in duration-300">
          {activeTab === 'daily' && <DailyView user={user} profile={profile} setActiveTab={setActiveTab} apiKey={apiKey} />}
          {activeTab === 'planner' && <WeeklyPlanner user={user} profile={profile} apiKey={apiKey} />}
          {activeTab === 'trends' && <TrendsAnalytics user={user} />}
          {activeTab === 'profile' && <UserProfile user={user} profile={profile} setProfile={setProfile} setAuthMode={setAuthMode} />}
        </div>
      </div>

      {activeTab === 'add' && <AddFood user={user} profile={profile} close={() => setActiveTab('daily')} apiKey={apiKey} />}

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
  );
}

// ... AUTH SCREEN, NavBtn ... (Codice invariato, abbreviato per brevità se già corretto)
function AuthScreen({ mode, setMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-emerald-600 flex flex-col justify-center p-6 text-white relative overflow-hidden">
      <BackgroundPattern/>
      <div className="relative z-10">
        <div className="mb-10 text-center">
          <div className="bg-white w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
            <Scale className="text-emerald-600" size={48} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">NutriAI</h1>
          <p className="opacity-90 mt-2 text-lg">Il tuo nutrizionista tascabile</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl p-8 text-gray-800 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{mode === 'login' ? 'Bentornato' : 'Inizia Ora'}</h2>
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4">{error}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-gray-400" size={20}/>
              <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 ring-emerald-200 outline-none transition-all" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20}/>
              <input type="password" placeholder="Password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 ring-emerald-200 outline-none transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex justify-center shadow-lg shadow-emerald-200">
               {loading ? <Loader2 className="animate-spin"/> : (mode === 'login' ? 'Accedi' : 'Crea Account')}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? "Nuovo qui? " : "Hai già un account? "}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-emerald-600 font-bold hover:underline">{mode === 'login' ? "Registrati" : "Accedi"}</button>
          </div>
          <div className="mt-6 border-t border-gray-100 pt-4 text-center">
             <button onClick={async () => { setLoading(true); try { await signInAnonymously(auth); } catch(e) { setError(e.message); setLoading(false); } }} className="text-gray-400 text-xs hover:text-gray-600 underline">Continua come ospite</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const NavBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
    <div className={`p-1 rounded-xl ${active ? 'bg-emerald-50' : ''}`}>{icon}</div>
    <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-emerald-700' : ''}`}>{label}</span>
  </button>
);

// ... DailyView, WeeklyPlanner ...
function DailyView({ user, profile, setActiveTab, apiKey }) {
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ingredients, setIngredients] = useState('');
  const [suggestedRecipe, setSuggestedRecipe] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const bmr = profile.weight ? (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === 'Uomo' ? 5 : -161) : 2000;
  const targetCals = Math.round(bmr * (profile.goal === 'Dimagrimento' ? 1.1 : profile.goal === 'Aumento Massa' ? 1.4 : 1.2));

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), where("date", "==", date));
    return onSnapshot(q, (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user, date]);

  const stats = logs.reduce((acc, l) => ({
    cals: acc.cals + (l.calories || 0),
    prot: acc.prot + (l.protein || 0),
    carb: acc.carb + (l.carbs || 0),
    fat: acc.fat + (l.fat || 0)
  }), { cals: 0, prot: 0, carb: 0, fat: 0 });

  const getRecipe = async () => {
    if(!apiKey) return alert("Manca API Key");
    if(!ingredients) return alert("Inserisci ingredienti!");
    setLoadingRecipe(true);
    setSuggestedRecipe(null);
    const prompt = `Chef nutrizionista. Ingredienti: "${ingredients}". Obiettivo: ${profile.goal}. Ricetta sana. JSON: { "name": "...", "description": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "instructions": "...", "note": "..." }`;
    const res = await callGemini(prompt, apiKey);
    if(res) setSuggestedRecipe(res);
    else alert("Errore generazione ricetta.");
    setLoadingRecipe(false);
  };

  const addSuggestedMeal = async () => {
    if(!suggestedRecipe) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), { ...suggestedRecipe, date: date, timestamp: new Date().toISOString() });
    setSuggestedRecipe(null); setIngredients('');
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center pt-2 text-white/90">
        <div>
          <h1 className="text-2xl font-bold text-white shadow-sm">Ciao, {profile.name || 'Utente'}</h1>
          <p className="text-emerald-100 text-sm">{new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-2 text-sm text-white placeholder-white" />
      </header>

      <div className="bg-white/95 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-gray-400 text-xs font-bold tracking-wider uppercase">Calorie Oggi</span>
            <div className="text-4xl font-bold text-gray-800">{stats.cals}</div>
            <span className="text-emerald-600 text-sm font-medium">di {targetCals} kcal</span>
          </div>
          <div className="h-16 w-16">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f0fdf4" strokeWidth="4" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${Math.min((stats.cals/targetCals)*100, 100)}, 100`} />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <MacroPill label="Prot" val={stats.prot} total={150} color="bg-blue-500" />
          <MacroPill label="Carb" val={stats.carb} total={250} color="bg-amber-500" />
          <MacroPill label="Grassi" val={stats.fat} total={70} color="bg-rose-500" />
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur border border-white/50 rounded-3xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><ChefHat size={20} className="text-orange-500"/> Chef Frigo</h3>
        {!suggestedRecipe ? (
          <div className="flex gap-2">
            <input value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="Ingredienti disponibili..." className="flex-1 p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white" />
            <button onClick={getRecipe} disabled={loadingRecipe || !ingredients} className="bg-orange-500 text-white p-3 rounded-xl font-bold shadow-md disabled:opacity-50">{loadingRecipe ? <Loader2 className="animate-spin"/> : <Sparkles size={20}/>}</button>
          </div>
        ) : (
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 animate-in fade-in">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-gray-800">{suggestedRecipe.name}</h4>
              <button onClick={() => setSuggestedRecipe(null)} className="text-gray-400"><X size={16}/></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{suggestedRecipe.description}</p>
            <div className="flex gap-3 text-xs font-bold text-gray-600 mb-3"><span>🔥 {suggestedRecipe.calories}</span><span>P: {suggestedRecipe.protein}</span><span>C: {suggestedRecipe.carbs}</span><span>G: {suggestedRecipe.fat}</span></div>
            <button onClick={addSuggestedMeal} className="w-full bg-orange-200 text-orange-800 py-2 rounded-xl font-bold text-sm">Aggiungi</button>
          </div>
        )}
      </div>

      <div className="pb-20">
        <h2 className="font-bold text-white mb-3 text-lg drop-shadow-md">Pasti registrati</h2>
        {logs.length === 0 ? (
          <div onClick={() => setActiveTab('add')} className="border-2 border-dashed border-white/30 bg-white/10 rounded-2xl p-8 text-center text-white cursor-pointer hover:bg-white/20 transition-colors">
            <Plus className="mx-auto mb-2 opacity-80" />
            <p>Tocca per aggiungere un pasto</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-800 capitalize">{log.name}</div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-3">
                    <span className="font-medium text-emerald-600">{log.calories} kcal</span>
                    <span>P: {log.protein}</span><span>C: {log.carbs}</span><span>G: {log.fat}</span>
                  </div>
                </div>
                <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'food_logs', log.id))} className="p-2 text-gray-300 hover:text-red-500"><X size={18} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MacroPill = ({ label, val, total, color }) => (
  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <div className="mt-2">
      <div className="text-sm font-bold text-gray-800">{Math.round(val)}g</div>
      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min((val/total)*100, 100)}%` }}></div>
      </div>
    </div>
  </div>
);

function WeeklyPlanner({ user, profile, apiKey }) {
  const [weekPlan, setWeekPlan] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('lunedì');
  const days = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  const [assessment, setAssessment] = useState({ activityLevel: 'Sedentario', dietType: 'Onnivoro', allergies: '', mealsPerDay: '3', conditions: '' });

  useEffect(() => {
    getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'plans', 'current_week')).then(s => s.exists() && setWeekPlan(s.data()));
    getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'assessment')).then(s => s.exists() && setAssessment(s.data()));
  }, [user]);

  const generateWeek = async () => {
    if(!apiKey) return alert("API Key non configurata");
    setLoading(true);
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'assessment'), assessment);
    const prompt = `Piano 7 giorni. Profilo: ${JSON.stringify(profile)}, Attività: ${assessment.activityLevel}, Dieta: ${assessment.dietType}, Allergie: ${assessment.allergies}. JSON: { "lunedì": { "colazione": "...", "pranzo": "...", "cena": "...", "totale_cal": 0 }, ... }`;
    const res = await callGemini(prompt, apiKey);
    if(res) { setWeekPlan(res); await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'plans', 'current_week'), res); setShowWizard(false); }
    setLoading(false);
  };

  if (showWizard) {
    return (
      <div className="fixed inset-0 z-[60] bg-white p-6 animate-in slide-in-from-right flex flex-col">
        <div className="flex items-center mb-6 pt-safe-top">
          <button onClick={() => setShowWizard(false)} className="p-2 -ml-2 text-gray-400"><ChevronLeft/></button>
          <h2 className="text-xl font-bold ml-2">Personalizza</h2>
        </div>
        <div className="space-y-6 flex-1 overflow-y-auto">
          <div><label className="font-bold block mb-2">Attività</label><div className="grid grid-cols-2 gap-2">{['Sedentario', 'Leggero', 'Moderato', 'Intenso'].map(o => <button key={o} onClick={()=>setAssessment({...assessment, activityLevel: o})} className={`p-3 rounded-xl border text-sm font-bold ${assessment.activityLevel===o?'bg-emerald-100 border-emerald-500 text-emerald-800':'border-gray-200'}`}>{o}</button>)}</div></div>
          <div><label className="font-bold block mb-2">Dieta</label><select value={assessment.dietType} onChange={e=>setAssessment({...assessment, dietType: e.target.value})} className="w-full p-4 bg-gray-50 border rounded-xl"><option>Onnivoro</option><option>Vegetariano</option><option>Vegano</option><option>Cheto</option></select></div>
          <div><label className="font-bold block mb-2">Allergie</label><input value={assessment.allergies} onChange={e=>setAssessment({...assessment, allergies: e.target.value})} className="w-full p-4 bg-gray-50 border rounded-xl" placeholder="Nessuna..." /></div>
        </div>
        <button onClick={generateWeek} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold mt-4 shadow-xl mb-safe">{loading ? <Loader2 className="animate-spin mx-auto"/> : "Genera Piano"}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-white pt-2">
        <h1 className="text-2xl font-bold">Piano Settimanale</h1>
        {weekPlan && <button onClick={() => setShowWizard(true)} className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur">Rigenera</button>}
      </div>
      
      {!weekPlan ? (
        <div className="bg-white/95 backdrop-blur rounded-3xl p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
          <h3 className="font-bold text-xl text-gray-800 mb-2">Nessun piano</h3>
          <p className="text-gray-500 mb-6 text-sm">Crea un menu su misura per te.</p>
          <button onClick={() => setShowWizard(true)} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg">Crea Piano</button>
        </div>
      ) : (
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50 pb-20">
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
            {days.map(d => <button key={d} onClick={() => setSelectedDay(d)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedDay === d ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>{d.slice(0,3)}</button>)}
          </div>
          <div className="space-y-4 animate-in fade-in">
             {weekPlan[selectedDay] && Object.entries(weekPlan[selectedDay]).map(([k, v]) => k !== 'totale_cal' && (
               <div key={k} className="border-l-4 border-emerald-500 pl-4 py-1">
                 <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">{k}</div>
                 <div className="text-gray-800 font-medium text-sm leading-relaxed">{v}</div>
               </div>
             ))}
             <div className="mt-4 pt-4 border-t border-gray-100 text-right text-emerald-600 font-bold text-sm">Totale: {weekPlan[selectedDay]?.totale_cal} kcal</div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- RESTORED TOOLTIP CUSTOM COMPONENT ---
const TooltipCustom = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur p-3 shadow-xl rounded-xl border border-white/50 text-xs text-gray-700">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-emerald-600 font-bold">
          {payload[0].value} {payload[0].name === 'weight' ? 'kg' : 'kcal'}
        </p>
      </div>
    );
  }
  return null;
};

// ... TrendsAnalytics ...
function TrendsAnalytics({ user }) {
  const [history, setHistory] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);

  useEffect(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    const dateStr = d.toISOString().split('T')[0];
    
    // Safety check for logs
    const qFood = query(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), where("date", ">=", dateStr));
    const unsubFood = onSnapshot(qFood, (snap) => {
      const agg = snap.docs.reduce((acc, d) => { 
        const data = d.data();
        if (data.date) { 
            if(!acc[data.date]) acc[data.date] = {date: data.date, cal:0}; 
            acc[data.date].cal += (data.calories || 0); 
        }
        return acc; 
      }, {});
      setHistory(Object.values(agg).sort((a,b)=>a.date.localeCompare(b.date)));
    }, (error) => console.error("Food logs error:", error));

    const qWeight = query(collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'), orderBy("date", "asc"));
    const unsubWeight = onSnapshot(qWeight, (snap) => {
      setWeightHistory(snap.docs.map(d=>d.data()).filter(d => d.date && d.weight)); 
    }, (error) => console.error("Weight error:", error));

    return () => { unsubFood(); unsubWeight(); };
  }, [user]);

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-white pt-2">I tuoi progressi</h1>
      
      <div className="bg-white/95 backdrop-blur p-5 rounded-3xl shadow-xl border border-white/50 h-72">
        <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Scale size={16}/> Peso</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={weightHistory}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
            <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{fill:'#10b981', r:4}} />
            <XAxis dataKey="date" hide />
            <RechartsTooltip content={<TooltipCustom/>} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
       <div className="bg-white/95 backdrop-blur p-5 rounded-3xl shadow-xl border border-white/50 h-72">
        <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><TrendingUp size={16}/> Calorie (30gg)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={history}>
            <CartesianGrid vertical={false} stroke="#f0f0f0"/>
            <Area type="monotone" dataKey="cal" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
            <XAxis 
                dataKey="date" 
                tick={{fontSize:10}} 
                tickFormatter={v => v ? v.slice(8) : ''} 
                interval={2} 
            />
            <RechartsTooltip content={<TooltipCustom/>} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ... AddFood ...
function AddFood({ user, profile, close, apiKey }) {
  const [mode, setMode] = useState('camera');
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const fileRef = useRef(null);

  const analyze = async () => {
    if(!apiKey) return alert("API Key non trovata!");
    setLoading(true);
    let prompt = "";
    const baseReq = `Rispondi ESCLUSIVAMENTE con un JSON valido (no markdown): { "name": "Nome piatto", "calories": numero, "protein": num, "carbs": num, "fat": num, "note": "commento" }.`;
    if (mode === 'camera') prompt = `Analizza immagine cibo. Contesto: "${text}". Stima valori. ${baseReq}`;
    else prompt = `Analizza pasto: "${text}". Stima valori. ${baseReq}`;

    const res = await callGemini(prompt, apiKey, image);
    setLoading(false);
    if (res) setReviewData(res);
    else alert("Riprova, analisi fallita.");
  };

  const saveLog = async () => {
      if(!reviewData) return;
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), { ...reviewData, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() });
      close();
  };

  const handleFile = (e) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result.split(',')[1]);
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
  };

  if (reviewData) {
      return (
          <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col h-[100dvh]">
              <BackgroundPattern />
              <div className="relative z-10 flex flex-col h-full">
                <div className="bg-white/90 backdrop-blur p-4 shadow-sm flex items-center justify-between pt-safe-top border-b border-gray-200">
                  <button onClick={() => setReviewData(null)} className="p-2 bg-gray-100 rounded-full"><ChevronLeft/></button>
                  <h2 className="font-bold text-lg">Conferma Dati</h2>
                  <div className="w-10"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
                    <div className="bg-white/90 backdrop-blur p-4 rounded-xl text-emerald-800 text-sm flex gap-3 items-center shadow-sm">
                      <Sparkles className="shrink-0 text-emerald-600"/>
                      <p>Ho stimato questi valori. Correggili se necessario.</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white uppercase ml-1">Pasto</label>
                        <input value={reviewData.name} onChange={e => setReviewData({...reviewData, name: e.target.value})} className="w-full p-4 bg-white/95 backdrop-blur rounded-xl mt-1 font-bold text-lg shadow-sm border border-white/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-white uppercase ml-1">Kcal</label><input type="number" value={reviewData.calories} onChange={e => setReviewData({...reviewData, calories: Number(e.target.value)})} className="w-full p-4 bg-white/95 backdrop-blur rounded-xl mt-1 font-bold text-emerald-600 text-xl shadow-sm border border-white/50" /></div>
                        <div className="space-y-2">
                             <div className="bg-white/95 backdrop-blur p-2 rounded-lg shadow-sm flex justify-between text-sm"><span>Prot</span><input type="number" value={reviewData.protein} onChange={e => setReviewData({...reviewData, protein: Number(e.target.value)})} className="w-12 text-right font-bold text-blue-600 outline-none bg-transparent"/></div>
                             <div className="bg-white/95 backdrop-blur p-2 rounded-lg shadow-sm flex justify-between text-sm"><span>Carb</span><input type="number" value={reviewData.carbs} onChange={e => setReviewData({...reviewData, carbs: Number(e.target.value)})} className="w-12 text-right font-bold text-amber-600 outline-none bg-transparent"/></div>
                             <div className="bg-white/95 backdrop-blur p-2 rounded-lg shadow-sm flex justify-between text-sm"><span>Gras</span><input type="number" value={reviewData.fat} onChange={e => setReviewData({...reviewData, fat: Number(e.target.value)})} className="w-12 text-right font-bold text-rose-600 outline-none bg-transparent"/></div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white/90 backdrop-blur border-t border-gray-200 pb-safe">
                    <div className="flex gap-3">
                      <button onClick={() => setReviewData(null)} className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl">Annulla</button>
                      <button onClick={saveLog} className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex justify-center gap-2 items-center"><CheckCircle2/> Salva</button>
                    </div>
                </div>
              </div>
          </div>
      )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col h-[100dvh]">
      <BackgroundPattern />
      <div className="relative z-10 flex flex-col h-full">
        <div className="bg-white/90 backdrop-blur p-4 pt-safe-top flex justify-between items-center shadow-sm border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Nuovo Pasto</h2>
          <button onClick={close} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
        </div>
        
        <div className="flex-1 flex flex-col p-4 overflow-y-auto pb-24">
          <div className="bg-white/90 backdrop-blur p-1 rounded-xl shadow-sm mb-6 flex border border-white/50">
            <button onClick={() => setMode('camera')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode==='camera'?'bg-emerald-100 text-emerald-700 shadow-sm':'text-gray-400'}`}>Foto</button>
            <button onClick={() => setMode('text')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode==='text'?'bg-emerald-100 text-emerald-700 shadow-sm':'text-gray-400'}`}>Testo</button>
          </div>
          
          {mode === 'camera' ? (
            <div className="space-y-4">
                <div onClick={() => fileRef.current.click()} className="h-64 border-2 border-dashed border-white/60 bg-white/30 backdrop-blur rounded-3xl flex flex-col items-center justify-center cursor-pointer relative hover:bg-white/40 transition-colors shadow-sm">
                   <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                   {image ? <img src={`data:image/jpeg;base64,${image}`} className="absolute inset-0 w-full h-full object-cover rounded-3xl"/> : <div className="flex flex-col items-center text-white"><Camera size={48} className="mb-2 drop-shadow-md"/><span className="font-bold drop-shadow-md">Scatta Foto</span></div>}
                </div>
                <div>
                    <label className="text-xs font-bold text-white uppercase ml-1 drop-shadow-sm">Note (es. "Senza olio")</label>
                    <input value={text} onChange={e => setText(e.target.value)} className="w-full p-4 bg-white/95 backdrop-blur rounded-xl mt-1 border border-white/50 shadow-sm focus:ring-2 ring-emerald-500 outline-none" />
                </div>
            </div>
          ) : (
            <textarea value={text} onChange={e=>setText(e.target.value)} className="w-full h-64 p-4 bg-white/95 backdrop-blur rounded-2xl border border-white/50 shadow-sm focus:ring-2 ring-emerald-500 text-lg placeholder-gray-400 resize-none" placeholder="Es: Pasta al pomodoro e una mela..." />
          )}
        </div>
        
        <div className="p-4 bg-white/90 backdrop-blur border-t border-gray-200 pb-safe">
          <div className="flex gap-3">
            <button onClick={close} className="px-6 py-4 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Annulla</button>
            <button 
              onClick={analyze} 
              disabled={loading || (mode==='camera' && !image) || (mode==='text' && !text)} 
              className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
            >
                {loading ? <Loader2 className="animate-spin"/> : <><ScanLine/> Analizza</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ... UserProfile ...
function UserProfile({ user, profile, setProfile, setAuthMode }) {
  const [formData, setFormData] = useState(profile);
  const [newWeight, setNewWeight] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => { if(installPrompt) installPrompt.prompt(); };
  const save = async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), formData); setProfile(formData); alert("Salvato!"); };
  const logWeight = async () => { if(newWeight) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'), { weight: parseFloat(newWeight), date: new Date().toISOString().split('T')[0] }); setNewWeight(''); alert("Salvato!"); }};

  return (
    <div className="pb-24 space-y-6">
      <div className="flex justify-between items-center text-white pt-2">
          <h1 className="text-2xl font-bold">Profilo</h1>
          <button onClick={async () => { await signOut(auth); setAuthMode('login'); }} className="text-white bg-white/20 p-2 rounded-full hover:bg-white/30"><LogOut size={20}/></button>
      </div>

      {installPrompt && (
        <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center animate-in slide-in-from-top">
           <div><div className="font-bold">Installa App</div><div className="text-xs opacity-90">Accesso rapido dalla home</div></div>
           <button onClick={handleInstall} className="bg-white text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"><Download size={16}/> Installa</button>
        </div>
      )}

      <div className="bg-white/95 backdrop-blur p-6 rounded-3xl shadow-xl space-y-4 border border-white/50">
        <h3 className="font-bold text-gray-800">I tuoi dati</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Età" val={formData.age} onChange={v => setFormData({...formData, age: v})} />
          <Input label="Altezza" val={formData.height} onChange={v => setFormData({...formData, height: v})} />
        </div>
        <Input label="Peso (kg)" val={formData.weight} onChange={v => setFormData({...formData, weight: v})} />
        <button onClick={save} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800">Salva Modifiche</button>
      </div>

      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2"><Scale size={18}/> Aggiorna Peso</h3>
        <div className="flex gap-3">
          <input type="number" placeholder="kg" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="w-24 p-3 rounded-xl text-center font-bold text-lg bg-white border border-emerald-100 outline-none focus:ring-2 ring-emerald-500" />
          <button onClick={logWeight} className="flex-1 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700">Registra</button>
        </div>
      </div>
    </div>
  );
}

const Input = ({ label, val, onChange }) => ( <div><label className="text-xs text-gray-500 font-bold ml-1 uppercase">{label}</label><input type="number" value={val} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl mt-1 focus:ring-2 ring-emerald-500 outline-none border border-gray-100" /></div> );
