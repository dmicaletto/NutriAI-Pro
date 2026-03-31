import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ChevronLeft, Loader2, X, PieChart, Sparkles, CheckCircle2 } from 'lucide-react';
import { db, appId } from '../firebase';
import { callGemini } from '../utils/gemini';

export default function WeeklyPlanner({ user, profile, apiKey }) {
  const [weekPlan, setWeekPlan] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('lunedì');
  const days = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  const [assessment, setAssessment] = useState({
    activityLevel: 'Sedentario',
    dietType: 'Onnivoro',
    allergies: '',
    mealsPerDay: '3',
    dislikedFoods: '',
    cookingSkill: 'Pratico',
    prepTime: { breakfast: '15', lunch: '30', dinner: '30' }
  });

  useEffect(() => {
    getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'plans', 'current_week')).then(s => s.exists() && setWeekPlan(s.data()));
    getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'assessment')).then(s => {
      if (s.exists()) {
        const data = s.data();
        setAssessment(prev => ({
          ...prev,
          ...data,
          prepTime: { ...prev.prepTime, ...(data.prepTime || {}) }
        }));
      }
    });
  }, [user]);

  const generateWeek = async () => {
    if (!apiKey) return alert("API Key non configurata");
    setLoading(true);
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'assessment'), assessment);
    const prompt = `Chef nutrizionista. Crea un piano di 7 giorni.
    Profilo: ${JSON.stringify(profile)}.
    Attività: ${assessment.activityLevel}.
    Dieta: ${assessment.dietType}.
    Allergie: ${assessment.allergies}.
    Cibi da evitare: ${assessment.dislikedFoods}.
    Livello cucina: ${assessment.cookingSkill}.
    Tempi max: Colazione ${assessment.prepTime?.breakfast || '15'}min, Pranzo ${assessment.prepTime?.lunch || '30'}min, Cena ${assessment.prepTime?.dinner || '30'}min.
    JSON: { "lunedì": { "colazione": "Ricetta (tempo)", "pranzo": "Ricetta (tempo)", "cena": "Ricetta (tempo)", "totale_cal": 0 }, ... }`;
    const res = await callGemini(prompt, apiKey);
    if (res) { setWeekPlan(res); await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'plans', 'current_week'), res); setShowWizard(false); }
    setLoading(false);
  };

  if (showWizard) {
    return (
      <div className="fixed inset-0 z-[60] bg-white p-6 animate-in slide-in-from-right flex flex-col">
        <div className="flex items-center mb-6 pt-safe-top">
          <button onClick={() => setShowWizard(false)} className="p-2 -ml-2 text-gray-400"><ChevronLeft /></button>
          <h2 className="text-xl font-bold ml-2">Personalizza</h2>
        </div>
        <div className="space-y-6 flex-1 overflow-y-auto pb-24">
          <div className="bg-emerald-50 p-4 rounded-2xl flex gap-3 items-center text-emerald-800 text-sm">
            <Sparkles className="shrink-0" />
            <p>Questa "intervista" mi aiuta a creare piatti perfetti per i tuoi gusti e il tuo tempo.</p>
          </div>

          <div><label className="font-bold block mb-2 text-gray-700">Attività Fisica</label><div className="grid grid-cols-2 gap-2">{['Sedentario', 'Leggero', 'Moderato', 'Intenso'].map(o => <button key={o} onClick={() => setAssessment({ ...assessment, activityLevel: o })} className={`p-3 rounded-xl border text-sm font-bold transition-all ${assessment.activityLevel === o ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>{o}</button>)}</div></div>

          <div><label className="font-bold block mb-2 text-gray-700">Regime Alimentare</label><select value={assessment.dietType} onChange={e => setAssessment({ ...assessment, dietType: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 ring-emerald-500"><option>Onnivoro</option><option>Vegetariano</option><option>Vegano</option><option>Cheto</option><option>Paleo</option></select></div>

          <div><label className="font-bold block mb-2 text-gray-700 font-bold flex items-center gap-2">⚠️ Allergie o Intolleranze</label><input value={assessment.allergies} onChange={e => setAssessment({ ...assessment, allergies: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 ring-emerald-500" placeholder="Es: Lattosio, Glutine..." /></div>

          <div className="border-t border-gray-100 pt-6">
            <label className="font-bold block mb-2 text-gray-700 flex items-center gap-2"><X className="text-red-500" size={18} /> Cibi da evitare (Non ti piacciono?)</label>
            <textarea value={assessment.dislikedFoods} onChange={e => setAssessment({ ...assessment, dislikedFoods: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 ring-emerald-500 h-24 resize-none" placeholder="Es: Cipolla, Broccoli, Coriandolo..." />
          </div>

          <div>
            <label className="font-bold block mb-2 text-gray-700">Abilità ai Fornelli</label>
            <div className="grid grid-cols-3 gap-2">
              {['Principiante', 'Pratico', 'Chef'].map(o => (
                <button key={o} onClick={() => setAssessment({ ...assessment, cookingSkill: o })} className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${assessment.cookingSkill === o ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                  {o === 'Principiante' && '🍳'} {o === 'Pratico' && '🥘'} {o === 'Chef' && '🤵'}
                  <div className="mt-1">{o}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold block mb-3 text-gray-700 flex items-center gap-2"><PieChart size={18} className="text-blue-500" /> Quanto tempo hai per cucinare? (min)</label>
            <div className="grid grid-cols-3 gap-3">
              <div><span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Colazione</span><input type="number" value={assessment.prepTime?.breakfast || '15'} onChange={e => setAssessment({ ...assessment, prepTime: { ...assessment.prepTime, breakfast: e.target.value } })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-center font-bold" /></div>
              <div><span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Pranzo</span><input type="number" value={assessment.prepTime?.lunch || '30'} onChange={e => setAssessment({ ...assessment, prepTime: { ...assessment.prepTime, lunch: e.target.value } })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-center font-bold" /></div>
              <div><span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Cena</span><input type="number" value={assessment.prepTime?.dinner || '30'} onChange={e => setAssessment({ ...assessment, prepTime: { ...assessment.prepTime, dinner: e.target.value } })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-center font-bold" /></div>
            </div>
          </div>
        </div>
        <button onClick={generateWeek} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold mt-4 shadow-xl mb-safe">{loading ? <Loader2 className="animate-spin mx-auto" /> : "Genera Piano"}</button>
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
            {days.map(d => <button key={d} onClick={() => setSelectedDay(d)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedDay === d ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>{d.slice(0, 3)}</button>)}
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
