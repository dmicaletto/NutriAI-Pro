import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, X, Pill } from 'lucide-react';
import { db, appId } from '../firebase';
import { useApp } from '../context/AppContext';

const UNITS = ['mg', 'mcg', 'g', 'UI', 'cps', 'ml'];

export default function SupplementManager() {
  const { user } = useApp();
  const [supplements, setSupplements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('mg');

  useEffect(() => {
    return onSnapshot(
      collection(db, 'artifacts', appId, 'users', user.uid, 'supplements'),
      snap => setSupplements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  const add = async () => {
    if (!name.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'supplements'), {
      name: name.trim(), defaultDose: Number(dose) || 0, unit, createdAt: new Date().toISOString(),
    });
    setName(''); setDose(''); setShowForm(false);
  };

  return (
    <div className="bg-white/95 backdrop-blur p-6 rounded-3xl shadow-xl space-y-4 border border-white/50">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Pill size={18} className="text-violet-500" /> Supplementi
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="bg-violet-500 text-white p-1.5 rounded-full hover:bg-violet-600 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 animate-in slide-in-from-top duration-200">
          <input
            placeholder="Nome (es. Vitamina D)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 ring-violet-400 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Dose"
              value={dose}
              onChange={e => setDose(e.target.value)}
              className="w-24 p-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 ring-violet-400 text-sm text-center"
            />
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-gray-200 bg-gray-50 outline-none text-sm"
            >
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
            <button
              onClick={add}
              disabled={!name.trim()}
              className="bg-violet-600 text-white px-4 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-violet-700 transition-colors"
            >
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {supplements.length === 0 && !showForm ? (
        <p className="text-xs text-gray-400 text-center py-1">Nessun supplemento configurato</p>
      ) : (
        <div className="space-y-2">
          {supplements.map(s => (
            <div key={s.id} className="flex justify-between items-center bg-violet-50 rounded-xl px-3 py-2">
              <div>
                <span className="font-bold text-gray-800 text-sm">{s.name}</span>
                {s.defaultDose > 0 && (
                  <span className="text-xs text-gray-400 ml-2">{s.defaultDose} {s.unit}</span>
                )}
              </div>
              <button
                onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'supplements', s.id))}
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
