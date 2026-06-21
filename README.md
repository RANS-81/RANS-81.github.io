# Pulse — Suivi de budget du foyer

Application web de suivi de budget à partir de relevés bancaires CSV, pour
deux personnes du même foyer. Design sobre type fintech (sidebar de
navigation, cartes blanches arrondies, accent indigo). Aucune dépendance de
build : HTML / CSS / JavaScript natifs. Le seul script externe est
[Chart.js](https://www.chartjs.org/) chargé depuis un CDN.

L'import est direct : dès qu'un CSV est déposé, ses transactions sont
enregistrées et le tableau de bord se met à jour immédiatement — il n'y a
pas d'étape de validation manuelle séparée.

## Fonctionnement général

L'application n'invente aucune catégorie : elle réutilise directement les
colonnes **Categorie** / **Sous categorie** fournies par l'export bancaire.
Chaque transaction est automatiquement classée en trois statuts :

- **normale** — comptée dans les statistiques
- **virement_interne** — quand la banque indique `Transaction exclue` /
  `Virement interne` (mouvements entre comptes du foyer) ; exclue des stats
- **non_categorisee** — quand la catégorie commence par `A categoriser`

## Navigation

La sidebar à gauche donne accès à 5 sections :

1. **Tableau de bord** — graphique en barres empilées des dépenses par mois
   et par catégorie, et graphique en barres du cumulé par catégorie sur
   toute la période. C'est la destination automatique après chaque import.
2. **Vue mensuelle** — tableau croisé catégories (lignes) × mois (colonnes),
   avec totaux par ligne, par colonne et total général.
3. **Virements** — liste des virements internes détectés, pour vérification.
4. **À catégoriser** — liste des opérations que la banque n'a pas su
   classer, pour information (à corriger directement dans l'espace bancaire
   si besoin).
5. **Importer** — dépose un CSV pour Monsieur et/ou un CSV pour Madame
   (clic ou glisser-déposer). Le dédoublonnage évite les doublons si tu
   réimportes un fichier qui chevauche un import précédent.

Un filtre **Tous / Monsieur / Madame** dans la barre du haut s'applique à
toutes les sections.

## Format de fichier attendu

CSV avec séparateur `;`, encodage Latin-1 (ISO-8859-1), comportant au moins
les colonnes :

```
Date de comptabilisation;Libelle simplifie;...;Categorie;Sous categorie;Debit;Credit;...
```

C'est le format d'export standard de la Caisse d'Épargne / Banque Populaire
(groupe BPCE). Si tes colonnes diffèrent, l'application affiche clairement
les colonnes manquantes plutôt que d'importer des données erronées.

## Démarrer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

(Ouvrir directement `index.html` fonctionne aussi dans la plupart des
navigateurs.)

## Déployer sur GitHub Pages

1. Pousse ce dossier à la racine d'un dépôt GitHub :
   ```bash
   git init
   git add .
   git commit -m "Suivi de budget du foyer"
   git branch -M main
   git remote add origin https://github.com/<ton-utilisateur>/<ton-depot>.git
   git push -u origin main
   ```
2. **Settings → Pages → Build and deployment → Source : Deploy from a branch**
3. Branche `main`, dossier `/ (root)` → Enregistrer.
4. Le site est disponible après quelques minutes à :
   `https://<ton-utilisateur>.github.io/<ton-depot>/`

## Structure du projet

```
├── index.html          Sidebar + 5 sections (Tableau de bord, Vue mensuelle, Virements, À catégoriser, Importer)
├── css/
│   └── style.css        Styles (direction fintech : cartes blanches, accent indigo)
├── js/
│   ├── storage.js       Persistance localStorage, dédoublonnage à l'import
│   ├── csvParser.js     Lecture et interprétation du CSV bancaire
│   ├── charts.js         Graphiques (Chart.js)
│   └── app.js             Logique applicative, import direct, navigation
└── README.md
```

## Notes sur les données

Tout vit dans le `localStorage` du navigateur — rien n'est envoyé sur un
serveur. Vider le cache du site supprime les données. Pense à réimporter
tes relevés régulièrement plutôt que de compter sur une sauvegarde
automatique : il n'y a pas (encore) d'export de secours dans cette version.
