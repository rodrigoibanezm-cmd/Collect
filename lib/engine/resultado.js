// /lib/engine/resultado.js

export function computeResultado(input) {
  if (!input || !Array.isArray(input.opciones)) {
    throw new Error("Input inválido: falta 'opciones'");
  }

  const EXCLUIR = new Set(["ninguno", "no_sabe"]);

  // 1. Filtrar opciones válidas
  const validas = input.opciones.filter(o => {
    if (!o || typeof o.label !== "string") return false;
    if (typeof o.n !== "number" || o.n < 0) return false;
    return !EXCLUIR.has(o.label.toLowerCase());
  });

  // 2. Calcular total
  const n_total = validas.reduce((acc, o) => acc + o.n, 0);
  if (n_total === 0) {
    throw new Error("n_total = 0 → no hay base válida");
  }

  // 3. Calcular shares
  const conShares = validas.map(o => ({
    label: o.label,
    n: o.n,
    share: o.n / n_total
  }));

  // 4. Ranking (sin mutar)
  const ranking = [...conShares].sort((a, b) => b.share - a.share);

  // 5. Top1 / Top2
  const top1 = ranking[0] || null;
  const top2 = ranking[1] || null;

  // 6. Diferencia
  const diff = (top1 && top2) ? (top1.share - top2.share) : null;

  // 7. Empate exacto
  const empate_exacto = (top1 && top2) ? (top1.n === top2.n) : false;

  return {
    n_total,
    ranking,
    top1,
    top2,
    diff,
    empate_exacto
  };
}
