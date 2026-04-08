// /lib/engine/resultado.js

const EXCLUIR = new Set(["ninguno", "no_sabe"]);

export function computeResultado(input) {
  if (!input || !Array.isArray(input.opciones)) {
    throw new Error("invalid_resultado_input");
  }

  const validas = input.opciones.filter((o) => {
    if (!o || typeof o !== "object") return false;
    if (typeof o.label !== "string" || o.label.trim() === "") return false;
    if (typeof o.n !== "number" || o.n <= 0) return false;

    return !EXCLUIR.has(o.label.trim().toLowerCase());
  });

  const n_total = validas.reduce((acc, o) => acc + o.n, 0);

  if (n_total === 0) {
    throw new Error("invalid_resultado_base");
  }

  const ranking = validas
    .map((o) => ({
      label: o.label.trim(),
      n: o.n,
      share: o.n / n_total
    }))
    .sort((a, b) => {
      if (b.share !== a.share) return b.share - a.share;
      return b.n - a.n;
    });

  const top1 = ranking[0] || null;
  const top2 = ranking[1] || null;

  return {
    n_total,
    ranking,
    top1,
    top2,
    diff: top1 && top2 ? top1.share - top2.share : null,
    empate_exacto: top1 && top2 ? top1.n === top2.n : false
  };
}
