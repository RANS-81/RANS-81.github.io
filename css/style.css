/**
 * app.js
 * Logique applicative : import CSV (alimente directement le tableau de bord),
 * navigation par panneaux, calculs et rendu.
 */

const App = {
  state: null,
  filtrePersonne: 'tous', // 'tous' | 'monsieur' | 'madame'

  TITRES_PANEL: {
    dashboard: 'Tableau de bord',
    croise: 'Vue mensuelle',
    analyses: 'Analyses',
    virements: 'Virements',
    noncat: 'À catégoriser',
    import: 'Importer un relevé',
  },

  init() {
    this.state = Store.load();
    this.bindEvents();
    this.renderAll();
  },

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  formatMontant(v) {
    return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  },

  formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },

  escape(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  },

  labelPersonne(p) {
    return p === 'monsieur' ? 'Monsieur' : p === 'madame' ? 'Madame' : '—';
  },

  transactionsNormales() {
    let txns = this.state.transactions.filter(t => t.statut === 'normale');
    if (this.filtrePersonne !== 'tous') txns = txns.filter(t => t.personne === this.filtrePersonne);
    return txns;
  },

  toast(message, type = 'succes') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
  },

  // ---------------------------------------------------------------------
  // Rendu général
  // ---------------------------------------------------------------------

  renderAll() {
    this.renderImportHistorique();
    this.renderDashboard();
    this.renderTableauCroise();
    this.renderAnalyses();
    this.renderVirements();
    this.renderNonCategorisees();
    this.renderBadges();
  },

  renderBadges() {
    const nbVir = this.state.transactions.filter(t => t.statut === 'virement_interne').length;
    const nbNc = this.state.transactions.filter(t => t.statut === 'non_categorisee').length;
    document.getElementById('badge-virements').textContent = nbVir;
    document.getElementById('badge-virements').classList.toggle('cache', nbVir === 0);
    document.getElementById('badge-noncat').textContent = nbNc;
    document.getElementById('badge-noncat').classList.toggle('cache', nbNc === 0);
  },

  // ---------------------------------------------------------------------
  // Import — directement intégré, pas d'étape de confirmation séparée
  // ---------------------------------------------------------------------

  renderImportHistorique() {
    const el = document.getElementById('import-historique');
    const imports = [...this.state.imports].sort((a, b) => b.date - a.date);
    if (imports.length === 0) {
      el.innerHTML = '<p class="vide">Aucun import effectué pour le moment.</p>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fichier</th><th>Personne</th><th>Lignes</th><th>Ajoutées</th><th>Doublons ignorés</th><th>Date d'import</th></tr></thead>
          <tbody>
            ${imports.map(imp => `
              <tr>
                <td class="mono">${this.escape(imp.nomFichier)}</td>
                <td>${this.labelPersonne(imp.personne)}</td>
                <td class="mono">${imp.nbLignes}</td>
                <td class="mono pos">${imp.nbAjoutees}</td>
                <td class="mono">${imp.nbDoublons}</td>
                <td class="mono">${new Date(imp.date).toLocaleString('fr-FR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async onFichierChoisi(file, personne) {
    const zoneStatut = document.getElementById('import-statut');
    zoneStatut.innerHTML = `<div class="alerte-bloc succes"><strong>Lecture du fichier…</strong><p>${this.escape(file.name)}</p></div>`;

    try {
      const resultat = await CsvParser.parseFichier(file);

      if (resultat.colonnesManquantes.length > 0) {
        zoneStatut.innerHTML = `
          <div class="alerte-bloc erreur">
            <strong>Format de fichier non reconnu</strong>
            <p>Colonnes manquantes : ${resultat.colonnesManquantes.map(c => `<code>${this.escape(c)}</code>`).join(', ')}. Vérifie qu'il s'agit d'un export CSV bancaire avec séparateur « ; ».</p>
          </div>`;
        return;
      }

      if (resultat.transactions.length === 0) {
        zoneStatut.innerHTML = `<div class="alerte-bloc erreur"><strong>Aucune transaction lisible</strong><p>Le fichier ne contient aucune ligne exploitable.</p></div>`;
        return;
      }

      // Import direct : pas d'étape de confirmation manuelle, on alimente le tableau de bord tout de suite
      const { ajoutees, doublons } = Store.importerTransactions(file.name, personne, resultat.transactions);
      this.state = Store.getState();

      const message = doublons > 0
        ? `${ajoutees} transaction(s) ajoutée(s) · ${doublons} doublon(s) déjà connus ignoré(s)`
        : `${ajoutees} transaction(s) ajoutée(s) avec succès`;

      zoneStatut.innerHTML = `<div class="alerte-bloc succes"><strong>Import réussi — ${this.labelPersonne(personne)}</strong><p>${message}</p></div>`;

      this.renderAll();
      this.toast(`${ajoutees} transaction(s) importée(s) pour ${this.labelPersonne(personne).toLowerCase()}`);

      // Bascule automatique vers le tableau de bord pour voir le résultat immédiatement
      setTimeout(() => this.allerVersPanel('dashboard'), 700);

    } catch (e) {
      zoneStatut.innerHTML = `<div class="alerte-bloc erreur"><strong>Erreur de lecture</strong><p>${this.escape(e.message)}</p></div>`;
    }
  },

  // ---------------------------------------------------------------------
  // Tableau de bord
  // ---------------------------------------------------------------------

  moisDisponibles(txns) {
    const set = new Set(txns.map(t => t.date.slice(0, 7)));
    return [...set].sort();
  },

  renderDashboard() {
    const txns = this.transactionsNormales().filter(t => t.sens === 'debit');

    const mois = this.moisDisponibles(txns);
    const categories = [...new Set(txns.map(t => t.categorie))].sort();

    const matrice = {};
    categories.forEach(c => matrice[c] = {});
    txns.forEach(t => {
      matrice[t.categorie][t.date.slice(0, 7)] = (matrice[t.categorie][t.date.slice(0, 7)] || 0) + t.montant;
    });

    const totauxCategorie = {};
    categories.forEach(c => {
      totauxCategorie[c] = Object.values(matrice[c]).reduce((s, v) => s + v, 0);
    });

    const totalDepenses = Object.values(totauxCategorie).reduce((s, v) => s + v, 0);
    const revenus = this.transactionsNormales().filter(t => t.sens === 'credit').reduce((s, t) => s + t.montant, 0);

    document.getElementById('dash-revenus').textContent = this.formatMontant(revenus);
    document.getElementById('dash-depenses').textContent = this.formatMontant(totalDepenses);
    const net = revenus - totalDepenses;
    document.getElementById('dash-net').textContent = this.formatMontant(net);
    document.getElementById('dash-nb-mois').textContent = mois.length;

    const aDesDonnees = this.state.transactions.length > 0;
    document.getElementById('dashboard-vide').classList.toggle('cache', aDesDonnees);
    document.getElementById('dashboard-contenu').classList.toggle('cache', !aDesDonnees);

    if (!aDesDonnees) return;

    ChartsModule.renderParMois('chart-par-mois', mois, categories, matrice);
    ChartsModule.renderParCategorie('chart-par-categorie', totauxCategorie);
  },

  // ---------------------------------------------------------------------
  // Analyses — graphique linéaire par catégorie
  // ---------------------------------------------------------------------

  renderAnalyses() {
    const txns = this.transactionsNormales().filter(t => t.sens === 'debit');
    const aDesDonnees = txns.length > 0;
    document.getElementById('analyses-vide')?.classList.toggle('cache', aDesDonnees);
    document.getElementById('analyses-contenu')?.classList.toggle('cache', !aDesDonnees);
    if (!aDesDonnees) return;

    const mois = this.moisDisponibles(txns);
    const categories = [...new Set(txns.map(t => t.categorie))].sort();

    const matrice = {};
    categories.forEach(c => matrice[c] = {});
    txns.forEach(t => {
      const m = t.date.slice(0, 7);
      matrice[t.categorie][m] = (matrice[t.categorie][m] || 0) + t.montant;
    });

    ChartsModule.renderMiniLignes('analyses-graphiques', mois, categories, matrice);

    // Tableau récapitulatif : total, moyenne, max par catégorie
    const totaux = categories.map(cat => {
      const vals = mois.map(m => matrice[cat][m] || 0);
      const total = vals.reduce((s, v) => s + v, 0);
      const moisActifs = vals.filter(v => v > 0).length;
      const moyenne = moisActifs > 0 ? total / moisActifs : 0;
      const max = Math.max(...vals);
      return { cat, total, moyenne, max };
    }).sort((a, b) => b.total - a.total);

    const recap = document.getElementById('analyses-recap');
    if (!recap) return;
    recap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Catégorie</th><th class="mono al-droite">Total</th><th class="mono al-droite">Moy./mois actif</th><th class="mono al-droite">Mois max</th></tr></thead>
          <tbody>
            ${totaux.map(({ cat, total, moyenne, max }) => `
              <tr>
                <td><span class="dot" style="background:${ChartsModule.couleurPour(cat, 0)}"></span>${this.escape(cat)}</td>
                <td class="mono al-droite neg">${this.formatMontant(total)}</td>
                <td class="mono al-droite">${this.formatMontant(moyenne)}</td>
                <td class="mono al-droite">${this.formatMontant(max)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ---------------------------------------------------------------------
  // Vue mensuelle (tableau croisé)
  // ---------------------------------------------------------------------

  renderTableauCroise() {
    const txns = this.transactionsNormales().filter(t => t.sens === 'debit');
    const el = document.getElementById('tableau-croise');

    if (txns.length === 0) {
      el.innerHTML = '<p class="vide">Aucune dépense catégorisée pour le moment. Importe un relevé pour commencer.</p>';
      return;
    }

    const mois = this.moisDisponibles(txns);
    const categories = [...new Set(txns.map(t => t.categorie))].sort();

    const matrice = {};
    categories.forEach(c => matrice[c] = {});
    txns.forEach(t => {
      const m = t.date.slice(0, 7);
      matrice[t.categorie][m] = (matrice[t.categorie][m] || 0) + t.montant;
    });

    const totalParMois = {};
    mois.forEach(m => {
      totalParMois[m] = categories.reduce((s, c) => s + (matrice[c][m] || 0), 0);
    });
    const totalGeneral = Object.values(totalParMois).reduce((s, v) => s + v, 0);

    let html = '<div class="table-wrap"><table class="table-croisee"><thead><tr><th>Catégorie</th>';
    mois.forEach(m => html += `<th class="mono">${ChartsModule.libelleMoisCourt(m)}</th>`);
    html += '<th class="mono total-col">Total</th></tr></thead><tbody>';

    categories.forEach(cat => {
      const totalLigne = mois.reduce((s, m) => s + (matrice[cat][m] || 0), 0);
      html += `<tr><td><span class="dot" style="background:${ChartsModule.couleurPour(cat, 0)}"></span>${this.escape(cat)}</td>`;
      mois.forEach(m => {
        const v = matrice[cat][m] || 0;
        html += `<td class="mono ${v === 0 ? 'cellule-vide' : ''}">${v === 0 ? '—' : this.formatMontant(v)}</td>`;
      });
      html += `<td class="mono total-col">${this.formatMontant(totalLigne)}</td></tr>`;
    });

    html += `<tr class="ligne-total"><td>Total</td>`;
    mois.forEach(m => html += `<td class="mono">${this.formatMontant(totalParMois[m])}</td>`);
    html += `<td class="mono total-col">${this.formatMontant(totalGeneral)}</td></tr>`;
    html += '</tbody></table></div>';

    el.innerHTML = html;

    // Afficher le bouton d'export
    document.getElementById('btn-export-croise')?.classList.remove('cache');

    // Stocker les données pour l'export (remplacées à chaque render)
    this._croiseData = { mois, categories, matrice, totalParMois, totalGeneral };
  },

  exportCroiseCSV() {
    const { mois, categories, matrice, totalParMois, totalGeneral } = this._croiseData || {};
    if (!mois) return;

    const sep = ';';
    const num = v => v.toFixed(2).replace('.', ','); // format décimal français
    const lignes = [];

    // En-tête
    lignes.push(['Catégorie', ...mois.map(m => ChartsModule.libelleMoisCourt(m)), 'Total'].join(sep));

    // Lignes catégories
    categories.forEach(cat => {
      const totalLigne = mois.reduce((s, m) => s + (matrice[cat][m] || 0), 0);
      lignes.push([cat, ...mois.map(m => num(matrice[cat][m] || 0)), num(totalLigne)].join(sep));
    });

    // Ligne totaux
    lignes.push(['Total', ...mois.map(m => num(totalParMois[m])), num(totalGeneral)].join(sep));

    const bom = '﻿'; // BOM UTF-8 pour Excel
    const blob = new Blob([bom + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-vue-mensuelle-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ---------------------------------------------------------------------
  // Virements internes
  // ---------------------------------------------------------------------

  renderVirements() {
    const el = document.getElementById('virements-corps');
    let txns = this.state.transactions.filter(t => t.statut === 'virement_interne');
    if (this.filtrePersonne !== 'tous') txns = txns.filter(t => t.personne === this.filtrePersonne);
    txns = [...txns].sort((a, b) => b.date.localeCompare(a.date));

    if (txns.length === 0) {
      el.innerHTML = '<tr><td colspan="5" class="vide">Aucun virement interne détecté.</td></tr>';
      return;
    }

    el.innerHTML = txns.map(t => `
      <tr>
        <td class="mono">${this.formatDate(t.date)}</td>
        <td>${this.escape(t.libelle)}</td>
        <td>${this.labelPersonne(t.personne)}</td>
        <td class="mono">${this.escape(t.sousCategorie)}</td>
        <td class="mono montant ${t.sens === 'credit' ? 'pos' : 'neg'}">${t.sens === 'credit' ? '+' : '−'}${this.formatMontant(t.montant).replace('-', '')}</td>
      </tr>
    `).join('');
  },

  // ---------------------------------------------------------------------
  // Non catégorisées
  // ---------------------------------------------------------------------

  renderNonCategorisees() {
    const el = document.getElementById('noncat-corps');
    let txns = this.state.transactions.filter(t => t.statut === 'non_categorisee');
    if (this.filtrePersonne !== 'tous') txns = txns.filter(t => t.personne === this.filtrePersonne);
    txns = [...txns].sort((a, b) => b.date.localeCompare(a.date));

    if (txns.length === 0) {
      el.innerHTML = '<tr><td colspan="5" class="vide">Aucune transaction à catégoriser.</td></tr>';
      return;
    }

    el.innerHTML = txns.map(t => `
      <tr>
        <td class="mono">${this.formatDate(t.date)}</td>
        <td>${this.escape(t.libelle)}</td>
        <td>${this.labelPersonne(t.personne)}</td>
        <td class="mono">${this.escape(t.sousCategorie)}</td>
        <td class="mono montant ${t.sens === 'credit' ? 'pos' : 'neg'}">${t.sens === 'credit' ? '+' : '−'}${this.formatMontant(t.montant).replace('-', '')}</td>
      </tr>
    `).join('');
  },

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------

  allerVersPanel(panel) {
    document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
      item.classList.toggle('active', item.dataset.panel === panel);
    });
    document.querySelectorAll('.panel-principal').forEach(p => {
      p.classList.toggle('active', p.id === 'panel-' + panel);
    });
    document.getElementById('topbar-titre').textContent = this.TITRES_PANEL[panel] || '';
  },

  // ---------------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------------

  bindEvents() {
    document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
      item.addEventListener('click', () => this.allerVersPanel(item.dataset.panel));
    });

    document.getElementById('btn-importer-topbar').addEventListener('click', () => this.allerVersPanel('import'));
    document.getElementById('btn-importer-vide').addEventListener('click', () => this.allerVersPanel('import'));
    document.getElementById('btn-importer-analyses')?.addEventListener('click', () => this.allerVersPanel('import'));
    document.getElementById('btn-export-croise')?.addEventListener('click', () => this.exportCroiseCSV());

    document.querySelectorAll('#filtre-personne .segmente__item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#filtre-personne .segmente__item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filtrePersonne = btn.dataset.valeur;
        this.renderAll();
      });
    });

    document.getElementById('input-csv-monsieur').addEventListener('change', (e) => {
      if (e.target.files[0]) this.onFichierChoisi(e.target.files[0], 'monsieur');
    });
    document.getElementById('input-csv-madame').addEventListener('change', (e) => {
      if (e.target.files[0]) this.onFichierChoisi(e.target.files[0], 'madame');
    });

    // Glisser-déposer sur les zones d'upload
    [['input-csv-monsieur', 'monsieur'], ['input-csv-madame', 'madame']].forEach(([inputId, personne]) => {
      const input = document.getElementById(inputId);
      const zone = input.closest('.import-carte').querySelector('.zone-upload');
      ['dragover', 'dragleave', 'drop'].forEach(evt => {
        zone.addEventListener(evt, (e) => e.preventDefault());
      });
      zone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) this.onFichierChoisi(file, personne);
      });
    });

    document.getElementById('btn-reset').addEventListener('click', () => this.confirmerReset());
  },

  confirmerReset() {
    if (!confirm('Cela supprime définitivement toutes les transactions importées. Continuer ?')) return;
    Store.resetAll();
    this.state = Store.getState();
    this.renderAll();
    this.toast('Toutes les données ont été effacées.');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
