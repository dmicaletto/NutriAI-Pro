import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Plus, X, ChevronLeft, Loader2, ChefHat, Sparkles, Brain } from 'lucide-react';
import { db, appId } from '../firebase';
import { callGemini } from '../utils/gemini';
import { useApp } from '../context/AppContext';
import MacroPill from './ui/MacroPill';
import ActivitySection from './ActivitySection';
import SupplementCheckin from './SupplementCheckin';
import AdvisorToast from './AdvisorToast';

export default function DailyView() {
  const { user, profile, setActiveTab, apiKey, advisorMessage, setAdvisorMessage } = useApp();
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ingredients, setIngredients] = useState('');
  const [suggestedRecipes, setSuggestedRecipes] = useState(null);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [viewingMeal, setViewingMeal] = useState(null);
  const [activityData, setActivityData] = useState({ total: 0, activities: [] });
  const handleActivityData = useCallback((data) => setActivityData(data), []);
  const [morningTip, setMorningTip] = useState(null);
  const [morningTipDismissed, setMorningTipDismissed] = useState(false);
  const [dailyAnalysis, setDailyAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [supplementsData, setSupplementsData] = useState({ supplements: [], taken: {} });
  const [supplementRecs, setSupplementRecs] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const debounceRef = useRef(null);

  const bmr = profile.weight ? (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === 'Uomo' ? 5 : -161) : 2000;
  const targetCals = Math.round(bmr * (profile.goal === 'Dimagrimento' ? 1.1 : profile.goal === 'Aumento Massa' ? 1.4 : 1.2)) + activityData.total;

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), where("date", "==", date));
    return onSnapshot(q, (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user, date]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    const cachedDate = localStorage.getItem('nutriai_tip_date');
    const cachedTip = localStorage.getItem('nutriai_morning_tip');
    if (cachedDate === today && cachedTip) { setMorningTip(cachedTip); return; }
    if (hour < 6 || hour >= 11 || !apiKey) return;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];
    getDocs(query(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), where('date', '==', yestStr)))
      .then(snap => {
        const yestCals = snap.docs.reduce((s, d) => s + (d.data().calories || 0), 0);
        const prompt = `Sei un nutrizionista. Obiettivo utente: ${profile.goal}. Ieri ha consumato ${yestCals} kcal. Dammi 1 consiglio pratico e motivante per oggi (max 2 righe). Solo il consiglio, nessun prefisso.`;
        return callGemini(prompt, apiKey, null, false);
      })
      .then(tip => {
        if (!tip) return;
        const t = tip.trim();
        setMorningTip(t);
        localStorage.setItem('nutriai_morning_tip', t);
        localStorage.setItem('nutriai_tip_date', today);
      })
      .catch(e => console.error('Morning tip error:', e));
  }, [user, apiKey]);

  useEffect(() => {
    if (!apiKey || supplementsData.supplements.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingRecs(true);
      const foodProteins = logs.reduce((s, l) => s + (l.protein || 0), 0);
      const suppList = supplementsData.supplements.map(s => s.name).join(', ');
      const activitiesCtx = activityData.activities.length > 0
        ? activityData.activities.map(a => `${a.name}${a.startTime ? ` alle ${a.startTime}` : ''} (${a.duration} min${a.completed ? ', completata' : ', pianificata'})`).join('; ')
        : 'nessuna';
      const prompt = `Nutrizionista e personal trainer. Calcola il fabbisogno giornaliero consigliato per i seguenti supplementi.
Profilo: ${profile.gender || 'Uomo'}, ${profile.age || 30} anni, ${profile.weight || 70}kg, obiettivo: ${profile.goal || 'Mantenimento'}.
Proteine assunte dai pasti oggi: ${foodProteins}g. Attività: ${activitiesCtx}.
Supplementi: ${suppList}.
Considera gli orari delle attività per raccomandare timing e dosaggi (es. aminoacidi pre-workout).
Rispondi SOLO con JSON valido: { "recommendations": [{ "name": "...", "recommended": numero, "unit": "...", "status": "ok" }] }
status è "ok", "low" o "high" rispetto all'assunzione attuale.`;
      const result = await callGemini(prompt, apiKey, null, true);
      if (result?.recommendations) setSupplementRecs(result.recommendations);
      setLoadingRecs(false);
    }, 5000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [logs, activityData, supplementsData, apiKey]);

  const handleSupplementData = useCallback((data) => setSupplementsData(data), []);

  const analyzeDay = async () => {
    if (!apiKey || loadingAnalysis) return;
    setLoadingAnalysis(true);
    setDailyAnalysis(null);
    const mealsList = logs.map(l => `${l.name} (${l.calories} kcal, P:${l.protein}g, C:${l.carbs}g, G:${l.fat}g)`).join('; ');
    const prompt = `Nutrizionista. Analisi giornata alimentare. Obiettivo: ${profile.goal}. Target: ${targetCals} kcal. Consumate: ${stats.cals} kcal. Pasti: ${mealsList || 'nessuno'}. Analisi concisa: punti positivi, carenze, 1 suggerimento pratico. Max 4 righe in italiano.`;
    const result = await callGemini(prompt, apiKey, null, false);
    setDailyAnalysis(result ? result.trim() : 'Analisi non disponibile.');
    setLoadingAnalysis(false);
  };

  const stats = logs.reduce((acc, l) => ({
    cals: acc.cals + (l.calories || 0),
    prot: acc.prot + (l.protein || 0),
    carb: acc.carb + (l.carbs || 0),
    fat: acc.fat + (l.fat || 0)
  }), { cals: 0, prot: 0, carb: 0, fat: 0 });

  const getRecipe = async () => {
    if (!apiKey) return alert("Manca API Key");
    if (!ingredients) return alert("Inserisci ingredienti!");
    setLoadingRecipe(true);
    setSuggestedRecipes(null);
    setSelectedRecipeIndex(null);
    setShowInstructions(false);
    const prompt = `Chef nutrizionista. Ingredienti: "${ingredients}". Obiettivo: ${profile.goal}. Proponi 3 diverse opzioni di ricette sane.
    JSON: { "recipes": [
      { "name": "...", "description": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "instructions": "...", "note": "..." },
      { "name": "...", "description": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "instructions": "...", "note": "..." },
      { "name": "...", "description": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "instructions": "...", "note": "..." }
    ] }`;
    const res = await callGemini(prompt, apiKey);
    if (res && res.recipes) setSuggestedRecipes(res.recipes);
    else alert("Errore generazione ricette.");
    setLoadingRecipe(false);
  };

  const addSuggestedMeal = async () => {
    if (selectedRecipeIndex === null || !suggestedRecipes) return;
    const meal = suggestedRecipes[selectedRecipeIndex];
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), { ...meal, date: date, timestamp: new Date().toISOString() });
    setSuggestedRecipes(null);
    setSelectedRecipeIndex(null);
    setIngredients('');
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center pt-2 text-white/90">
        <div>
          <h1 className="text-2xl font-bold text-white shadow-sm">Ciao, {profile.firstName || 'Utente'}</h1>
          <p className="text-emerald-100 text-sm">{new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-2 text-sm text-white placeholder-white" />
      </header>

      {morningTip && !morningTipDismissed && (
        <div className="bg-emerald-700/80 backdrop-blur rounded-2xl px-4 py-3 flex gap-3 items-start animate-in fade-in duration-300">
          <Brain size={18} className="text-emerald-200 shrink-0 mt-0.5" />
          <p className="text-sm text-white flex-1 leading-snug">{morningTip}</p>
          <button onClick={() => setMorningTipDismissed(true)} className="text-emerald-300 hover:text-white shrink-0 transition-colors"><X size={16} /></button>
        </div>
      )}

      <div className="bg-white/95 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-gray-400 text-xs font-bold tracking-wider uppercase">Il tuo bilancio</span>
            <div className="text-4xl font-bold text-gray-800">{stats.cals}</div>
            <span className="text-emerald-600 text-sm font-medium">di {targetCals} kcal</span>
          </div>
          <div className="h-16 w-16">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f0fdf4" strokeWidth="4" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${Math.min((stats.cals / targetCals) * 100, 100)}, 100`} />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <MacroPill label="Prot" val={stats.prot} total={150} color="bg-blue-500" />
          <MacroPill label="Carb" val={stats.carb} total={250} color="bg-amber-500" />
          <MacroPill label="Grassi" val={stats.fat} total={70} color="bg-rose-500" />
        </div>
        {supplementsData.supplements.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
            {supplementsData.supplements.map(s => {
              const takenInfo = supplementsData.taken[s.id];
              const takenDose = takenInfo ? (takenInfo.dose || 0) : 0;
              const rec = supplementRecs.find(r => r.name === s.name);
              const maxDose = rec ? rec.recommended : (s.defaultDose || 0);
              const pct = maxDose > 0 ? Math.min((takenDose / maxDose) * 100, 100) : 0;
              const isOver = maxDose > 0 && takenDose > maxDose;
              const isLow = rec?.status === 'low';
              return (
                <div key={s.id}>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-gray-500">{s.name}</span>
                    <span className={`font-bold flex items-center gap-1 ${isOver ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-violet-600'}`}>
                      {takenDose}/{maxDose > 0 ? maxDose : '—'} {s.unit}
                      {loadingRecs && <Loader2 size={10} className="animate-spin" />}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-400' : 'bg-violet-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100">
          <button onClick={analyzeDay} disabled={loadingAnalysis || logs.length === 0}
            className="w-full text-xs text-gray-400 flex items-center justify-center gap-1.5 hover:text-emerald-600 transition-colors disabled:opacity-40 font-medium">
            {loadingAnalysis ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
            Analizza la mia giornata
          </button>
          {dailyAnalysis && (
            <div className="mt-3 text-xs text-gray-600 leading-relaxed bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 animate-in fade-in duration-300">
              {dailyAnalysis}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur border border-white/50 rounded-3xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><ChefHat size={20} className="text-orange-500" /> Chef Frigo</h3>
        {!suggestedRecipes ? (
          <div className="flex gap-2">
            <input value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="Ingredienti disponibili..." className="flex-1 p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white" />
            <button onClick={getRecipe} disabled={loadingRecipe || !ingredients} className="bg-orange-500 text-white p-3 rounded-xl font-bold shadow-md disabled:opacity-50">{loadingRecipe ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}</button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Scegli una ricetta:</span>
              <button onClick={() => setSuggestedRecipes(null)} className="text-gray-400 p-1 hover:bg-orange-100 rounded-full transition-colors"><X size={18} /></button>
            </div>

            <div className="space-y-2">
              {suggestedRecipes.map((recipe, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedRecipeIndex(idx); setShowInstructions(false); }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${selectedRecipeIndex === idx ? 'bg-orange-100 border-orange-300 shadow-sm' : 'bg-white border-orange-50 hover:border-orange-200'}`}
                >
                  <div className="font-bold text-gray-800 text-sm">{recipe.name}</div>
                  <div className="text-[10px] text-gray-500 mt-1 flex gap-2">
                    <span>🔥 {recipe.calories} kcal</span>
                    <span>P: {recipe.protein}g</span>
                    <span>C: {recipe.carbs}g</span>
                    <span>G: {recipe.fat}g</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedRecipeIndex !== null && (
              <div className="bg-white p-4 rounded-2xl border border-orange-100 animate-in slide-in-from-top-1 duration-200">
                <h4 className="font-bold text-gray-800 mb-1">{suggestedRecipes[selectedRecipeIndex].name}</h4>
                <p className="text-xs text-gray-500 mb-4">{suggestedRecipes[selectedRecipeIndex].description}</p>

                {showInstructions ? (
                  <div className="bg-orange-50/50 p-3 rounded-xl mb-4 border border-orange-100/50">
                    <div className="text-[10px] font-bold text-orange-700 uppercase mb-2">Preparazione:</div>
                    <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{suggestedRecipes[selectedRecipeIndex].instructions}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowInstructions(true)}
                    className="w-full mb-3 text-xs text-orange-600 font-bold flex items-center justify-center gap-1 hover:underline"
                  >
                    Mostra come prepararlo <ChevronLeft className="-rotate-90" size={14} />
                  </button>
                )}

                <button onClick={addSuggestedMeal} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-orange-600 transition-colors">
                  Aggiungi al diario
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ActivitySection date={date} onActivitiesUpdate={handleActivityData} />

      <SupplementCheckin date={date} onDataChange={handleSupplementData} />

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
              <div key={log.id} className="bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm flex justify-between items-center group">
                <div className="flex-1 cursor-pointer" onClick={() => log.instructions && setViewingMeal(log)}>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-gray-800 capitalize">{log.name}</div>
                    {log.instructions && <Sparkles size={14} className="text-orange-500" />}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-3">
                    <span className="font-medium text-emerald-600">{log.calories} kcal</span>
                    <span>P: {log.protein}</span><span>C: {log.carbs}</span><span>G: {log.fat}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {log.instructions && (
                    <button onClick={() => setViewingMeal(log)} className="p-2 text-gray-300 hover:text-orange-500 transition-colors">
                      <ChevronLeft className="-rotate-90" size={18} />
                    </button>
                  )}
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'food_logs', log.id))} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdvisorToast message={advisorMessage} onDismiss={() => setAdvisorMessage(null)} />

      {viewingMeal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200" onClick={() => setViewingMeal(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-safe-bottom animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" onClick={() => setViewingMeal(null)}></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 capitalize">{viewingMeal.name}</h3>
                <p className="text-emerald-600 font-bold">{viewingMeal.calories} kcal</p>
              </div>
              <button onClick={() => setViewingMeal(null)} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-50 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-blue-400 uppercase">Proteine</div>
                <div className="font-bold text-blue-700">{viewingMeal.protein}g</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-amber-400 uppercase">Carbi</div>
                <div className="font-bold text-amber-700">{viewingMeal.carbs}g</div>
              </div>
              <div className="bg-rose-50 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-rose-400 uppercase">Grassi</div>
                <div className="font-bold text-rose-700">{viewingMeal.fat}g</div>
              </div>
            </div>

            {viewingMeal.instructions && (
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 max-h-[40vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3 text-orange-600">
                  <ChefHat size={18} />
                  <span className="font-bold text-sm uppercase tracking-wider">Preparazione</span>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {viewingMeal.instructions}
                </div>
              </div>
            )}

            {viewingMeal.note && (
              <div className="mt-4 p-4 border-l-4 border-emerald-500 bg-emerald-50/50 rounded-r-2xl">
                <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Nota Nutrizionale</div>
                <div className="text-xs text-gray-600 italic">{viewingMeal.note}</div>
              </div>
            )}

            <button onClick={() => setViewingMeal(null)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold mt-8 shadow-lg">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}
