import React, { useState, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { Camera, X, ChevronLeft, Loader2, ScanLine, CheckCircle2, Sparkles } from 'lucide-react';
import { db, appId } from '../firebase';
import { callGemini } from '../utils/gemini';
import { useApp } from '../context/AppContext';
import BackgroundPattern from './ui/BackgroundPattern';

export default function AddFood() {
  const { user, profile, apiKey, setActiveTab } = useApp();
  const close = () => setActiveTab('daily');
  const [mode, setMode] = useState('camera');
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const fileRef = useRef(null);

  const analyze = async () => {
    if (!apiKey) return alert("API Key non trovata!");
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
    if (!reviewData) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), { ...reviewData, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() });
    close();
  };

  const handleFile = (e) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result.split(',')[1]);
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
  };

  if (reviewData) {
    return (
      <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col h-[100dvh]">
        <BackgroundPattern />
        <div className="relative z-10 flex flex-col h-full">
          <div className="bg-white/90 backdrop-blur p-4 shadow-sm flex items-center justify-between pt-safe-top border-b border-gray-200">
            <button onClick={() => setReviewData(null)} className="p-2 bg-gray-100 rounded-full"><ChevronLeft /></button>
            <h2 className="font-bold text-lg">Conferma Dati</h2>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
            <div className="bg-white/90 backdrop-blur p-4 rounded-xl text-emerald-800 text-sm flex gap-3 items-center shadow-sm">
              <Sparkles className="shrink-0 text-emerald-600" />
              <p>Ho stimato questi valori. Correggili se necessario.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-white uppercase ml-1">Pasto</label>
              <input value={reviewData.name} onChange={e => setReviewData({ ...reviewData, name: e.target.value })} className="w-full p-4 bg-white/95 backdrop-blur rounded-xl mt-1 font-bold text-lg shadow-sm border border-white/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-white uppercase ml-1">Kcal</label><input type="number" value={reviewData.calories} onChange={e => setReviewData({ ...reviewData, calories: Number(e.target.value) })} className="w-full p-4 bg-white/95 backdrop-blur rounded-xl mt-1 font-bold text-emerald-600 text-xl shadow-sm border border-white/50" /></div>
              <div className="space-y-2">
                <div className="bg-white/95 backdrop-blur p-2 rounded-lg shadow-sm flex justify-between text-sm"><span>Prot</span><input type="number" value={reviewData.protein} onChange={e => setReviewData({ ...reviewData, protein: Number(e.target.value) })} className="w-12 text-right font-bold text-blue-600 outline-none bg-transparent" /></div>
                <div className="bg-white/95 backdrop-blur p-2 rounded-lg shadow-sm flex justify-between text-sm"><span>Carb</span><input type="number" value={reviewData.carbs} onChange={e => setReviewData({ ...reviewData, carbs: Number(e.target.value) })} className="w-12 text-right font-bold text-amber-600 outline-none bg-transparent" /></div>
                <div className="bg-white/95 backdrop-blur p-2 rounded-lg shadow-sm flex justify-between text-sm"><span>Gras</span><input type="number" value={reviewData.fat} onChange={e => setReviewData({ ...reviewData, fat: Number(e.target.value) })} className="w-12 text-right font-bold text-rose-600 outline-none bg-transparent" /></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/90 backdrop-blur border-t border-gray-200 pb-safe">
            <div className="flex gap-3">
              <button onClick={() => setReviewData(null)} className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl">Annulla</button>
              <button onClick={saveLog} className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex justify-center gap-2 items-center"><CheckCircle2 /> Salva</button>
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
          <button onClick={close} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </div>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto pb-24">
          <div className="bg-white/90 backdrop-blur p-1 rounded-xl shadow-sm mb-6 flex border border-white/50">
            <button onClick={() => setMode('camera')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'camera' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Foto</button>
            <button onClick={() => setMode('text')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'text' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Testo</button>
          </div>

          {mode === 'camera' ? (
            <div className="space-y-4">
              <div onClick={() => fileRef.current.click()} className="h-64 border-2 border-dashed border-white/60 bg-white/30 backdrop-blur rounded-3xl flex flex-col items-center justify-center cursor-pointer relative hover:bg-white/40 transition-colors shadow-sm">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                {image ? <img src={`data:image/jpeg;base64,${image}`} className="absolute inset-0 w-full h-full object-cover rounded-3xl" /> : <div className="flex flex-col items-center text-white"><Camera size={48} className="mb-2 drop-shadow-md" /><span className="font-bold drop-shadow-md">Scatta Foto</span></div>}
              </div>
              <div>
                <label className="text-xs font-bold text-white uppercase ml-1 drop-shadow-sm">Note (es. "Senza olio")</label>
                <input value={text} onChange={e => setText(e.target.value)} className="w-full p-4 bg-white/95 backdrop-blur rounded-xl mt-1 border border-white/50 shadow-sm focus:ring-2 ring-emerald-500 outline-none" />
              </div>
            </div>
          ) : (
            <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-64 p-4 bg-white/95 backdrop-blur rounded-2xl border border-white/50 shadow-sm focus:ring-2 ring-emerald-500 text-lg placeholder-gray-400 resize-none" placeholder="Es: Pasta al pomodoro e una mela..." />
          )}
        </div>

        <div className="p-4 bg-white/90 backdrop-blur border-t border-gray-200 pb-safe">
          <div className="flex gap-3">
            <button onClick={close} className="px-6 py-4 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Annulla</button>
            <button
              onClick={analyze}
              disabled={loading || (mode === 'camera' && !image) || (mode === 'text' && !text)}
              className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><ScanLine /> Analizza</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
