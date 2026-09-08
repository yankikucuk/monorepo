---
'@april/eslint-config': minor
---

Remove the unused `ignores` export. The root configuration keeps its own ignore list, and shipping a second one only invited drift.
