# Changelog

Tutti i cambiamenti significativi a questo progetto saranno documentati in questo file.

## [1.0.1] - 2026-01-28

### Fixed
- Risolto un errore `TypeError: Cannot read properties of undefined (reading 'breakfast')` nel componente `WeeklyPlanner`.
- Aggiunta una logica di merging dei dati dell'assessment più robusta per prevenire crash con dati incompleti proveniente da Firestore.
- Implementato l'uso dell'optional chaining e valori di default per i tempi di preparazione dei pasti nel wizard del piano settimanale.
