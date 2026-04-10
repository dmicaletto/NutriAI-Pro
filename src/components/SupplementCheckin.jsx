import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { CheckCircle2, Circle, Pill } from 'lucide-react';
import { db, appId } from '../firebase';
import { useApp } from '../context/AppContext';

export default function SupplementCheckin({ date }) {
  const { user } = useApp();
  const [supplements, setSupplements] = useState([]);
  const [takenMap, setTakenMap] = useState({}); // supplementId → logDocId

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
      snap.docs.forEach(d => { map[d.data().supplementId] = d.id; });
      setTakenMap(map);
    });
  }, [user, date]);

  const toggle = async (s) => {
    if (takenMap[s.id]) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'supplement_logs', takenMap[s.id]));
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'supplement_logs'), {
        supplementId: s.id, name: s.name, dose: s.defaultDose, unit: s.unit,
        date, timestamp: new Date().toISOString(),
      });
    }
  };

  if (supplements.length === 0) return null;

  const takenCount = Object.keys(takenMap).length;

  return (
    <div className="bg-white/90 backdrop-blur border border-white/50 rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Pill size={20} className="text-violet-500" /> Supplementi
        </h3>
        <span className="text-xs text-violet-600 font-bold">
          {takenCount}/{supplements.length}
        </span>
      </div>
      <div className="space-y-2">
        {supplements.map(s => {
          const taken = !!takenMap[s.id];
          return (
            <button
              key={s.id}
              onClick={() => toggle(s)}
              className={`w-full flex justify-between items-center rounded-xl px-3 py-2.5 transition-all ${taken ? 'bg-violet-100' : 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                {taken
                  ? <CheckCircle2 size={18} className="text-violet-600 shrink-0" />
                  : <Circle size={18} className="text-gray-300 shrink-0" />}
                <span className={`text-sm font-bold ${taken ? 'text-violet-700' : 'text-gray-600'}`}>{s.name}</span>
                {s.defaultDose > 0 && (
                  <span className="text-xs text-gray-400">{s.defaultDose} {s.unit}</span>
                )}
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
