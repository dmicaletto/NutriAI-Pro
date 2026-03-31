import React, { useState, useEffect } from 'react';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, Scale, Download } from 'lucide-react';
import { auth, db, appId } from '../firebase';
import { useApp } from '../context/AppContext';
import Input from './ui/Input';

export default function UserProfile() {
  const { user, profile, setProfile, setAuthMode } = useApp();
  const [formData, setFormData] = useState(profile);
  const [newWeight, setNewWeight] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => { if (installPrompt) installPrompt.prompt(); };
  const save = async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), formData); setProfile(formData); alert("Salvato!"); };
  const logWeight = async () => { if (newWeight) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'), { weight: parseFloat(newWeight), date: new Date().toISOString().split('T')[0] }); setNewWeight(''); alert("Salvato!"); } };

  return (
    <div className="pb-24 space-y-6">
      <div className="flex justify-between items-center text-white pt-2">
        <h1 className="text-2xl font-bold">Profilo</h1>
        <button onClick={async () => { await signOut(auth); setAuthMode('login'); }} className="text-white bg-white/20 p-2 rounded-full hover:bg-white/30"><LogOut size={20} /></button>
      </div>

      {installPrompt && (
        <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center animate-in slide-in-from-top">
          <div><div className="font-bold">Installa App</div><div className="text-xs opacity-90">Accesso rapido dalla home</div></div>
          <button onClick={handleInstall} className="bg-white text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"><Download size={16} /> Installa</button>
        </div>
      )}

      <div className="bg-white/95 backdrop-blur p-6 rounded-3xl shadow-xl space-y-4 border border-white/50">
        <h3 className="font-bold text-gray-800">I tuoi dati</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Età" val={formData.age} onChange={v => setFormData({ ...formData, age: v })} />
          <Input label="Altezza" val={formData.height} onChange={v => setFormData({ ...formData, height: v })} />
        </div>
        <Input label="Peso (kg)" val={formData.weight} onChange={v => setFormData({ ...formData, weight: v })} />
        <button onClick={save} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800">Salva Modifiche</button>
      </div>

      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2"><Scale size={18} /> Aggiorna Peso</h3>
        <div className="flex gap-3">
          <input type="number" placeholder="kg" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="w-24 p-3 rounded-xl text-center font-bold text-lg bg-white border border-emerald-100 outline-none focus:ring-2 ring-emerald-500" />
          <button onClick={logWeight} className="flex-1 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700">Registra</button>
        </div>
      </div>
    </div>
  );
}
