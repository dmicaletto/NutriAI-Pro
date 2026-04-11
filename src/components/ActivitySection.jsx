import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Flame, Plus, X, Dumbbell, Clock, CheckCircle2, Circle } from 'lucide-react';
import { db, appId } from '../firebase';
import { useApp } from '../context/AppContext';

const MET_TABLE = [
  { name: 'Corsa', met: 8 },
  { name: 'Camminata', met: 3.5 },
  { name: 'Ciclismo', met: 7 },
  { name: 'Nuoto', met: 6 },
  { name: 'Pesi', met: 5 },
  { name: 'HIIT', met: 10 },
  { name: 'Yoga', met: 2.5 },
  { name: 'Pilates', met: 3 },
  { name: 'Calcio', met: 7 },
  { name: 'Tennis', met: 7 },
  { name: 'Altro', met: 4 },
];

export default function ActivitySection({ date, onActivitiesUpdate }) {
  const { user, profile } = useApp();
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedSport, setSelectedSport] = useState(MET_TABLE[0]);
  const [duration, setDuration] = useState('');
  const [startTime, setStartTime] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'activity_logs'),
      where('date', '==', date)
    );
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(items);
    });
  }, [user, date]);

  useEffect(() => {
    const total = logs.reduce((sum, l) => sum + (l.caloriesBurned || 0), 0);
    onActivitiesUpdate({ total, activities: logs });
  }, [logs]);

  const addActivity = async () => {
    if (!duration) return;
    const weight = profile.weight || 70;
    const caloriesBurned = Math.round(selectedSport.met * weight * (Number(duration) / 60));
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'activity_logs'), {
      name: selectedSport.name,
      met: selectedSport.met,
      duration: Number(duration),
      caloriesBurned,
      startTime,
      completed: false,
      date,
      timestamp: new Date().toISOString(),
    });
    setDuration('');
    setStartTime('');
    setShowForm(false);
  };

  const toggleCompleted = async (log) => {
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'activity_logs', log.id), {
      completed: !log.completed,
    });
  };

  const totalKcal = logs.reduce((sum, l) => sum + (l.caloriesBurned || 0), 0);
  const completedCount = logs.filter(l => l.completed).length;
  const sortedLogs = [...logs].sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  return (
    <div className="bg-white/90 backdrop-blur border border-white/50 rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Dumbbell size={20} className="text-violet-500" /> Attività previste
          {totalKcal > 0 && (
            <span className="ml-1 bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Flame size={12} /> {totalKcal} kcal
            </span>
          )}
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="bg-violet-500 text-white p-1.5 rounded-full shadow-sm hover:bg-violet-600 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex flex-wrap gap-2">
            {MET_TABLE.map(s => (
              <button key={s.name} onClick={() => setSelectedSport(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSport.name === s.name ? 'bg-violet-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <input type="number" placeholder="min" value={duration} onChange={e => setDuration(e.target.value)}
              className="w-20 p-3 rounded-xl border border-gray-200 text-center font-bold bg-white outline-none focus:ring-2 ring-violet-400" />
            <span className="text-xs text-gray-400">min</span>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="p-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 ring-violet-400" />
            {profile.weight && duration && (
              <span className="text-xs text-violet-600 font-bold">
                ≈ {Math.round(selectedSport.met * profile.weight * (Number(duration) / 60))} kcal
              </span>
            )}
            <button onClick={addActivity} disabled={!duration}
              className="ml-auto bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 shadow-sm hover:bg-violet-700 transition-colors">
              Pianifica
            </button>
          </div>
        </div>
      )}

      {logs.length === 0 && !showForm ? (
        <p className="text-xs text-gray-400 text-center py-1">Nessuna attività pianificata</p>
      ) : (
        <div className="space-y-2">
          {logs.length > 0 && (
            <p className="text-xs text-gray-400 mb-1">{completedCount}/{logs.length} completate</p>
          )}
          {sortedLogs.map(log => (
            <div key={log.id}
              className={`flex justify-between items-center rounded-xl px-3 py-2 transition-all ${log.completed ? 'bg-violet-50' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {log.startTime
                  ? <span className="text-xs font-mono text-gray-500 shrink-0">{log.startTime}</span>
                  : <Clock size={14} className="text-gray-300 shrink-0" />}
                <span className={`font-bold text-sm truncate ${log.completed ? 'text-violet-700' : 'text-gray-700'}`}>{log.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{log.duration} min</span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <span className={`text-xs font-bold flex items-center gap-0.5 ${log.completed ? 'text-violet-600' : 'text-gray-400'}`}>
                  <Flame size={12} />{log.caloriesBurned}
                </span>
                <button onClick={() => toggleCompleted(log)} className="p-1.5 transition-colors">
                  {log.completed
                    ? <CheckCircle2 size={18} className="text-violet-600" />
                    : <Circle size={18} className="text-gray-300 hover:text-violet-400" />}
                </button>
                <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'activity_logs', log.id))}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
