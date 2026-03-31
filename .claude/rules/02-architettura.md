---
title: Regole Architettura — NutriAI-Pro
---

# Regole Architettura

## Regole Generali Claude

- **NO commit automatici**: l'utente gestisce autonomamente tutte le operazioni git.
- **NO push, NO force-push**: mai, in nessun caso.
- **NO test automatici**: non eseguire mai `npm run lint`, `npm run build`, `npm test` o qualsiasi altro comando di verifica in autonomia. Proponi sempre il comando e attendi approvazione esplicita prima di eseguirlo.
- **Ogni decisione di implementazione**: proponi prima (cosa fare e perché), implementa solo dopo approvazione esplicita.
- **Modifiche chirurgiche**: modifica solo le righe strettamente necessarie al task. Nessuna riformattazione automatica.
- **Nessun refactoring non richiesto**: non "migliorare" codice circostante, non aggiungere docstring o commenti non richiesti.

## Lingua

- **Business logic e UI copy**: italiano (etichette, messaggi toast, placeholder, testi AI).
- **Termini tecnici**: inglese (variabili, funzioni, prop names, commenti tecnici).
- **Info non verificate**: marcare con `_(da verificare)_`.
- **Documenti pianificati**: marcare con `_(da creare)_`.

## Struttura Componenti

### Gerarchia View

```
NutriAIPro (root)              → stato auth, tab navigation, caricamento profilo/apiKey
├── AuthScreen                 → login email/password, registrazione, accesso anonimo
├── DailyView                  → tracking giornaliero calorie/macro, Chef Frigo
│   └── MacroPill              → pill progress bar per singolo macro
├── WeeklyPlanner              → wizard assessment + piano settimanale AI
├── TrendsAnalytics            → grafici peso e calorie (Recharts)
│   └── TooltipCustom          → tooltip personalizzato per i grafici
├── AddFood                    → cattura pasto (foto/testo) con analisi Gemini
├── UserProfile                → profilo utente, log peso, installazione PWA
├── BackgroundPattern          → sfondo SVG decorativo
└── NavBtn                     → bottone navigazione bottom bar
```

### Stato Attuale

- **Monolite**: tutti i componenti sono in `src/app.jsx` (~912 righe).
- `src/main.jsx` è solo il punto di mount React.
- Non ci sono sotto-cartelle `components/`, `hooks/`, `utils/` — tutto inline.

### Regole di Composizione

- Le tab sono gestite via stato locale `activeTab` nel root (`daily` | `planner` | `trends` | `add` | `profile`).
- Ogni view riceve `user`, `apiKey`, `profile` come props dal root.
- Lo stato dei pasti è locale a `DailyView`; lo stato dei trend è locale a `TrendsAnalytics`.
- Il piano settimanale è locale a `WeeklyPlanner`.

### Naming

- Componenti: **PascalCase** (`DailyView`, `AddFood`, `WeeklyPlanner`).
- Funzioni/variabili: **camelCase** (`callGemini`, `reviewData`, `selectedDate`).
- Collection Firestore: **snake_case** (`food_logs`, `current_week`).
- Campi Firestore: **camelCase** (`activityLevel`, `dietType`) tranne quelli legacy (`totale_cal`).

## Styling

- **Tailwind CSS via CDN** — classi utility inline, nessun file CSS separato.
- **Palette principale**: emerald-600 (primario), orange-500 (accento), gray-* (neutri).
- **Mobile-first**: layout ottimizzato per smartphone, breakpoint `md` per tablet.
- **Tema**: solo light, nessun dark mode.
- **Nessun CSS-in-JS** o moduli CSS.

## Context

- Nessun React Context al momento — tutto passa via props dal root.
- `user`, `apiKey`, `profile` sono le props globali passate a ogni view.

## Icone

- Libreria: **Lucide React** (`lucide-react`).
- Import singoli: `import { Camera, Plus, User, ... } from 'lucide-react'`.
- Non usare altre librerie icone.

## Date

- Formato storage: **`YYYY-MM-DD`** (stringa ISO).
- Timestamp completo: **ISO 8601** (`new Date().toISOString()`).
- Visualizzazione UI: formato italiano (`toLocaleDateString('it-IT')`).
- I giorni della settimana nel piano sono in italiano minuscolo: `lunedì`, `martedì`, ecc.

## Performance

- I listener `onSnapshot` si disiscrivono nel cleanup di `useEffect`.
- Le query `food_logs` filtrano per data (`where('date', '==', ...)`) — non caricano tutto.
- `TrendsAnalytics` carica gli ultimi 30 giorni di dati.

## ESLint

- Configurazione base React (`eslint-plugin-react`, `eslint-plugin-react-hooks`).
- Non aggiungere regole ESLint senza approvazione esplicita.
