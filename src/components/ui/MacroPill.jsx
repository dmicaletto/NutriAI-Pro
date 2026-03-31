import React from 'react';

const MacroPill = ({ label, val, total, color }) => (
  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <div className="mt-2">
      <div className="text-sm font-bold text-gray-800">{Math.round(val)}g</div>
      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min((val / total) * 100, 100)}%` }}></div>
      </div>
    </div>
  </div>
);

export default MacroPill;
