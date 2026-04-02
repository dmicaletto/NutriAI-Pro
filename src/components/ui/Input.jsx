import React from 'react';

const Input = ({ label, val, onChange, type = 'text' }) => (
  <div>
    <label className="text-xs text-gray-500 font-bold ml-1 uppercase">{label}</label>
    <input type={type} value={val} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl mt-1 focus:ring-2 ring-emerald-500 outline-none border border-gray-100" />
  </div>
);

export default Input;
