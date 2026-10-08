# Mods Claude Code

| Mod | Ce qu'il fait |
| --- | --- |
| `next-steps` | Après chaque réponse, 3 boutons de prochaine étape (touches 1-3). Un clic envoie la suggestion comme si vous l'aviez tapée. « Ignorer » les efface, `/suggestions off` les coupe. |
| `record-mode` | `/record on` masque à l'écran e-mails, numéros de téléphone et montants en euros (`[EMAIL]`, `[TÉLÉPHONE]`, `[MONTANT €]`). Badge « ● REC » visible tant que c'est actif. `/record off` arrête. |
| `progress-bar` | Pendant une tâche à plusieurs étapes : barre, étapes faites / total, étape en cours, temps écoulé. |

## Installer

Dans une session Claude Code (terminal) :

```
/plugin install next-steps --marketplace MOHAMED-JA/simulateur-credit
/plugin install record-mode --marketplace MOHAMED-JA/simulateur-credit
/plugin install progress-bar --marketplace MOHAMED-JA/simulateur-credit
```

Répondez `y` pour ajouter le marketplace, puis choisissez la portée « user » (toutes vos sessions).
Vérifier : `claude plugin list` (ou `/plugin`) doit lister le mod comme activé.
