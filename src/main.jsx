import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx' // Assicurati che il tuo file principale si chiami App.jsx dentro src
import './index.css' // Opzionale, se vuoi stili base

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
