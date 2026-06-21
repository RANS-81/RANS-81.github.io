/**
 * charts.js
 * Graphiques du tableau de bord : barres empilées par mois/catégorie,
 * et barres cumulées par catégorie (totaux sur la période filtrée).
 */

const ChartsModule = {
  _parMois: null,
  _parCategorie: null,

  palette: [
    '#5B5FEF', '#12A35E', '#F5A524', '#E5484D', '#0EA5C4', '#D6589F',
    '#7C5CFC', '#2DBE8B', '#FF8A4C', '#4F6BFF', '#C2410C', '#0D9488',
    '#9333EA', '#65A30D',
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
            labels: { font: { family: "'Inter', sans-serif", size: 10 }, color: '#15182B', boxWidth: 10, padding: 8 },
          },
          tooltip: {
            callbacks: { label: (c) => `${c.dataset.label} : ${c.parsed.y.toFixed(2)} €` },
          },
        },
        scales: {
          x: { stacked: true, ticks: { font: { family: "'Inter', sans-serif", size: 10 }, color: '#6B7088' }, grid: { display: false } },
          y: { stacked: true, ticks: { font: { family: "'Inter', sans-serif", size: 10 }, color: '#6B7088' }, grid: { color: '#E7E9F1' } },
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
          x: { ticks: { font: { family: "'Inter', sans-serif", size: 10 }, color: '#6B7088' }, grid: { color: '#E7E9F1' } },
          y: { ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#15182B' }, grid: { display: false } },
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
