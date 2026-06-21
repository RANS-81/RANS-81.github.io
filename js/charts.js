/* =========================================================================
   Pulse — budget du foyer
   Direction : fintech sobre. Fond gris-bleu très clair, cartes blanches
   arrondies avec ombre douce, accent indigo, vert/rouge réservés aux
   montants. Typographie Inter, une seule famille pour tout — display,
   corps de texte et chiffres — avec des poids contrastés.
   ========================================================================= */

:root {
  --fond: #F6F7FB;
  --carte: #FFFFFF;
  --bordure: #E7E9F1;
  --bordure-forte: #D7DAE6;

  --texte: #15182B;
  --texte-att: #6B7088;
  --texte-faible: #9499AD;

  --accent: #5B5FEF;
  --accent-fonce: #4144C4;
  --accent-fond: #EEEEFD;

  --vert: #12A35E;
  --vert-fond: #E9F9F1;
  --rouge: #E5484D;
  --rouge-fond: #FDEEEE;

  --rayon-s: 8px;
  --rayon: 12px;
  --rayon-l: 16px;
  --ombre: 0 1px 2px rgba(21, 24, 43, 0.04), 0 1px 1px rgba(21, 24, 43, 0.03);
  --ombre-hover: 0 4px 16px rgba(21, 24, 43, 0.08);

  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--fond);
  color: var(--texte);
  font-family: var(--font);
  font-size: 14.5px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

::selection { background: var(--accent-fond); color: var(--accent-fonce); }

.mono { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
.vide { color: var(--texte-att); padding: 1.2em 0; }
.pos { color: var(--vert); }
.neg { color: var(--rouge); }
.cache { display: none !important; }
.al-droite { text-align: right; }

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.55em; flex-shrink: 0; }

button { font-family: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- Layout général ---------- */

.shell {
  display: flex;
  min-height: 100vh;
}

/* ---------- Sidebar ---------- */

.sidebar {
  width: 232px;
  flex-shrink: 0;
  background: var(--carte);
  border-right: 1px solid var(--bordure);
  display: flex;
  flex-direction: column;
  padding: 1.4em 1em;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.65em;
  padding: 0.4em 0.6em 1.6em;
}
.sidebar__mark {
  width: 30px; height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--accent), #8B8EF5);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
}
.sidebar__nom {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 0.2em;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.7em;
  background: none;
  border: none;
  border-radius: var(--rayon-s);
  padding: 0.6em 0.7em;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--texte-att);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s ease, color 0.12s ease;
}
.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }
.nav-item:hover { background: var(--fond); color: var(--texte); }
.nav-item.active { background: var(--accent-fond); color: var(--accent-fonce); font-weight: 600; }

.nav-badge {
  margin-left: auto;
  background: var(--rouge);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1em 0.5em;
  border-radius: 999px;
  line-height: 1.5;
}
.nav-item.active .nav-badge { background: var(--accent); }

.sidebar__bas {
  border-top: 1px solid var(--bordure);
  padding-top: 0.6em;
}
.nav-item--danger:hover { background: var(--rouge-fond); color: var(--rouge); }

/* ---------- Zone principale ---------- */

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.3em 2em;
  border-bottom: 1px solid var(--bordure);
  background: var(--carte);
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar__titre {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.topbar__droite {
  display: flex;
  align-items: center;
  gap: 0.9em;
}

.segmente {
  display: flex;
  background: var(--fond);
  border-radius: var(--rayon-s);
  padding: 3px;
  gap: 2px;
}
.segmente__item {
  background: none;
  border: none;
  padding: 0.4em 0.85em;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--texte-att);
  border-radius: 6px;
  cursor: pointer;
}
.segmente__item.active { background: var(--carte); color: var(--texte); box-shadow: var(--ombre); }

.btn-accent {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--rayon-s);
  padding: 0.62em 1.1em;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.08s ease;
}
.btn-accent svg { width: 16px; height: 16px; }
.btn-accent:hover { background: var(--accent-fonce); }
.btn-accent:active { transform: scale(0.98); }

.contenu {
  padding: 2em;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
}

.panel-principal { display: none; }
.panel-principal.active { display: block; animation: apparition 0.18s ease; }

@keyframes apparition {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- État vide ---------- */

.etat-vide {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 5em 2em;
  background: var(--carte);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-l);
}
.etat-vide__icone {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--accent-fond);
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1.2em;
}
.etat-vide__icone svg { width: 36px; height: 36px; }
.etat-vide h2 { font-size: 1.15rem; margin: 0 0 0.4em; }
.etat-vide p { color: var(--texte-att); margin: 0 0 1.6em; max-width: 360px; }

/* ---------- KPI ---------- */

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1em;
  margin-bottom: 1.6em;
}
@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

.kpi-carte {
  background: var(--carte);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon);
  padding: 1.2em 1.3em;
  box-shadow: var(--ombre);
}
.kpi-carte--accent { background: var(--accent); border-color: var(--accent); }
.kpi-carte--accent .kpi-carte__label { color: rgba(255,255,255,0.75); }
.kpi-carte--accent .kpi-carte__valeur { color: #fff; }

.kpi-carte__label {
  display: block;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--texte-att);
  margin-bottom: 0.5em;
}
.kpi-carte__valeur {
  display: block;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

/* ---------- Cartes / graphiques ---------- */

.grille-graphiques {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.2em;
}
@media (max-width: 1000px) { .grille-graphiques { grid-template-columns: 1fr; } }

.carte {
  background: var(--carte);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon);
  box-shadow: var(--ombre);
  margin-bottom: 1.2em;
}
.carte:last-child { margin-bottom: 0; }
.carte__entete { padding: 1.3em 1.4em 0.2em; }
.carte__entete h3 { margin: 0 0 0.2em; font-size: 1rem; font-weight: 700; }
.carte__entete p { margin: 0; font-size: 0.82rem; color: var(--texte-att); }
.carte__corps { padding: 1.2em 1.4em 1.4em; }

.chart-zone { height: 320px; }
.chart-zone--tall { height: 460px; }

/* Grille de mini-graphiques (panel Analyses) */
#analyses-graphiques {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  padding: 0.25rem 0 0.5rem;
}
.mini-chart-carte {
  background: var(--fond);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon);
  padding: 0.85rem 1rem 0.75rem;
}
.mini-chart-titre {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--texte);
  margin-bottom: 0.65rem;
}
.mini-chart-zone { height: 140px; }

/* ---------- Tableaux ---------- */

.table-wrap { overflow-x: auto; padding: 0 !important; }
table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
thead th {
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--texte-att);
  padding: 0.85em 1.4em;
  border-bottom: 1px solid var(--bordure);
  white-space: nowrap;
}
tbody td {
  padding: 0.75em 1.4em;
  border-bottom: 1px solid var(--bordure);
  vertical-align: middle;
}
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: var(--fond); }
td.montant { text-align: right; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }

.tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.25em 0.65em;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tag-color, #999) 12%, white);
  color: var(--tag-color, #555);
}

/* ---------- Tableau croisé ---------- */

.table-croisee th, .table-croisee td { text-align: right; }
.table-croisee th:first-child, .table-croisee td:first-child { text-align: left; }
.table-croisee .total-col { border-left: 2px solid var(--bordure); font-weight: 700; }
.table-croisee .cellule-vide { color: var(--bordure-forte); }
.table-croisee .ligne-total td {
  font-weight: 800;
  background: var(--fond);
  border-top: 2px solid var(--texte);
}

/* ---------- Onglet Import ---------- */

.import-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2em;
  margin-bottom: 1.2em;
}
@media (max-width: 760px) { .import-grid { grid-template-columns: 1fr; } }

.import-carte { padding: 1.4em; }
.import-carte__entete {
  display: flex;
  align-items: center;
  gap: 0.8em;
  margin-bottom: 1.2em;
}
.import-carte__avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
  flex-shrink: 0;
}
.import-carte[data-personne-couleur="monsieur"] .import-carte__avatar { background: #4F6BFF; }
.import-carte[data-personne-couleur="madame"] .import-carte__avatar { background: #D6589F; }
.import-carte h3 { margin: 0; font-size: 0.98rem; font-weight: 700; }
.import-carte p { margin: 0.1em 0 0; font-size: 0.8rem; color: var(--texte-att); }

.zone-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5em;
  border: 1.5px dashed var(--bordure-forte);
  border-radius: var(--rayon);
  padding: 2.2em 1.2em;
  cursor: pointer;
  color: var(--texte-att);
  transition: border-color 0.12s ease, background 0.12s ease;
}
.zone-upload:hover { border-color: var(--accent); background: var(--accent-fond); color: var(--accent-fonce); }
.zone-upload svg { width: 30px; height: 30px; margin-bottom: 0.2em; }
.zone-upload__texte { font-size: 0.86rem; font-weight: 600; color: var(--texte); }
.zone-upload__precision { font-size: 0.76rem; color: var(--texte-faible); }

#import-statut:empty { display: none; }
#import-statut { margin-bottom: 1.2em; }

.alerte-bloc {
  border-radius: var(--rayon);
  padding: 1em 1.3em;
  font-size: 0.86rem;
  display: flex;
  align-items: flex-start;
  gap: 0.8em;
}
.alerte-bloc strong { display: block; margin-bottom: 0.15em; }
.alerte-bloc p { margin: 0; color: var(--texte-att); }
.alerte-bloc.erreur { background: var(--rouge-fond); color: var(--rouge); }
.alerte-bloc.erreur p { color: #b23a3e; }
.alerte-bloc.succes { background: var(--vert-fond); color: var(--vert); }
.alerte-bloc.succes p { color: #0c7a46; }

.nav-item--danger { color: var(--texte-att); }

/* ---------- Toast ---------- */

.toast {
  position: fixed;
  bottom: 1.6em;
  left: 50%;
  transform: translateX(-50%) translateY(120%);
  background: var(--texte);
  color: #fff;
  padding: 0.85em 1.4em;
  border-radius: var(--rayon-s);
  font-size: 0.86rem;
  font-weight: 500;
  box-shadow: var(--ombre-hover);
  z-index: 100;
  transition: transform 0.25s cubic-bezier(.2,.8,.3,1);
  display: flex;
  align-items: center;
  gap: 0.6em;
}
.toast.visible { transform: translateX(-50%) translateY(0); }
.toast strong { font-weight: 700; }

/* ---------- Accessibilité ---------- */

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}

/* ---------- Responsive ---------- */

@media (max-width: 880px) {
  .shell { flex-direction: column; }
  .sidebar { width: 100%; height: auto; position: relative; flex-direction: row; align-items: center; overflow-x: auto; }
  .sidebar__brand { padding: 0.4em 1em 0.4em 0.2em; }
  .sidebar__nav { flex-direction: row; flex: none; }
  .nav-item { white-space: nowrap; }
  .sidebar__bas { border-top: none; border-left: 1px solid var(--bordure); padding-top: 0; padding-left: 0.6em; margin-left: 0.4em; }
  .topbar { flex-direction: column; align-items: flex-start; gap: 0.8em; padding: 1em 1.2em; }
  .topbar__droite { width: 100%; justify-content: space-between; }
  .contenu { padding: 1.2em; }
}
