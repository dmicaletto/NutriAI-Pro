---
title: Regole Firebase — NutriAI-Pro
---

# Regole Firebase

## Sicurezza

- **MAI** scrivere credenziali Firebase nel codice sorgente.
- **MAI** committare `.env` o `.mcp.json`.
- Le variabili `VITE_FIREBASE_*` sono in `.env` locale e in GitHub Secrets per CI/CD.
- La chiave Gemini API è salvata su Firestore in `public/data/config/secrets` — non nel codice.

## App ID

- La variabile `appId` deriva da `__app_id` (globale iniettata a runtime).
- Fallback: `'default-app-id'` — gli slash vengono sostituiti con underscore.
- **Tutti i path Firestore** usano `appId` come primo segmento sotto `artifacts/`.

## Struttura Path Firestore

```
artifacts/{appId}/
├── users/{uid}/
│   ├── profile/
│   │   ├── main          → anagrafica (name, age, weight, height, goal, gender)
│   │   └── assessment    → preferenze alimentari (activityLevel, dietType, allergies,
│   │                       mealsPerDay, dislikedFoods, cookingSkill, prepTime)
│   ├── food_logs/        → collection, un doc per pasto
│   │   └── {autoId}      → {name, calories, protein, carbs, fat, date, timestamp, note?, instructions?}
│   ├── measurements/     → collection, storico peso
│   │   └── {autoId}      → {weight, date}
│   └── plans/
│       └── current_week  → doc singolo con 7 chiavi giorno (lunedì..domenica)
│                           ogni giorno: {colazione, pranzo, cena, totale_cal}
└── public/
    └── data/
        └── config/
            └── secrets   → {gemini_key}
```

## Operazioni Consentite

- **Read** (onSnapshot, getDoc, getDocs): sempre consentite per sviluppo.
- **Write** (addDoc, updateDoc, setDoc): proponi prima la struttura del documento, poi implementa.
- **Delete** (deleteDoc): proponi sempre prima di implementare. Verifica se è soft-delete o hard-delete.
- **Regole Firestore**: qualsiasi modifica alle Security Rules va discussa e approvata prima.

## Realtime Listeners

| Listener | Posizione | Collection | Filtro |
|----------|-----------|------------|--------|
| Food logs giornalieri | `DailyView` | `food_logs` | `where('date', '==', selectedDate)` + `orderBy('timestamp')` |
| Food logs 30gg (trends) | `TrendsAnalytics` | `food_logs` | `orderBy('date')` |
| Peso storico (trends) | `TrendsAnalytics` | `measurements` | `orderBy('date')` |

- Tutti i listener usano `onSnapshot` e si disiscrivono nel cleanup di `useEffect`.
- **Non duplicare** listener — se serve lo stesso dato in più componenti, sollevare lo stato.

## Autenticazione

- Provider: **email/password** (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`).
- Supporto aggiuntivo: **anonimo** (`signInAnonymously`) e **custom token** (`signInWithCustomToken`).
- Il listener `onAuthStateChanged` è in `NutriAIPro` (componente root in `app.jsx`) — non replicarlo altrove.
- Dopo logout (`signOut`), resettare sempre lo stato locale dell'applicazione.
- I messaggi di errore Firebase vanno tradotti in italiano (già gestito in `AuthScreen`).

## MCP Firebase

Il server MCP Firebase (`firebase-tools experimental:mcp`) è configurato in `.mcp.json`.
Usarlo solo per ispezione/debug in locale. Non automatizzare operazioni distruttive via MCP.
