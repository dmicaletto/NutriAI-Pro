import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, User, PieChart, Calendar, TrendingUp, ScanLine, X, Save, ChevronLeft, Loader2, Scale, CheckCircle2, LogOut, Mail, Lock, Download, AlertTriangle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, deleteDoc, doc, setDoc, getDoc, orderBy, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- UTILS & API ---
// Nota: Ora apiKey viene passata come parametro, non è più globale
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
    if (!response.ok) throw new Error("Errore API Gemini");
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return jsonMode ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Errore Gemini:", error);
    return null;
  }
}

// --- APP COMPONENT ---
export default function NutriAIPro() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [profile, setProfile] = useState({ name: '', age: '', weight: '', height: '', goal: 'Mantenimento', gender: 'Uomo' });
  const [apiKey, setApiKey] = useState(null); // Stato per la chiave API
  const [authMode, setAuthMode] = useState('app'); // 'app', 'login', 'register'
  const [loadingKey, setLoadingKey] = useState(true);

  // 1. Init Auth Listener
  useEffect(() => {
    const init = async () => {
        // Se c'è un token iniziale (ambiente di test), usalo.
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } 
        // Nota: Rimosso signInAnonymously automatico per favorire il login esplicito, 
        // ma gestito nel componente AuthScreen se l'utente vuole entrare come ospite.
    };
    init();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setAuthMode('login'); // Se non c'è utente, mostra login
    });
  }, []);

  // 2. Fetch Profile & API Key (Securely from Firestore)
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoadingKey(true);
      // Carica Profilo
      const profileSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'));
      if (profileSnap.exists()) setProfile(profileSnap.data());

      // Carica API Key da una collezione protetta
      // Percorso corretto: artifacts/{appId}/public/data/config/secrets (6 segmenti)
      try {
        const keySnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'secrets'));
        if (keySnap.exists() && keySnap.data().gemini_key) {
          setApiKey(keySnap.data().gemini_key);
        } else {
          console.warn("API Key non trovata. Inseriscila in: artifacts/[appId]/public/data/config/secrets -> campo: gemini_key");
          setApiKey(""); // Fallback vuoto
        }
      } catch (e) {
        console.error("Errore recupero API Key", e);
      }
      setLoadingKey(false);
      setAuthMode('app');
    };
    loadData();
  }, [user]);

  // Gestione viste Auth vs App
  if (!user && (authMode === 'login' || authMode === 'register')) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} />;
  }

  if (loadingKey) return <div className="h-screen flex flex-col items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-emerald-600 mb-2" size={40} /><p className="text-sm text-gray-500">Configurazione in corso...</p></div>;

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800 pb-24 md:max-w-md md:mx-auto md:shadow-2xl md:min-h-screen md:border-x border-gray-200">
      
      {!apiKey && (
         <div className="bg-amber-100 p-4 text-xs text-amber-800 text-center">
           <AlertTriangle size={16} className="inline mr-1"/>
           Key mancante: Aggiungi doc <code>public/data/config/secrets</code> con campo <code>gemini_key</code>
         </div>
      )}

      <div className="animate-in fade-in duration-300">
        {activeTab === 'daily' && <DailyView user={user} profile={profile} setActiveTab={setActiveTab} apiKey={apiKey} />}
        {activeTab === 'planner' && <WeeklyPlanner user={user} profile={profile} apiKey={apiKey} />}
        {activeTab === 'trends' && <TrendsAnalytics user={user} />}
        {activeTab === 'add' && <AddFood user={user} profile={profile} close={() => setActiveTab('daily')} apiKey={apiKey} />}
        {activeTab === 'profile' && <UserProfile user={user} profile={profile} setProfile={setProfile} setAuthMode={setAuthMode} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:w-full md:max-w-md md:mx-auto bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-end z-50 pb-safe shadow-lg-up">
        <NavBtn icon={<PieChart size={22} />} label="Oggi" active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />
        <NavBtn icon={<Calendar size={22} />} label="Piano" active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} />
        <div className="relative -top-6">
          <button onClick={() => setActiveTab('add')} className="bg-emerald-600 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform">
            <Plus size={28} />
          </button>
        </div>
        <NavBtn icon={<TrendingUp size={22} />} label="Analisi" active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} />
        <NavBtn icon={<User size={22} />} label="Tu" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
      </div>
    </div>
  );
}

// --- AUTH SCREEN ---
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
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleAnonymous = async () => {
    setLoading(true);
    try { await signInAnonymously(auth); } catch(e) { setError(e.message); }
  };

  return (
    <div className="min-h-screen bg-emerald-600 flex flex-col justify-center p-6 text-white">
      <div className="mb-8 text-center">
        <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Scale className="text-emerald-600" size={40} />
        </div>
        <h1 className="text-3xl font-bold">NutriAI</h1>
        <p className="opacity-90">Il tuo nutrizionista personale</p>
      </div>

      <div className="bg-white rounded-3xl p-6 text-gray-800 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-center">{mode === 'login' ? 'Bentornato' : 'Crea Account'}</h2>
        
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20}/>
            <input 
              type="email" placeholder="Email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none" 
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={20}/>
            <input 
              type="password" placeholder="Password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none" 
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex justify-center">
             {loading ? <Loader2 className="animate-spin"/> : (mode === 'login' ? 'Accedi' : 'Registrati')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {mode === 'login' ? "Non hai un account? " : "Hai già un account? "}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-emerald-600 font-bold">
            {mode === 'login' ? "Registrati" : "Accedi"}
          </button>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
           <button onClick={handleAnonymous} className="text-gray-400 text-xs hover:text-gray-600 underline">
             Continua come ospite (i dati potrebbero andare persi)
           </button>
        </div>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

const NavBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
    {icon}
    <span className="text-[10px] uppercase tracking-wide">{label}</span>
  </button>
);

function DailyView({ user, profile, setActiveTab, apiKey }) {
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
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

  return (
    <div className="p-5 space-y-6">
      <header className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oggi</h1>
          <p className="text-gray-500 text-sm">{new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white border rounded-lg p-2 text-sm" />
      </header>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <span className="text-gray-400 text-xs font-bold tracking-wider uppercase">Calorie</span>
            <div className="text-4xl font-bold text-gray-900">{stats.cals}</div>
            <span className="text-emerald-600 text-sm font-medium">di {targetCals} kcal</span>
          </div>
          <div className="h-16 w-16 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="4" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${Math.min((stats.cals/targetCals)*100, 100)}, 100`} />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 relative z-10">
          <MacroPill label="Prot" val={stats.prot} total={150} color="bg-blue-500" />
          <MacroPill label="Carb" val={stats.carb} total={250} color="bg-amber-500" />
          <MacroPill label="Grassi" val={stats.fat} total={70} color="bg-rose-500" />
        </div>
      </div>

      <div>
        <h2 className="font-bold text-gray-800 mb-3 text-lg">Pasti registrati</h2>
        {logs.length === 0 ? (
          <div onClick={() => setActiveTab('add')} className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors">
            <Plus className="mx-auto mb-2" />
            <p>Non hai ancora mangiato? <br/>Tocca per aggiungere.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group">
                <div>
                  <div className="font-bold text-gray-800 capitalize">{log.name}</div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-3">
                    <span className="font-medium text-emerald-600">{log.calories} kcal</span>
                    <span>P: {log.protein}</span>
                    <span>C: {log.carbs}</span>
                    <span>G: {log.fat}</span>
                  </div>
                </div>
                <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'food_logs', log.id))} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <X size={18} />
                </button>
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

    const prompt = `
      Crea un piano alimentare settimanale dettagliato (7 giorni) altamente personalizzato.
      PROFILO: ${JSON.stringify(profile)}, Attività: ${assessment.activityLevel}, Dieta: ${assessment.dietType}, Allergie: ${assessment.allergies}, Pasti: ${assessment.mealsPerDay}.
      RICHIESTA: JSON rigoroso (lunedì...domenica). Ogni giorno: "colazione", "pranzo", "cena", "snack", "totale_cal".
    `;
    
    const res = await callGemini(prompt, apiKey);
    if(res) {
      setWeekPlan(res);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'plans', 'current_week'), res);
      setShowWizard(false);
    }
    setLoading(false);
  };

  if (showWizard) {
    return (
      <div className="p-5 min-h-screen bg-white animate-in slide-in-from-bottom-5">
        <div className="flex items-center mb-6">
          <button onClick={() => setShowWizard(false)} className="p-2 -ml-2 text-gray-400"><ChevronLeft/></button>
          <h2 className="text-xl font-bold ml-2">Personalizza Piano</h2>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Livello di Attività</label>
             <div className="grid grid-cols-2 gap-3">
              {['Sedentario', 'Leggero', 'Moderato', 'Intenso'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setAssessment({...assessment, activityLevel: opt})}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${assessment.activityLevel === opt ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tipo di Dieta</label>
            <select value={assessment.dietType} onChange={(e) => setAssessment({...assessment, dietType: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <option>Onnivoro</option><option>Vegetariano</option><option>Vegano</option><option>Cheto (Keto)</option>
            </select>
          </div>
           <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Allergie</label>
            <input type="text" value={assessment.allergies} onChange={(e) => setAssessment({...assessment, allergies: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" />
          </div>
          <button onClick={generateWeek} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold mt-8 flex justify-center">{loading ? <Loader2 className="animate-spin" /> : "Genera Piano"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 min-h-screen bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Piano Settimanale</h1>
        {weekPlan && <button onClick={() => setShowWizard(true)} className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full">Rigenera</button>}
      </div>
      
      {!weekPlan ? (
        <div className="text-center py-20 px-6">
          <CheckCircle2 className="mx-auto text-emerald-600 mb-6" size={40} />
          <h3 className="text-lg font-bold mb-2">Nessun piano attivo</h3>
          <button onClick={() => setShowWizard(true)} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg mt-4">Crea Piano</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
            {days.map(d => <button key={d} onClick={() => setSelectedDay(d)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${selectedDay === d ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>{d}</button>)}
          </div>
          <div className="animate-in fade-in duration-300 space-y-4">
             {weekPlan[selectedDay] && Object.entries(weekPlan[selectedDay]).map(([k, v]) => k !== 'totale_cal' && (
               <div key={k} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
                 <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">{k}</div>
                 <div className="text-gray-800 font-medium">{v}</div>
               </div>
             ))}
          </div>
        </>
      )}
    </div>
  );
}

function TrendsAnalytics({ user }) {
  const [history, setHistory] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);

  useEffect(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    const dateStr = d.toISOString().split('T')[0];
    const qFood = query(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), where("date", ">=", dateStr));
    const unsubFood = onSnapshot(qFood, (snap) => {
      const agg = snap.docs.reduce((acc, d) => {
        const data = d.data();
        if(!acc[data.date]) acc[data.date] = {date: data.date, cal:0};
        acc[data.date].cal += (data.calories || 0);
        return acc;
      }, {});
      setHistory(Object.values(agg).sort((a,b)=>a.date.localeCompare(b.date)));
    });
    const qWeight = query(collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'), orderBy("date", "asc"));
    const unsubWeight = onSnapshot(qWeight, (snap) => setWeightHistory(snap.docs.map(d=>d.data())));
    return () => { unsubFood(); unsubWeight(); };
  }, [user]);

  return (
    <div className="p-5 space-y-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold">Analisi</h1>
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 h-64">
        <h3 className="text-sm font-bold text-gray-500 mb-4">Peso</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weightHistory}><Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} /><XAxis hide/><TooltipCustom/></LineChart>
        </ResponsiveContainer>
      </div>
       <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 h-64">
        <h3 className="text-sm font-bold text-gray-500 mb-4">Calorie</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}><Area type="monotone" dataKey="cal" stroke="#3b82f6" fill="#eff6ff" /><XAxis dataKey="date" tickFormatter={v=>v.slice(8)}/><TooltipCustom/></AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const TooltipCustom = (props) => {
    if(props.active && props.payload && props.payload.length){
        return <div className="bg-white p-2 shadow-lg rounded-lg border text-xs">{`${props.label}: ${props.payload[0].value}`}</div>
    }
    return null;
}

function AddFood({ user, profile, close, apiKey }) {
  const [mode, setMode] = useState('camera');
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const analyze = async () => {
    if(!apiKey) return alert("API Key non trovata!");
    setLoading(true);
    let prompt = mode === 'camera' ? `Analizza foto (cibo o barcode). Profilo: ${JSON.stringify(profile)}. JSON: {name, calories, protein, carbs, fat, note}` : `Stima: "${text}". JSON: {name, calories, protein, carbs, fat, note}`;
    const res = await callGemini(prompt, apiKey, image);
    if (res) {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), { ...res, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() });
      close();
    } else alert("Errore analisi.");
    setLoading(false);
  };

  const handleFile = (e) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result.split(',')[1]);
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 p-6 flex flex-col animate-in slide-in-from-bottom-10">
      <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">Nuovo Pasto</h2><button onClick={close}><X/></button></div>
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
        <button onClick={() => setMode('camera')} className={`flex-1 py-3 rounded-lg text-sm ${mode==='camera'?'bg-white shadow-sm':''}`}>Foto</button>
        <button onClick={() => setMode('text')} className={`flex-1 py-3 rounded-lg text-sm ${mode==='text'?'bg-white shadow-sm':''}`}>Testo</button>
      </div>
      <div className="flex-1">
        {mode === 'camera' ? (
          <div onClick={() => fileRef.current.click()} className="h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center bg-gray-50 cursor-pointer overflow-hidden relative">
             <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
             {image ? <img src={`data:image/jpeg;base64,${image}`} className="absolute inset-0 w-full h-full object-cover"/> : <Camera className="text-gray-400"/>}
          </div>
        ) : <textarea value={text} onChange={e=>setText(e.target.value)} className="w-full h-40 p-4 bg-gray-50 rounded-2xl resize-none" placeholder="Descrivi il pasto..." />}
      </div>
      <button onClick={analyze} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-xl flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : "Analizza"}</button>
    </div>
  );
}

function UserProfile({ user, profile, setProfile, setAuthMode }) {
  const [formData, setFormData] = useState(profile);
  const [newWeight, setNewWeight] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if(!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((result) => {
        if(result.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  const save = async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), formData); setProfile(formData); alert("Salvato!"); };
  const logWeight = async () => { if(newWeight) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'), { weight: parseFloat(newWeight), date: new Date().toISOString().split('T')[0] }); setNewWeight(''); alert("Salvato!"); }};
  const handleLogout = async () => { await signOut(auth); setAuthMode('login'); };

  return (
    <div className="p-5 min-h-screen bg-white pb-20">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Profilo</h1>
          <button onClick={handleLogout} className="text-red-500 bg-red-50 p-2 rounded-full"><LogOut size={20}/></button>
      </div>

      {installPrompt && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl mb-6 flex justify-between items-center shadow-lg">
           <div>
             <div className="font-bold">Installa App</div>
             <div className="text-xs opacity-90">Aggiungi alla home per accesso rapido</div>
           </div>
           <button onClick={handleInstall} className="bg-white text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"><Download size={16}/> Installa</button>
        </div>
      )}

      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Età" val={formData.age} onChange={v => setFormData({...formData, age: v})} />
          <Input label="Altezza" val={formData.height} onChange={v => setFormData({...formData, height: v})} />
        </div>
        <Input label="Peso (kg)" val={formData.weight} onChange={v => setFormData({...formData, weight: v})} />
        <button onClick={save} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold">Salva Dati</button>
      </div>
      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
        <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2"><Scale size={18}/> Peso Oggi</h3>
        <div className="flex gap-3">
          <input type="number" placeholder="kg" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="w-24 p-3 rounded-xl text-center font-bold text-lg" />
          <button onClick={logWeight} className="flex-1 bg-emerald-600 text-white rounded-xl font-bold">Registra</button>
        </div>
      </div>
    </div>
  );
}

const Input = ({ label, val, onChange }) => ( <div><label className="text-xs text-gray-500 font-bold ml-1 uppercase">{label}</label><input type="number" value={val} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl mt-1 focus:ring-2 ring-emerald-500" /></div> );
