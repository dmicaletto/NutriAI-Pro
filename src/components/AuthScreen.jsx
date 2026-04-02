import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, Loader2, Scale } from 'lucide-react';
import { auth } from '../firebase';
import BackgroundPattern from './ui/BackgroundPattern';

export default function AuthScreen({ mode, setMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-emerald-600 flex flex-col justify-center p-6 text-white relative overflow-hidden">
      <BackgroundPattern />
      <div className="relative z-10">
        <div className="mb-10 text-center">
          <div className="bg-white w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
            <Scale className="text-emerald-600" size={48} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">NutriAI</h1>
          <p className="opacity-90 mt-2 text-lg">Il tuo nutrizionista tascabile</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl p-8 text-gray-800 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{mode === 'login' ? 'Bentornato' : 'Inizia Ora'}</h2>
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4">{error}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 ring-emerald-200 outline-none transition-all" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input type="password" placeholder="Password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 ring-emerald-200 outline-none transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex justify-center shadow-lg shadow-emerald-200">
              {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Accedi' : 'Crea Account')}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? "Nuovo qui? " : "Hai già un account? "}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-emerald-600 font-bold hover:underline">{mode === 'login' ? "Registrati" : "Accedi"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
