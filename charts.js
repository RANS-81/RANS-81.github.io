/**
 * charts.js
 * Graphiques du tableau de bord : barres empilées par mois/catégorie,
 * et barres cumulées par catégorie (totaux sur la période filtrée).
 */

const ChartsModule = {
  _parMois: null,
  _parCategorie: null,

  palette: [
    '#7c8b7a', '#a3866b', '#8a7ca8', '#c08a5c', '#b06a6a', '#6a8fb0',
    '#4f7a5c', '#5c7a6f', '#9c7a9c', '#6f8a9c', '#bfa05c', '#7a9c8a',
    '#9c6f6f', '#6f7a9c',
  ],

  couleurPour(nom, index) {
    let hash = 0;
    for (let i = 0; i < nom.length; i++) hash = (hash * 31 + nom.charCodeAt(i)) >>> 0;
    return this.palette[hash % this.palette.length];
  },

  destroyAll() {
    this._parMois?.destroy();
    this._parCategorie?.destroy();
  },

  /**
   * @param labelsMois ['2026-01', ...] triés
   * @param categories ['Alimentation', ...]
   * @param matrice { categorie: { '2026-01': montant, ... } }
   */
  renderParMois(canvasId, labelsMois, categories, matrice) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this._parMois?.destroy();

    if (categories.length === 0 || labelsMois.length === 0) {
      ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    const datasets = categories.map((cat, i) => ({
      label: cat,
      data: labelsMois.map(m => Number((matrice[cat]?.[m] || 0).toFixed(2))),
      backgroundColor: this.couleurPour(cat, i),
      borderRadius: 2,
      stack: 'depenses',
    }));

    this._parMois = new Chart(ctx, {
      type: 'bar',
      data: { labels: labelsMois.map(m => this.libelleMoisCourt(m)), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: "'IBM Plex Mono', monospace", size: 10 }, color: '#3b3530', boxWidth: 10, padding: 8 },
          },
          tooltip: {
            callbacks: { label: (c) => `${c.dataset.label} : ${c.parsed.y.toFixed(2)} €` },
          },
        },
        scales: {
          x: { stacked: true, ticks: { font: { family: "'IBM Plex Mono', monospace", size: 10 }, color: '#6b6258' }, grid: { display: false } },
          y: { stacked: true, ticks: { font: { family: "'IBM Plex Mono', monospace", size: 10 }, color: '#6b6258' }, grid: { color: '#e6e1d6' } },
        },
      },
    });
  },

  /**
   * @param totauxParCategorie { categorie: montantTotal }
   */
  renderParCategorie(canvasId, totauxParCategorie) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this._parCategorie?.destroy();

    const entries = Object.entries(totauxParCategorie).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    const labels = entries.map(([nom]) => nom);
    const data = entries.map(([, v]) => Number(v.toFixed(2)));
    const colors = entries.map(([nom], i) => this.couleurPour(nom, i));

    this._parCategorie = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderRadius: 2 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${c.parsed.x.toFixed(2)} €` } },
        },
        scales: {
          x: { ticks: { font: { family: "'IBM Plex Mono', monospace", size: 10 }, color: '#6b6258' }, grid: { color: '#e6e1d6' } },
          y: { ticks: { font: { family: "'IBM Plex Mono', monospace", size: 11 }, color: '#3b3530' }, grid: { display: false } },
        },
      },
    });
  },

  libelleMoisCourt(m) {
    const [y, mo] = m.split('-');
    const noms = ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'];
    return `${noms[parseInt(mo, 10) - 1]} ${y.slice(2)}`;
  },
};
