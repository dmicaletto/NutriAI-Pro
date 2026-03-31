import React from 'react';

const BackgroundPattern = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-emerald-600">
    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 to-emerald-700 opacity-90"></div>
    <svg className="absolute top-0 left-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10%" cy="10%" r="50" fill="white" />
      <circle cx="90%" cy="20%" r="30" fill="white" />
      <circle cx="50%" cy="50%" r="80" fill="white" />
      <circle cx="20%" cy="80%" r="40" fill="white" />
      <circle cx="80%" cy="90%" r="60" fill="white" />
      <path d="M0 100 Q 250 250 500 100 T 1000 100" stroke="white" strokeWidth="2" fill="none" />
      <path d="M0 300 Q 250 450 500 300 T 1000 300" stroke="white" strokeWidth="2" fill="none" />
      <path d="M0 500 Q 250 650 500 500 T 1000 500" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  </div>
);

export default BackgroundPattern;
