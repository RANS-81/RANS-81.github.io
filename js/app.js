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
    assistant: 'Assistant IA',
    virements: 'Virements',
    noncat: 'À catégoriser',
    import: 'Importer un relevé',
  },

  async init() {
    this.state = await Store.load();
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
      const { ajoutees, doublons } = await Store.importerTransactions(file.name, personne, resultat.transactions);
      this.state = await Store.load();

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
    const allTxns = this.transactionsNormales();
    const depenses = allTxns.filter(t => t.sens === 'debit');
    const credits = allTxns.filter(t => t.sens === 'credit');

    // Matrice dépenses
    const mois = this.moisDisponibles(depenses);
    const categories = [...new Set(depenses.map(t => t.categorie))].sort();
    const matrice = {};
    categories.forEach(c => matrice[c] = {});
    depenses.forEach(t => {
      const m = t.date.slice(0, 7);
      matrice[t.categorie][m] = (matrice[t.categorie][m] || 0) + t.montant;
    });
    const totauxCategorie = {};
    categories.forEach(c => {
      totauxCategorie[c] = Object.values(matrice[c]).reduce((s, v) => s + v, 0);
    });

    // Matrice revenus
    const moisRev = this.moisDisponibles(credits);
    const catsRev = [...new Set(credits.map(t => t.categorie))].sort();
    const matriceRev = {};
    catsRev.forEach(c => matriceRev[c] = {});
    credits.forEach(t => {
      const m = t.date.slice(0, 7);
      matriceRev[t.categorie][m] = (matriceRev[t.categorie][m] || 0) + t.montant;
    });
    const totauxRev = {};
    catsRev.forEach(c => {
      totauxRev[c] = Object.values(matriceRev[c]).reduce((s, v) => s + v, 0);
    });

    const totalDepenses = Object.values(totauxCategorie).reduce((s, v) => s + v, 0);
    const totalRevenus = Object.values(totauxRev).reduce((s, v) => s + v, 0);

    document.getElementById('dash-revenus').textContent = this.formatMontant(totalRevenus);
    document.getElementById('dash-depenses').textContent = this.formatMontant(totalDepenses);
    document.getElementById('dash-net').textContent = this.formatMontant(totalRevenus - totalDepenses);
    document.getElementById('dash-nb-mois').textContent = Math.max(mois.length, moisRev.length);

    const aDesDonnees = this.state.transactions.length > 0;
    document.getElementById('dashboard-vide').classList.toggle('cache', aDesDonnees);
    document.getElementById('dashboard-contenu').classList.toggle('cache', !aDesDonnees);

    if (!aDesDonnees) return;

    // Graphiques dépenses avec onClick → détail transactions
    ChartsModule.renderParMois('chart-par-mois', mois, categories, matrice, (cat, moisLabel) => {
      const txns = depenses.filter(t => t.categorie === cat && t.date.slice(0, 7) === moisLabel);
      this.ouvrirModal(`${cat} — ${ChartsModule.libelleMoisCourt(moisLabel)}`, txns);
    });
    ChartsModule.renderParCategorie('chart-par-categorie', totauxCategorie, (cat) => {
      const txns = depenses.filter(t => t.categorie === cat);
      this.ouvrirModal(cat, txns);
    });

    // Graphiques revenus avec onClick → détail transactions
    ChartsModule.renderParMois('chart-revenus-mois', moisRev, catsRev, matriceRev, (cat, moisLabel) => {
      const txns = credits.filter(t => t.categorie === cat && t.date.slice(0, 7) === moisLabel);
      this.ouvrirModal(`${cat} — ${ChartsModule.libelleMoisCourt(moisLabel)}`, txns);
    });
    ChartsModule.renderParCategorie('chart-revenus-categorie', totauxRev, (cat) => {
      const txns = credits.filter(t => t.categorie === cat);
      this.ouvrirModal(cat, txns);
    });

    this.renderBilanAnnuel();
  },

  ouvrirModal(titre, txns) {
    document.getElementById('modal-titre').textContent = titre;
    const corps = document.getElementById('modal-corps');
    if (txns.length === 0) {
      corps.innerHTML = '<p class="vide">Aucune transaction.</p>';
    } else {
      corps.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Libellé</th><th>Personne</th><th class="al-droite mono">Montant</th></tr></thead>
            <tbody>
              ${[...txns].sort((a, b) => b.date.localeCompare(a.date)).map(t => `
                <tr>
                  <td class="mono">${this.formatDate(t.date)}</td>
                  <td>${this.escape(t.libelle)}</td>
                  <td>${this.labelPersonne(t.personne)}</td>
                  <td class="mono al-droite ${t.sens === 'credit' ? 'pos' : 'neg'}">${this.formatMontant(t.montant)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }
    document.getElementById('modal-detail').classList.remove('cache');
  },

  renderBilanAnnuel() {
    const el = document.getElementById('dash-bilan-annuel');
    if (!el) return;
    const txns = this.transactionsNormales();
    if (txns.length === 0) { el.innerHTML = ''; return; }

    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    // Construire une map { année: { mois (0-11): { rev, dep } } }
    const data = {};
    txns.forEach(t => {
      const d = new Date(t.date);
      const an = d.getFullYear();
      const mo = d.getMonth();
      if (!data[an]) data[an] = {};
      if (!data[an][mo]) data[an][mo] = { rev: 0, dep: 0 };
      if (t.sens === 'credit') data[an][mo].rev += t.montant;
      else data[an][mo].dep += t.montant;
    });

    const annees = Object.keys(data).map(Number).sort();

    let html = '<table class="table-bilan"><thead><tr><th>Année</th>';
    MOIS.forEach(m => html += `<th class="mono">${m}</th>`);
    html += '<th class="mono total-col">Total</th></tr></thead><tbody>';

    annees.forEach(an => {
      let totalAn = 0;
      html += `<tr><td><b>${an}</b></td>`;
      for (let mo = 0; mo < 12; mo++) {
        const cell = data[an][mo];
        if (!cell) {
          html += '<td class="mono cellule-vide">—</td>';
        } else {
          const net = cell.rev - cell.dep;
          totalAn += net;
          html += `<td class="mono ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${this.formatMontant(Math.abs(net)).replace(' €','')}</td>`;
        }
      }
      html += `<td class="mono total-col ${totalAn >= 0 ? 'pos' : 'neg'}">${totalAn >= 0 ? '+' : ''}${this.formatMontant(Math.abs(totalAn))}</td></tr>`;
    });

    html += '</tbody></table>';
    el.innerHTML = html;
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
    this.initAssistant();

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

    document.getElementById('modal-fermer')?.addEventListener('click', () =>
      document.getElementById('modal-detail').classList.add('cache'));
    document.getElementById('modal-detail')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) document.getElementById('modal-detail').classList.add('cache');
    });
  },

  async confirmerReset() {
    if (!confirm('Cela supprime définitivement toutes les transactions importées. Continuer ?')) return;
    await Store.resetAll();
    this.state = Store.getState();
    this.renderAll();
    this.toast('Toutes les données ont été effacées.');
  },

  // ---------------------------------------------------------------------
  // Assistant IA — générateur de prompt contextuel
  // ---------------------------------------------------------------------

  SUGGESTIONS: [
    'Quelles catégories ont le plus augmenté ces 3 derniers mois ?',
    'Quel est mon taux d\'épargne moyen sur la période ?',
    'Quels mois ont un solde négatif et pourquoi ?',
    'Quelles dépenses pourrais-je réduire pour améliorer mon solde ?',
    'Compare mes revenus et dépenses par trimestre.',
  ],

  initAssistant() {
    const chips = document.getElementById('assistant-chips');
    if (!chips) return;
    chips.innerHTML = this.SUGGESTIONS.map(s =>
      `<button class="assistant-chip">${s}</button>`
    ).join('');
    chips.querySelectorAll('.assistant-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('assistant-question').value = btn.textContent;
      });
    });
    document.getElementById('btn-assistant-copier')?.addEventListener('click', () => this.copierPrompt());
  },

  construireContexte() {
    const txns = this.transactionsNormales();
    if (txns.length === 0) return '(Aucune donnée disponible)';

    const dep = txns.filter(t => t.sens === 'debit');
    const rev = txns.filter(t => t.sens === 'credit');

    const totalDep = dep.reduce((s, t) => s + t.montant, 0);
    const totalRev = rev.reduce((s, t) => s + t.montant, 0);
    const mois = this.moisDisponibles(dep.concat(rev));

    // Totaux par catégorie de dépenses
    const parCat = {};
    dep.forEach(t => { parCat[t.categorie] = (parCat[t.categorie] || 0) + t.montant; });
    const lignesCat = Object.entries(parCat)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `  - ${c} : ${this.formatMontant(v)}`)
      .join('\n');

    // Bilan mensuel
    const bilanMois = {};
    txns.forEach(t => {
      const m = t.date.slice(0, 7);
      if (!bilanMois[m]) bilanMois[m] = { rev: 0, dep: 0 };
      if (t.sens === 'credit') bilanMois[m].rev += t.montant;
      else bilanMois[m].dep += t.montant;
    });
    const lignesMois = mois.map(m => {
      const b = bilanMois[m] || { rev: 0, dep: 0 };
      const net = b.rev - b.dep;
      return `  - ${ChartsModule.libelleMoisCourt(m)} : revenus ${this.formatMontant(b.rev)}, dépenses ${this.formatMontant(b.dep)}, solde ${net >= 0 ? '+' : ''}${this.formatMontant(Math.abs(net))}`;
    }).join('\n');

    return `## Données financières du foyer (période : ${ChartsModule.libelleMoisCourt(mois[0])} → ${ChartsModule.libelleMoisCourt(mois[mois.length - 1])})

### Résumé global
- Revenus totaux : ${this.formatMontant(totalRev)}
- Dépenses totales : ${this.formatMontant(totalDep)}
- Solde net : ${this.formatMontant(totalRev - totalDep)}
- Nombre de mois : ${mois.length}
- Filtre actif : ${this.filtrePersonne === 'tous' ? 'Tous (foyer complet)' : this.filtrePersonne}

### Dépenses par catégorie
${lignesCat}

### Bilan mensuel
${lignesMois}`;
  },

  copierPrompt() {
    const question = document.getElementById('assistant-question')?.value.trim();
    const contexte = this.construireContexte();
    const prompt = question
      ? `${question}\n\n---\n${contexte}`
      : contexte;

    // Afficher aperçu
    const apercu = document.getElementById('assistant-apercu');
    const apercuWrap = document.getElementById('assistant-apercu-wrap');
    if (apercu) apercu.textContent = prompt;
    apercuWrap?.classList.remove('cache');

    navigator.clipboard.writeText(prompt).then(() => {
      const ok = document.getElementById('assistant-copie-ok');
      ok?.classList.remove('cache');
      setTimeout(() => ok?.classList.add('cache'), 3000);
    }).catch(() => {
      this.toast('Copie automatique non disponible — sélectionne le texte manuellement.', 'erreur');
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(e => {
    document.body.insertAdjacentHTML('afterbegin',
      `<div style="background:#fde;border:2px solid #c00;padding:1rem 1.5rem;font-family:monospace;font-size:13px;position:fixed;top:0;left:0;right:0;z-index:9999">
        <b>Erreur JS :</b> ${e.message}<br><small>${e.stack?.split('\n')[1] || ''}</small>
      </div>`);
  });
});

window.addEventListener('error', (e) => {
  document.body.insertAdjacentHTML('afterbegin',
    `<div style="background:#fde;border:2px solid #c00;padding:1rem 1.5rem;font-family:monospace;font-size:13px;position:fixed;top:0;left:0;right:0;z-index:9999">
      <b>Erreur :</b> ${e.message} — ${e.filename?.split('/').pop()}:${e.lineno}
    </div>`);
});
