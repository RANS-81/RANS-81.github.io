# Registre — Suivi de budget du foyer

Application web de suivi de budget à partir de relevés bancaires CSV, pour
deux personnes du même foyer. Aucune dépendance de build : HTML / CSS /
JavaScript natifs. Le seul script externe est
[Chart.js](https://www.chartjs.org/) chargé depuis un CDN.

## Fonctionnement général

L'application n'invente aucune catégorie : elle réutilise directement les
colonnes **Categorie** / **Sous categorie** fournies par l'export bancaire.
Chaque transaction est automatiquement classée en trois statuts :

- **normale** — comptée dans les statistiques
- **virement_interne** — quand la banque indique `Transaction exclue` /
  `Virement interne` (mouvements entre comptes du foyer) ; exclue des stats
- **non_categorisee** — quand la catégorie commence par `A categoriser`

## Les 5 onglets

1. **Import** — dépose un CSV pour Monsieur et/ou un CSV pour Madame. Aperçu
   avant validation (lignes lues, répartition par statut, échantillon), puis
   import définitif. Le dédoublonnage évite les doublons si tu réimportes
   un fichier qui chevauche un import précédent.
2. **Tableau de bord** — graphique en barres empilées des dépenses par mois
   et par catégorie, et graphique en barres du cumulé par catégorie sur
   toute la période.
3. **Vue mensuelle** — tableau croisé catégories (lignes) × mois (colonnes),
   avec totaux par ligne, par colonne et total général.
4. **Virements** — liste des virements internes détectés, pour vérification.
5. **Non catégorisées** — liste des opérations que la banque n'a pas su
   classer, pour information (à corriger directement dans l'espace bancaire
   si besoin).

Un filtre **Monsieur / Madame / les deux** en haut de page s'applique à tous
les onglets.

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
├── index.html          5 onglets (Import, Tableau de bord, Vue mensuelle, Virements, Non catégorisées)
├── css/
│   └── style.css        Styles
├── js/
│   ├── storage.js       Persistance localStorage, dédoublonnage à l'import
│   ├── csvParser.js     Lecture et interprétation du CSV bancaire
│   ├── charts.js         Graphiques (Chart.js)
│   └── app.js             Logique applicative et rendu des 5 onglets
└── README.md
```

## Notes sur les données

Tout vit dans le `localStorage` du navigateur — rien n'est envoyé sur un
serveur. Vider le cache du site supprime les données. Pense à réimporter
tes relevés régulièrement plutôt que de compter sur une sauvegarde
automatique : il n'y a pas (encore) d'export de secours dans cette version.
