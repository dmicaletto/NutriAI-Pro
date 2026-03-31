import React from 'react';

const NavBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
    <div className={`p-1 rounded-xl ${active ? 'bg-emerald-50' : ''}`}>{icon}</div>
    <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-emerald-700' : ''}`}>{label}</span>
  </button>
);

export default NavBtn;
