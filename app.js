/**
 * app.js
 * Logique applicative : import CSV, navigation par onglets, calculs et rendu.
 */

const App = {
  state: null,
  filtrePersonne: 'tous', // 'tous' | 'monsieur' | 'madame'
  fichierEnAttente: null, // {file, parseResult} avant validation de l'import

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

  // ---------------------------------------------------------------------
  // Rendu général
  // ---------------------------------------------------------------------

  renderAll() {
    this.renderFiltrePersonne();
    this.renderImportHistorique();
    this.renderDashboard();
    this.renderTableauCroise();
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

  renderFiltrePersonne() {
    const sel = document.getElementById('filtre-personne');
    sel.value = this.filtrePersonne;
  },

  // ---------------------------------------------------------------------
  // Onglet 1 — Import
  // ---------------------------------------------------------------------

  renderImportHistorique() {
    const el = document.getElementById('import-historique');
    const imports = [...this.state.imports].sort((a, b) => b.date - a.date);
    if (imports.length === 0) {
      el.innerHTML = '<p class="vide">Aucun import effectué pour le moment.</p>';
      return;
    }
    el.innerHTML = `
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
    `;
  },

  async onFichierChoisi(file, personne) {
    const zoneApercu = document.getElementById('import-apercu');
    zoneApercu.innerHTML = '<p class="vide">Lecture du fichier…</p>';
    try {
      const resultat = await CsvParser.parseFichier(file);

      if (resultat.colonnesManquantes.length > 0) {
        zoneApercu.innerHTML = `
          <div class="alerte-bloc">
            <strong>Format de fichier non reconnu.</strong>
            <p>Colonnes attendues manquantes : ${resultat.colonnesManquantes.map(c => `<code>${this.escape(c)}</code>`).join(', ')}.</p>
            <p>Vérifie qu'il s'agit bien d'un export CSV de relevé bancaire avec séparateur « ; ».</p>
          </div>`;
        this.fichierEnAttente = null;
        return;
      }

      this.fichierEnAttente = { file, personne, resultat };
      this.afficherApercuImport();
    } catch (e) {
      zoneApercu.innerHTML = `<div class="alerte-bloc"><strong>Erreur de lecture.</strong><p>${this.escape(e.message)}</p></div>`;
      this.fichierEnAttente = null;
    }
  },

  afficherApercuImport() {
    const { file, personne, resultat } = this.fichierEnAttente;
    const zoneApercu = document.getElementById('import-apercu');
    const { transactions, erreurs } = resultat;

    const parStatut = { normale: 0, virement_interne: 0, non_categorisee: 0 };
    transactions.forEach(t => parStatut[t.statut]++);

    const dates = transactions.map(t => t.date).sort();
    const periode = dates.length ? `${this.formatDate(dates[0])} → ${this.formatDate(dates[dates.length - 1])}` : '—';

    zoneApercu.innerHTML = `
      <div class="apercu-resume">
        <div><span class="apercu-resume__label">Fichier</span><span class="mono">${this.escape(file.name)}</span></div>
        <div><span class="apercu-resume__label">Personne</span><span>${this.labelPersonne(personne)}</span></div>
        <div><span class="apercu-resume__label">Période</span><span class="mono">${periode}</span></div>
        <div><span class="apercu-resume__label">Lignes lues</span><span class="mono">${transactions.length}</span></div>
        <div><span class="apercu-resume__label">Catégorisées</span><span class="mono pos">${parStatut.normale}</span></div>
        <div><span class="apercu-resume__label">Virements internes</span><span class="mono">${parStatut.virement_interne}</span></div>
        <div><span class="apercu-resume__label">Non catégorisées</span><span class="mono ${parStatut.non_categorisee ? 'neg' : ''}">${parStatut.non_categorisee}</span></div>
      </div>
      ${erreurs.length ? `<p class="avertissement">${erreurs.length} ligne(s) ignorée(s) (format imprévu).</p>` : ''}
      <div class="table-wrap apercu-table">
        <table>
          <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th style="text-align:right">Montant</th></tr></thead>
          <tbody>
            ${transactions.slice(0, 8).map(t => `
              <tr>
                <td class="mono">${this.formatDate(t.date)}</td>
                <td>${this.escape(t.libelle)}</td>
                <td><span class="tag" style="--tag-color:${ChartsModule.couleurPour(t.categorie, 0)}">${this.escape(t.categorie)}</span></td>
                <td class="mono montant ${t.sens === 'credit' ? 'pos' : 'neg'}">${t.sens === 'credit' ? '+' : '−'}${this.formatMontant(t.montant).replace('-', '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${transactions.length > 8 ? `<p class="apercu-plus">… et ${transactions.length - 8} autre(s) ligne(s).</p>` : ''}
      </div>
      <div class="modale-actions">
        <button type="button" class="btn-secondaire" id="btn-annuler-import">Annuler</button>
        <button type="button" class="btn-principal" id="btn-confirmer-import">Importer ${transactions.length} transaction(s)</button>
      </div>
    `;

    document.getElementById('btn-annuler-import').addEventListener('click', () => this.annulerImport());
    document.getElementById('btn-confirmer-import').addEventListener('click', () => this.confirmerImport());
  },

  annulerImport() {
    this.fichierEnAttente = null;
    document.getElementById('import-apercu').innerHTML = '';
    document.getElementById('input-csv-monsieur').value = '';
    document.getElementById('input-csv-madame').value = '';
  },

  confirmerImport() {
    if (!this.fichierEnAttente) return;
    const { file, personne, resultat } = this.fichierEnAttente;
    const { ajoutees, doublons } = Store.importerTransactions(file.name, personne, resultat.transactions);
    this.state = Store.getState();
    this.fichierEnAttente = null;
    document.getElementById('import-apercu').innerHTML = `
      <div class="alerte-bloc succes">
        <strong>Import terminé.</strong>
        <p>${ajoutees} transaction(s) ajoutée(s)${doublons ? `, ${doublons} doublon(s) ignoré(s)` : ''}.</p>
      </div>`;
    document.getElementById('input-csv-monsieur').value = '';
    document.getElementById('input-csv-madame').value = '';
    this.renderAll();
  },

  // ---------------------------------------------------------------------
  // Onglet 2 — Tableau de bord
  // ---------------------------------------------------------------------

  moisDisponibles(txns) {
    const set = new Set(txns.map(t => t.date.slice(0, 7)));
    return [...set].sort();
  },

  renderDashboard() {
    const txns = this.transactionsNormales().filter(t => t.sens === 'debit');

    const mois = this.moisDisponibles(txns);
    const categories = [...new Set(txns.map(t => t.categorie))].sort();

    // matrice categorie -> mois -> montant
    const matrice = {};
    categories.forEach(c => matrice[c] = {});
    txns.forEach(t => {
      matrice[t.categorie][t.date.slice(0, 7)] = (matrice[t.categorie][t.date.slice(0, 7)] || 0) + t.montant;
    });

    // totaux cumulés par catégorie
    const totauxCategorie = {};
    categories.forEach(c => {
      totauxCategorie[c] = Object.values(matrice[c]).reduce((s, v) => s + v, 0);
    });

    // résumé chiffré
    const totalDepenses = Object.values(totauxCategorie).reduce((s, v) => s + v, 0);
    const revenus = this.transactionsNormales().filter(t => t.sens === 'credit').reduce((s, t) => s + t.montant, 0);

    document.getElementById('dash-revenus').textContent = this.formatMontant(revenus);
    document.getElementById('dash-depenses').textContent = this.formatMontant(totalDepenses);
    const net = revenus - totalDepenses;
    const netEl = document.getElementById('dash-net');
    netEl.textContent = this.formatMontant(net);
    netEl.classList.toggle('neg', net < 0);
    netEl.classList.toggle('pos', net >= 0);
    document.getElementById('dash-nb-mois').textContent = mois.length;

    if (mois.length === 0) {
      document.getElementById('dashboard-vide').classList.remove('cache');
      document.getElementById('dashboard-contenu').classList.add('cache');
      return;
    }
    document.getElementById('dashboard-vide').classList.add('cache');
    document.getElementById('dashboard-contenu').classList.remove('cache');

    ChartsModule.renderParMois('chart-par-mois', mois, categories, matrice);
    ChartsModule.renderParCategorie('chart-par-categorie', totauxCategorie);
  },

  // ---------------------------------------------------------------------
  // Onglet 3 — Tableau croisé (catégories x mois)
  // ---------------------------------------------------------------------

  renderTableauCroise() {
    const txns = this.transactionsNormales().filter(t => t.sens === 'debit');
    const el = document.getElementById('tableau-croise');

    if (txns.length === 0) {
      el.innerHTML = '<p class="vide">Aucune dépense catégorisée pour le moment. Importe un relevé dans l\'onglet Import.</p>';
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
  },

  // ---------------------------------------------------------------------
  // Onglet 4 — Virements internes
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
  // Onglet 5 — Non catégorisées
  // ---------------------------------------------------------------------

  renderNonCategorisees() {
    const el = document.getElementById('noncat-corps');
    let txns = this.state.transactions.filter(t => t.statut === 'non_categorisee');
    if (this.filtrePersonne !== 'tous') txns = txns.filter(t => t.personne === this.filtrePersonne);
    txns = [...txns].sort((a, b) => b.date.localeCompare(a.date));

    if (txns.length === 0) {
      el.innerHTML = '<tr><td colspan="5" class="vide">Aucune transaction non catégorisée. 👍</td></tr>';
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
  // Événements
  // ---------------------------------------------------------------------

  bindEvents() {
    // Onglets
    document.querySelectorAll('.tab-principal').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-principal').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-principal').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
      });
    });

    document.getElementById('filtre-personne').addEventListener('change', (e) => {
      this.filtrePersonne = e.target.value;
      this.renderAll();
    });

    document.getElementById('input-csv-monsieur').addEventListener('change', (e) => {
      if (e.target.files[0]) this.onFichierChoisi(e.target.files[0], 'monsieur');
    });
    document.getElementById('input-csv-madame').addEventListener('change', (e) => {
      if (e.target.files[0]) this.onFichierChoisi(e.target.files[0], 'madame');
    });

    document.getElementById('btn-reset').addEventListener('click', () => this.confirmerReset());
  },

  confirmerReset() {
    if (!confirm('Cela supprime définitivement toutes les transactions importées. Continuer ?')) return;
    Store.resetAll();
    this.state = Store.getState();
    this.renderAll();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
