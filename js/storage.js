/**
 * storage.js
 * Couche de persistance : Supabase (PostgreSQL).
 * Aucune authentification — toutes les données sont partagées.
 *
 * Avant utilisation, renseigner SUPABASE_URL et SUPABASE_ANON_KEY
 * avec les valeurs trouvées dans Settings → API de votre projet Supabase.
 *
 * Schéma SQL à exécuter dans l'éditeur SQL Supabase :
 *
 *   create table transactions (
 *     id text primary key,
 *     personne text,
 *     date date,
 *     libelle text,
 *     categorie text,
 *     sous_categorie text,
 *     montant numeric,
 *     sens text,
 *     statut text,
 *     source text,
 *     importe_le bigint
 *   );
 *
 *   create table imports (
 *     id text primary key,
 *     nom_fichier text,
 *     personne text,
 *     nb_lignes int,
 *     nb_ajoutees int,
 *     nb_doublons int,
 *     date bigint
 *   );
 */

const SUPABASE_URL = 'https://yhpepxauruozjruerglm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rJ0LZ5dqBhsShTLfm-Vd5w_ARdFAuX_';

const _db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function _txnFromRow(r) {
  return {
    id: r.id,
    personne: r.personne,
    date: r.date,          // déjà YYYY-MM-DD (Supabase renvoie les dates en texte ISO)
    libelle: r.libelle,
    categorie: r.categorie,
    sousCategorie: r.sous_categorie,
    montant: Number(r.montant),
    sens: r.sens,
    statut: r.statut,
    source: r.source,
    importeLe: r.importe_le,
  };
}

function _impFromRow(r) {
  return {
    id: r.id,
    nomFichier: r.nom_fichier,
    personne: r.personne,
    nbLignes: r.nb_lignes,
    nbAjoutees: r.nb_ajoutees,
    nbDoublons: r.nb_doublons,
    date: r.date,
  };
}

const Store = {
  _state: { transactions: [], imports: [] },

  async _fetchAll(table, order = 'date') {
    const PAGE = 1000;
    let all = [], from = 0, done = false;
    while (!done) {
      const { data, error } = await _db.from(table).select('*')
        .order(order, { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Erreur Supabase (${table}) : ` + error.message);
      all = all.concat(data || []);
      done = !data || data.length < PAGE;
      from += PAGE;
    }
    return all;
  },

  async load() {
    const [txns, imps] = await Promise.all([
      this._fetchAll('transactions', 'date'),
      this._fetchAll('imports', 'date'),
    ]);
    this._state = {
      transactions: txns.map(_txnFromRow),
      imports: imps.map(_impFromRow),
    };
    return this._state;
  },

  getState() {
    return this._state;
  },

  async importerTransactions(nomFichier, personne, transactionsBrutes) {
    const existing = this._state.transactions;
    const cleExistantes = new Set(
      existing.map(t => `${t.personne}|${t.date}|${t.libelle}|${t.montant}|${t.sens}`)
    );

    const nouvelles = [];
    let ajoutees = 0, doublons = 0;
    const now = Date.now();

    transactionsBrutes.forEach(tb => {
      const cle = `${personne}|${tb.date}|${tb.libelle}|${tb.montant}|${tb.sens}`;
      if (cleExistantes.has(cle)) { doublons++; return; }
      cleExistantes.add(cle);
      nouvelles.push({
        id: uid('txn'),
        personne,
        date: tb.date,
        libelle: tb.libelle,
        categorie: tb.categorie,
        sous_categorie: tb.sousCategorie,
        montant: tb.montant,
        sens: tb.sens,
        statut: tb.statut,
        source: nomFichier,
        importe_le: now,
      });
      ajoutees++;
    });

    if (nouvelles.length > 0) {
      const { error } = await _db.from('transactions').insert(nouvelles);
      if (error) throw new Error('Erreur insertion transactions : ' + error.message);
    }

    const impRow = {
      id: uid('imp'),
      nom_fichier: nomFichier,
      personne,
      nb_lignes: transactionsBrutes.length,
      nb_ajoutees: ajoutees,
      nb_doublons: doublons,
      date: now,
    };
    const { error: errImp } = await _db.from('imports').insert([impRow]);
    if (errImp) throw new Error('Erreur insertion import : ' + errImp.message);

    return { ajoutees, doublons };
  },

  async updateTransaction(id, patch) {
    const dbPatch = {};
    if ('categorie' in patch) dbPatch.categorie = patch.categorie;
    if ('sousCategorie' in patch) dbPatch.sous_categorie = patch.sousCategorie;
    if ('statut' in patch) dbPatch.statut = patch.statut;
    if ('libelle' in patch) dbPatch.libelle = patch.libelle;
    if ('sens' in patch) dbPatch.sens = patch.sens;
    if ('montant' in patch) dbPatch.montant = patch.montant;

    const { error } = await _db.from('transactions').update(dbPatch).eq('id', id);
    if (error) throw new Error('Erreur mise à jour : ' + error.message);

    // Mise à jour du cache local
    const t = this._state.transactions.find(t => t.id === id);
    if (t) Object.assign(t, patch);
  },

  async deleteTransaction(id) {
    const { error } = await _db.from('transactions').delete().eq('id', id);
    if (error) throw new Error('Erreur suppression : ' + error.message);
    this._state.transactions = this._state.transactions.filter(t => t.id !== id);
  },

  async resetAll() {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      _db.from('transactions').delete().neq('id', ''),
      _db.from('imports').delete().neq('id', ''),
    ]);
    if (e1) throw new Error('Erreur reset transactions : ' + e1.message);
    if (e2) throw new Error('Erreur reset imports : ' + e2.message);
    this._state = { transactions: [], imports: [] };
  },
};
