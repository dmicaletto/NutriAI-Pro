---
title: Open Points — NutriAI-Pro
description: Debito tecnico, miglioramenti e task aperti
tags: [open-points, roadmap, tech-debt]
last_updated: 2026-03-31
version: 1.0.0
related: [CHANGELOG.md, README.md]
---

# Open Points — NutriAI-Pro

Legenda priorità: 🔴 critico | 🟠 importante | 🟡 miglioramento | 🔵 nice-to-have

---

## Sicurezza

| # | Priorità | Descrizione | Stato |
|---|----------|-------------|-------|
| S1 | 🔴 | **Firebase config hardcoded in `app.jsx`** — le credenziali Firebase sono nel sorgente (righe 9-16) invece che in `.env` tramite `import.meta.env.VITE_FIREBASE_*`. Il file `.env.example` esiste ma `.env` è vuoto e non usato. | Aperto |
| S2 | 🟠 | **File `firestore.rules` mancante** — `firebase.json` lo referenzia ma il file non esiste nel repo. Le Security Rules non sono versionare. | Aperto |

---

## Architettura

| # | Priorità | Descrizione | Stato |
|---|----------|-------------|-------|
| A1 | 🟠 | **Monolite `app.jsx`** — 912 righe, 11 componenti, utility e API wrapper tutti nello stesso file. Da valutare splitting in `components/`, `hooks/`, `utils/`. | Aperto |
| A2 | 🟡 | **Nessun state management** — tutto via props drilling dal root. Valutare React Context per `user`, `apiKey`, `profile`. | Aperto |
| A3 | 🟡 | **Nessun routing** — navigazione via stato locale `activeTab`. Valutare `react-router` per deep linking e history. | Aperto |

---

## Dipendenze

| # | Priorità | Descrizione | Stato |
|---|----------|-------------|-------|
| D1 | 🟡 | **Three.js non utilizzato** — `three`, `@react-three/fiber`, `@react-three/drei` sono in `package.json` ma non importati da nessuna parte. Peso inutile nel bundle. | Aperto |
| D2 | 🟡 | **Tailwind via CDN** — nessun tree-shaking/purge. Bundle CSS include tutte le classi Tailwind. Valutare installazione locale con PostCSS (già in devDependencies). | Aperto |

---

## Funzionalità

| # | Priorità | Descrizione | Stato |
|---|----------|-------------|-------|
| F1 | 🟠 | **Nessuna validazione input** — i form (profilo, pasto, peso) non validano i dati prima del salvataggio su Firestore. | Aperto |
| F2 | 🟡 | **Nessuna gestione errori Gemini visibile** — se la chiamata API fallisce, l'errore va solo in console. L'utente non riceve feedback UI. | Aperto |
| F3 | 🟡 | **Nessuna modalità offline** — il Service Worker (`sw.js`) esiste ma da verificare se gestisce correttamente cache e fallback. | Aperto |
| F4 | 🔵 | **Dark mode** — attualmente solo tema light. | Aperto |
| F5 | 🔵 | **Modifica pasto** — si può solo cancellare e ricreare. Manca la funzione di edit diretto. | Aperto |

---

## Testing & CI

| # | Priorità | Descrizione | Stato |
|---|----------|-------------|-------|
| T1 | 🟠 | **Zero test** — nessun test unitario, di integrazione o e2e. Nessun framework di test configurato. | Aperto |
| T2 | 🟡 | **Nessun linting in CI** — il workflow `deploy.yml` fa solo build, non esegue lint. | Aperto |

---

## Documentazione

| # | Priorità | Descrizione | Stato |
|---|----------|-------------|-------|
| DOC1 | 🟡 | **README minimale** — contiene solo titolo e sottotitolo. Mancano: setup locale, variabili d'ambiente, architettura, screenshot. | Aperto |
| DOC2 | 🟡 | **CHANGELOG incompleto** — ultima entry v1.0.1 (2026-01-28). Mancano le versioni successive. | Aperto |

---

## Come usare questo documento

1. Scegliere un punto da affrontare
2. Discutere approccio e approvare
3. Implementare
4. Aggiornare lo stato da "Aperto" a "Chiuso" con data
5. Se emergono nuovi punti, aggiungerli in coda alla sezione appropriata
