// /lib/engine/computeResultado.js

export function computeResultado(prepared) {
  if (!prepared || typeof prepared !== "object") {
    throw new Error("invalid_prepared");
  }

  const options = Array.isArray(prepared.options) ? prepared.options : [];

  if (options.length === 0) {
    throw new Error("invalid_resultado_base:no_options");
  }

  const valid = options.filter((o) => {
    return (
      o &&
      typeof o === "object" &&
      typeof o.label === "string" &&
      o.label.trim().length > 0 &&
      Number.isInteger(o.n) &&
      o.n > 0
    );
  });

  if (valid.length === 0) {
    throw new Error("invalid_resultado_base:no_valid_options");
  }

  const total_n = valid.reduce((acc, o) => acc + o.n, 0);

  if (!Number.isFinite(total_n) || total_n <= 0) {
    throw new Error("invalid_resultado_base:invalid_total_n");
  }

  const ranked = valid
    .map((o) => ({
      label: o.label.trim(),
      n: o.n
    }))
    .sort((a, b) => {
      if (b.n !== a.n) return b.n - a.n;
      return a.label.localeCompare(b.label);
    });

  const top1 = ranked[0];
  const top2 = ranked[1];

  if (!top2) {
    return {
      winner: top1.label,
      second: null,
      diff: null,
      n: {
        winner: top1.n,
        second: null
      }
    };
  }

  const isTie = top1.n === top2.n;

  const diff = isTie
    ? 0
    : (top1.n - top2.n) / total_n;

  return {
    winner: top1.label,
    second: top2.label,
    diff,
    n: {
      winner: top1.n,
      second: top2.n
    }
  };
}
