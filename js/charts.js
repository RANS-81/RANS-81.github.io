/**
 * charts.js
 * Graphiques du tableau de bord : barres empilées par mois/catégorie,
 * et barres cumulées par catégorie (totaux sur la période filtrée).
 */

const ChartsModule = {
  _charts: {},   // keyed by canvasId
  _miniCharts: [],

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
    Object.values(this._charts).forEach(c => c?.destroy());
    this._charts = {};
    (this._miniCharts || []).forEach(c => c.destroy());
    this._miniCharts = [];
  },

  /**
   * @param labelsMois ['2026-01', ...] triés
   * @param categories ['Alimentation', ...]
   * @param matrice { categorie: { '2026-01': montant, ... } }
   */
  renderParMois(canvasId, labelsMois, categories, matrice, onClic) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this._charts[canvasId]?.destroy();

    if (categories.length === 0 || labelsMois.length === 0) {
      ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    const datasets = categories.map((cat, i) => ({
      label: cat,
      data: labelsMois.map(m => Number((matrice[cat]?.[m] || 0).toFixed(2))),
      backgroundColor: this.couleurPour(cat, i),
      borderRadius: 2,
      stack: 'stack',
    }));

    this._charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels: labelsMois.map(m => this.libelleMoisCourt(m)), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cursor: onClic ? 'pointer' : 'default',
        onClick: onClic ? (evt, els) => {
          if (!els.length) return;
          const cat = categories[els[0].datasetIndex];
          const moisLabel = labelsMois[els[0].index];
          onClic(cat, moisLabel);
        } : undefined,
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

  renderParCategorie(canvasId, totauxParCategorie, onClic) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this._charts[canvasId]?.destroy();

    const entries = Object.entries(totauxParCategorie).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    const labels = entries.map(([nom]) => nom);
    const data = entries.map(([, v]) => Number(v.toFixed(2)));
    const colors = entries.map(([nom], i) => this.couleurPour(nom, i));

    this._charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderRadius: 2 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: onClic ? (evt, els) => {
          if (!els.length) return;
          onClic(labels[els[0].index]);
        } : undefined,
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

  renderMiniLignes(containerId, labelsMois, categories, matrice) {
    if (typeof Chart === 'undefined') return;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Destroy previous mini charts
    (this._miniCharts || []).forEach(c => c.destroy());
    this._miniCharts = [];
    container.innerHTML = '';

    if (categories.length === 0 || labelsMois.length === 0) return;

    const labels = labelsMois.map(m => this.libelleMoisCourt(m));

    categories.forEach((cat) => {
      const couleur = this.couleurPour(cat, 0);
      const data = labelsMois.map(m => Number((matrice[cat]?.[m] || 0).toFixed(2)));

      const wrapper = document.createElement('div');
      wrapper.className = 'mini-chart-carte';

      const titre = document.createElement('div');
      titre.className = 'mini-chart-titre';
      titre.innerHTML = `<span class="dot" style="background:${couleur}"></span>${cat}`;

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'mini-chart-zone';

      const canvas = document.createElement('canvas');
      canvasWrap.appendChild(canvas);
      wrapper.appendChild(titre);
      wrapper.appendChild(canvasWrap);
      container.appendChild(wrapper);

      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data,
            borderColor: couleur,
            backgroundColor: couleur + '22',
            fill: true,
            tension: 0.3,
            pointRadius: labelsMois.length > 12 ? 2 : 4,
            pointHoverRadius: 6,
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => `${c.parsed.y.toFixed(2)} €` } },
          },
          scales: {
            x: { ticks: { font: { family: "'Inter', sans-serif", size: 9 }, color: '#6B7088', maxRotation: 45 }, grid: { display: false } },
            y: { ticks: { font: { family: "'Inter', sans-serif", size: 9 }, color: '#6B7088' }, grid: { color: '#E7E9F1' }, beginAtZero: true },
          },
        },
      });

      this._miniCharts.push(chart);
    });
  },

  libelleMoisCourt(m) {
    const [y, mo] = m.split('-');
    const noms = ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'];
    return `${noms[parseInt(mo, 10) - 1]} ${y.slice(2)}`;
  },
};
