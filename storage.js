/**
 * storage.js
 * Couche de persistance : localStorage.
 * Modèle de données :
 *   transaction = {
 *     id, personne ('monsieur'|'madame'),
 *     date (YYYY-MM-DD), libelle,
 *     categorie, sousCategorie (texte brut venu de la banque),
 *     montant (toujours positif), sens ('debit'|'credit'),
 *     statut ('normale' | 'virement_interne' | 'non_categorisee'),
 *     source (nom du fichier importé), importeLe (timestamp)
 *   }
 */

const STORAGE_KEY = 'registre.budget.v2';

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function emptyState() {
  return {
    version: 2,
    transactions: [],
    imports: [], // historique des fichiers importés : {id, nomFichier, personne, nbLignes, date}
  };
}

const Store = {
  _state: null,

  load() {
    if (this._state) return this._state;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this._state = raw ? JSON.parse(raw) : emptyState();
      this._migrate();
    } catch (e) {
      console.error('Erreur de lecture du stockage local, réinitialisation.', e);
      this._state = emptyState();
    }
    return this._state;
  },

  _migrate() {
    if (!this._state.version) this._state.version = 2;
    if (!Array.isArray(this._state.transactions)) this._state.transactions = [];
    if (!Array.isArray(this._state.imports)) this._state.imports = [];
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  },

  getState() {
    return this.load();
  },

  /**
   * Ajoute un lot de transactions issues d'un import CSV, avec dédoublonnage :
   * une transaction est considérée comme un doublon si (personne, date, libelle,
   * montant, sens) est déjà présent.
   * Retourne {ajoutees, doublons}
   */
  importerTransactions(nomFichier, personne, transactionsBrutes) {
    const s = this.load();
    const cleExistantes = new Set(
      s.transactions.map(t => `${t.personne}|${t.date}|${t.libelle}|${t.montant}|${t.sens}`)
    );

    let ajoutees = 0, doublons = 0;
    transactionsBrutes.forEach(tb => {
      const cle = `${personne}|${tb.date}|${tb.libelle}|${tb.montant}|${tb.sens}`;
      if (cleExistantes.has(cle)) {
        doublons++;
        return;
      }
      cleExistantes.add(cle);
      s.transactions.push({
        id: uid('txn'),
        personne,
        date: tb.date,
        libelle: tb.libelle,
        categorie: tb.categorie,
        sousCategorie: tb.sousCategorie,
        montant: tb.montant,
        sens: tb.sens,
        statut: tb.statut,
        source: nomFichier,
        importeLe: Date.now(),
      });
      ajoutees++;
    });

    s.imports.push({
      id: uid('imp'),
      nomFichier,
      personne,
      nbLignes: transactionsBrutes.length,
      nbAjoutees: ajoutees,
      nbDoublons: doublons,
      date: Date.now(),
    });

    this.save();
    return { ajoutees, doublons };
  },

  updateTransaction(id, patch) {
    const s = this.load();
    const t = s.transactions.find(t => t.id === id);
    if (t) Object.assign(t, patch);
    this.save();
  },

  deleteTransaction(id) {
    const s = this.load();
    s.transactions = s.transactions.filter(t => t.id !== id);
    this.save();
  },

  resetAll() {
    this._state = emptyState();
    this.save();
  },
};
