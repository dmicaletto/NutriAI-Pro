import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { CheckCircle2, Circle, Pill, Check, X } from 'lucide-react';
import { db, appId } from '../firebase';
import { useApp } from '../context/AppContext';

export default function SupplementCheckin({ date, onDataChange }) {
  const { user } = useApp();
  const [supplements, setSupplements] = useState([]);
  const [takenMap, setTakenMap] = useState({}); // supplementId → { id, dose, unit }
  const [pendingId, setPendingId] = useState(null);
  const [pendingDose, setPendingDose] = useState('');

  useEffect(() => {
    return onSnapshot(
      collection(db, 'artifacts', appId, 'users', user.uid, 'supplements'),
      snap => setSupplements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'supplement_logs'),
      where('date', '==', date)
    );
    return onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[data.supplementId] = { id: d.id, dose: data.dose, unit: data.unit };
      });
      setTakenMap(map);
    });
  }, [user, date]);

  useEffect(() => {
    if (onDataChange) onDataChange({ supplements, taken: takenMap });
  }, [supplements, takenMap]);

  const handleTap = (s) => {
    if (takenMap[s.id]) {
      deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'supplement_logs', takenMap[s.id].id));
    } else {
      setPendingId(s.id);
      setPendingDose(String(s.defaultDose || ''));
    }
  };

  const confirmTake = async (s) => {
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'supplement_logs'), {
      supplementId: s.id, name: s.name,
      dose: Number(pendingDose) || s.defaultDose || 0,
      unit: s.unit, date, timestamp: new Date().toISOString(),
    });
    setPendingId(null);
  };

  if (supplements.length === 0) return null;

  const takenCount = Object.keys(takenMap).length;

  return (
    <div className="bg-white/90 backdrop-blur border border-white/50 rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Pill size={20} className="text-violet-500" /> Supplementi
        </h3>
        <span className="text-xs text-violet-600 font-bold">{takenCount}/{supplements.length}</span>
      </div>
      <div className="space-y-2">
        {supplements.map(s => {
          const taken = takenMap[s.id];
          const isPending = pendingId === s.id;

          if (isPending) {
            return (
              <div key={s.id} className="bg-violet-50 rounded-xl px-3 py-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Pill size={16} className="text-violet-500 shrink-0" />
                  <span className="text-sm font-bold text-violet-700 flex-1">{s.name}</span>
                  <input
                    type="number"
                    value={pendingDose}
                    onChange={e => setPendingDose(e.target.value)}
                    className="w-16 p-1.5 text-center text-sm font-bold border border-violet-300 rounded-lg outline-none focus:ring-2 ring-violet-400 bg-white"
                    autoFocus
                  />
                  <span className="text-xs text-gray-400">{s.unit}</span>
                  <button onClick={() => confirmTake(s)} className="bg-violet-600 text-white p-1.5 rounded-lg hover:bg-violet-700 transition-colors">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setPendingId(null)} className="text-gray-400 hover:text-gray-600 p-1.5 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <button
              key={s.id}
              onClick={() => handleTap(s)}
              className={`w-full flex justify-between items-center rounded-xl px-3 py-2.5 transition-all ${taken ? 'bg-violet-100' : 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                {taken
                  ? <CheckCircle2 size={18} className="text-violet-600 shrink-0" />
                  : <Circle size={18} className="text-gray-300 shrink-0" />}
                <span className={`text-sm font-bold ${taken ? 'text-violet-700' : 'text-gray-600'}`}>{s.name}</span>
                {taken
                  ? <span className="text-xs text-violet-500">{taken.dose} {taken.unit}</span>
                  : s.defaultDose > 0 && <span className="text-xs text-gray-400">{s.defaultDose} {s.unit}</span>
                }
              </div>
              <span className={`text-xs font-bold ${taken ? 'text-violet-500' : 'text-gray-300'}`}>
                {taken ? 'preso' : 'da prendere'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
