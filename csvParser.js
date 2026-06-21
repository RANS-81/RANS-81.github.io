/**
 * csvParser.js
 * Lecture et interprétation des exports CSV bancaires (format BPCE / Caisse d'Épargne
 * et compatibles) : séparateur ';', encodage Latin-1, montants en virgule décimale,
 * colonnes Debit/Credit séparées, Categorie/Sous categorie fournies par la banque.
 */

const CsvParser = {
  COLONNES_ATTENDUES: ['Date de comptabilisation', 'Libelle simplifie', 'Categorie', 'Sous categorie', 'Debit', 'Credit'],

  /**
   * Lit un fichier en tant que texte, en essayant Latin-1 (encodage usuel des exports
   * bancaires français) puis en repli UTF-8.
   */
  lireFichierTexte(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
      reader.readAsText(file, 'iso-8859-1');
    });
  },

  /** Parse une ligne CSV avec séparateur ';' en gérant les guillemets. */
  parseLigne(ligne) {
    const champs = [];
    let courant = '';
    let dansGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (c === '"') {
        if (dansGuillemets && ligne[i + 1] === '"') { courant += '"'; i++; }
        else dansGuillemets = !dansGuillemets;
      } else if (c === ';' && !dansGuillemets) {
        champs.push(courant);
        courant = '';
      } else {
        courant += c;
      }
    }
    champs.push(courant);
    return champs;
  },

  parseMontant(valeur) {
    if (!valeur || !valeur.trim()) return null;
    const nettoye = valeur.trim().replace(/\s/g, '').replace(',', '.').replace(/^\+/, '');
    const n = parseFloat(nettoye);
    return isNaN(n) ? null : Math.abs(n);
  },

  parseDate(valeur) {
    // attend JJ/MM/AAAA
    const m = valeur.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, j, mo, a] = m;
    return `${a}-${mo}-${j}`;
  },

  determinerStatut(categorie) {
    const cat = (categorie || '').trim().toLowerCase();
    if (cat === 'transaction exclue') return 'virement_interne';
    if (cat.startsWith('a categoriser')) return 'non_categorisee';
    return 'normale';
  },

  /**
   * Parse le contenu texte d'un CSV bancaire.
   * Retourne {transactions, erreurs, colonnesManquantes}
   */
  parseCSV(texte) {
    const lignes = texte.split(/\r\n|\r|\n/).filter(l => l.trim().length > 0);
    if (lignes.length === 0) {
      return { transactions: [], erreurs: ['Le fichier est vide.'], colonnesManquantes: [] };
    }

    const entetes = this.parseLigne(lignes[0]).map(h => h.trim());
    const idx = (nom) => entetes.indexOf(nom);

    const iDate = idx('Date de comptabilisation');
    const iLibelle = idx('Libelle simplifie');
    const iCategorie = idx('Categorie');
    const iSousCategorie = idx('Sous categorie');
    const iDebit = idx('Debit');
    const iCredit = idx('Credit');

    const colonnesManquantes = this.COLONNES_ATTENDUES.filter(c => idx(c) === -1);
    if (colonnesManquantes.length > 0) {
      return { transactions: [], erreurs: [], colonnesManquantes };
    }

    const transactions = [];
    const erreurs = [];

    for (let i = 1; i < lignes.length; i++) {
      const champs = this.parseLigne(lignes[i]);
      if (champs.length < entetes.length - 2) continue; // ligne trop courte, on saute

      const date = this.parseDate(champs[iDate] || '');
      const libelle = (champs[iLibelle] || '').trim();
      const categorie = (champs[iCategorie] || '').trim();
      const sousCategorie = (champs[iSousCategorie] || '').trim();
      const debit = this.parseMontant(champs[iDebit] || '');
      const credit = this.parseMontant(champs[iCredit] || '');

      if (!date) {
        erreurs.push(`Ligne ${i + 1} : date invalide ("${champs[iDate]}"), ignorée.`);
        continue;
      }
      if (debit == null && credit == null) {
        erreurs.push(`Ligne ${i + 1} : ni débit ni crédit, ignorée.`);
        continue;
      }

      const sens = debit != null ? 'debit' : 'credit';
      const montant = debit != null ? debit : credit;

      transactions.push({
        date, libelle, categorie, sousCategorie, montant, sens,
        statut: this.determinerStatut(categorie),
      });
    }

    return { transactions, erreurs, colonnesManquantes: [] };
  },

  async parseFichier(file) {
    const texte = await this.lireFichierTexte(file);
    return this.parseCSV(texte);
  },
};
