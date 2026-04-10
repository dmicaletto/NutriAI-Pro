---
title: Dominio NutriAI-Pro
---

# Regole Dominio NutriAI

## Entità Principali

### Profilo Utente (`profile/main`)
Anagrafica e obiettivo nutrizionale. Campi: `firstName`, `lastName`, `age`, `weight`, `height`, `goal`, `gender`.

### Assessment (`profile/assessment`)
Questionario preferenze per il planner settimanale. Campi:
- `activityLevel` — livello attività fisica
- `dietType` — tipo dieta (onnivoro, vegetariano, vegano, chetogenica, paleo)
- `allergies` — allergie/intolleranze (testo libero)
- `mealsPerDay` — numero pasti giornalieri
- `dislikedFoods` — alimenti non graditi
- `cookingSkill` — livello abilità in cucina
- `prepTime` — tempo preparazione per pasto (`{breakfast, lunch, dinner}`)

### Pasto (`food_logs/{autoId}`)
Singolo pasto registrato. Campi: `name`, `calories`, `protein`, `carbs`, `fat`, `date`, `timestamp`, `note?`, `instructions?`.
- `date` in formato `YYYY-MM-DD`, usato per filtrare per giorno.
- `instructions` presente quando il pasto deriva da una ricetta Chef Frigo.

### Misurazione (`measurements/{autoId}`)
Peso registrato. Campi: `weight` (numero), `date` (`YYYY-MM-DD`).

### Attività Sportiva (`activity_logs/{autoId}`)
Attività fisica giornaliera. Campi: `name`, `met` (coefficiente MET), `duration` (minuti), `caloriesBurned`, `date` (`YYYY-MM-DD`), `timestamp`.
- `caloriesBurned` = `Math.round(met × weight_kg × duration_hours)` — formula MET offline.
- Le calorie bruciate aumentano il `targetCals` giornaliero in `DailyView`.

### Supplemento (`supplements/{autoId}`)
Catalogo personale dei supplementi. Campi: `name`, `defaultDose` (numero), `unit` (mg/mcg/g/UI/cps/ml), `createdAt`.
- Gestito in `UserProfile` tramite `SupplementManager`.

### Assunzione Supplemento (`supplement_logs/{autoId}`)
Assunzione giornaliera. Campi: `supplementId`, `name`, `dose`, `unit`, `date` (`YYYY-MM-DD`), `timestamp`.
- Check-in giornaliero in `DailyView` tramite `SupplementCheckin` (toggle preso/da prendere).

### Piano Settimanale (`plans/current_week`)
Documento singolo con 7 chiavi giorno (`lunedì`..`domenica`). Ogni giorno contiene:
`{colazione, pranzo, cena, totale_cal}`.
Generato dall'AI sulla base di assessment + profilo.

---

## Terminologia UI (Italiano)

| Termine tecnico | Label UI |
|-----------------|----------|
| food_logs | Pasti registrati |
| calories | Calorie (kcal) |
| protein | Proteine (g) |
| carbs | Carboidrati (g) |
| fat | Grassi (g) |
| measurements | Misurazioni peso |
| current_week | Piano settimanale |
| assessment | Questionario preferenze |
| daily | Oggi |
| planner | Piano |
| trends | Analisi |
| add | Aggiungi |
| profile | Tu |
| goal: Mantenimento | Mantenimento |
| goal: Dimagrimento | Dimagrimento |
| goal: Aumento Massa | Aumento Massa |
| gender: Uomo | Uomo |
| gender: Donna | Donna |
| Chef Frigo | Chef Frigo (ricette da ingredienti disponibili) |

---

## Flussi Principali

### 1. Registrazione Pasto (AddFood)
1. Utente sceglie modalità: **foto** o **testo**
2. Invio a Gemini → analisi nutrizionale (JSON: name, calories, protein, carbs, fat)
3. Schermata di review → utente può editare i valori
4. Salvataggio in `food_logs` con data odierna

### 2. Chef Frigo (DailyView)
1. Utente inserisce ingredienti disponibili
2. Gemini genera **3 ricette** con valori nutrizionali e istruzioni
3. Utente seleziona una ricetta → visualizza istruzioni
4. Opzione di aggiungere la ricetta ai pasti del giorno (salva in `food_logs` con `instructions`)

### 3. Piano Settimanale (WeeklyPlanner)
1. Se non esiste assessment → wizard a step (attività, dieta, allergie, skill, tempi)
2. Salvataggio assessment in `profile/assessment`
3. Invio a Gemini con assessment + profilo → piano 7 giorni (JSON)
4. Salvataggio in `plans/current_week`
5. Visualizzazione per giorno selezionato; possibilità di rigenerare

### 4. Calcolo Target Calorico (DailyView)
- BMR = `10*peso + 6.25*altezza - 5*età + (genere === 'Uomo' ? 5 : -161)`
- Target = BMR × moltiplicatore obiettivo:
  - Dimagrimento: ×1.1
  - Aumento Massa: ×1.4
  - Mantenimento: ×1.2

### 5. Trend e Analisi (TrendsAnalytics)
- Grafico peso (LineChart) — storico da `measurements`
- Grafico calorie (AreaChart) — ultimi 30 giorni da `food_logs`

---

## API Esterne

### Google Gemini 2.5 Flash
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Chiave API**: caricata da Firestore (`public/data/config/secrets.gemini_key`)
- **Modalità**: testo (JSON mode) + immagine (base64 JPEG)
- **Usi**: analisi foto pasto, analisi testo pasto, generazione ricette, generazione piano settimanale
- **Lingua prompt**: italiano
- **Funzione wrapper**: `callGemini(prompt, apiKey, imageBase64?, jsonMode?)`
