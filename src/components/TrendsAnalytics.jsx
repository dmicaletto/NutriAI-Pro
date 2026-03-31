import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Scale, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db, appId } from '../firebase';
import TooltipCustom from './ui/TooltipCustom';

export default function TrendsAnalytics({ user }) {
  const [history, setHistory] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);

  useEffect(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    const dateStr = d.toISOString().split('T')[0];

    const qFood = query(collection(db, 'artifacts', appId, 'users', user.uid, 'food_logs'), where("date", ">=", dateStr));
    const unsubFood = onSnapshot(qFood, (snap) => {
      const agg = snap.docs.reduce((acc, d) => {
        const data = d.data();
        if (data.date) {
          if (!acc[data.date]) acc[data.date] = { date: data.date, cal: 0 };
          acc[data.date].cal += (data.calories || 0);
        }
        return acc;
      }, {});
      setHistory(Object.values(agg).sort((a, b) => a.date.localeCompare(b.date)));
    }, (error) => console.error("Food logs error:", error));

    const qWeight = query(collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'), orderBy("date", "asc"));
    const unsubWeight = onSnapshot(qWeight, (snap) => {
      setWeightHistory(snap.docs.map(d => d.data()).filter(d => d.date && d.weight));
    }, (error) => console.error("Weight error:", error));

    return () => { unsubFood(); unsubWeight(); };
  }, [user]);

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-white pt-2">I tuoi progressi</h1>

      <div className="bg-white/95 backdrop-blur p-5 rounded-3xl shadow-xl border border-white/50 h-72">
        <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Scale size={16} /> Peso</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={weightHistory}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
            <XAxis dataKey="date" hide />
            <RechartsTooltip content={<TooltipCustom />} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white/95 backdrop-blur p-5 rounded-3xl shadow-xl border border-white/50 h-72">
        <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><TrendingUp size={16} /> Calorie (30gg)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={history}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" />
            <Area type="monotone" dataKey="cal" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={v => v ? v.slice(8) : ''}
              interval={2}
            />
            <RechartsTooltip content={<TooltipCustom />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
