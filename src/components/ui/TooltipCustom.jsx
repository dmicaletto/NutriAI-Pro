import React from 'react';

const TooltipCustom = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur p-3 shadow-xl rounded-xl border border-white/50 text-xs text-gray-700">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-emerald-600 font-bold">
          {payload[0].value} {payload[0].name === 'weight' ? 'kg' : 'kcal'}
        </p>
      </div>
    );
  }
  return null;
};

export default TooltipCustom;
