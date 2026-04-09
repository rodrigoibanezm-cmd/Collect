// /lib/engine/computeEstabilidad.js

function computeRanking(prepared) {
  const options = Array.isArray(prepared.options) ? prepared.options : [];

  if (options.length === 0) {
    throw new Error("invalid_estabilidad_base:no_options");
  }

  const valid = options.filter(
    (o) =>
      o &&
      typeof o === "object" &&
      typeof o.label === "string" &&
      o.label.trim() !== "" &&
      Number.isInteger(o.n) &&
      o.n > 0
  );

  if (valid.length < 2) {
    throw new Error("invalid_estabilidad_base:insufficient_options");
  }

  const total_n = valid.reduce((acc, o) => acc + o.n, 0);

  if (!Number.isFinite(total_n) || total_n <= 0) {
    throw new Error("invalid_estabilidad_base:invalid_total_n");
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

  return {
    top1: ranked[0],
    top2: ranked[1],
    total_n
  };
}

function normalApproxPValue(n1, n2) {
  const n = n1 + n2;
  if (n === 0) return 1;

  const p = 0.5;
  const mean = n * p;
  const sd = Math.sqrt(n * p * (1 - p));

  if (sd === 0) return 1;

  const z = (n1 - mean) / sd;

  const erf = (x) => {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * x);
    const y =
      1 -
      (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
        t *
        Math.exp(-x * x));

    return sign * y;
  };

  const phi = 0.5 * (1 + erf(z / Math.sqrt(2)));
  const p_value = 2 * Math.min(phi, 1 - phi);

  return Math.max(0, Math.min(1, p_value));
}

export function computeEstabilidad(prepared) {
  if (!prepared || typeof prepared !== "object") {
    throw new Error("invalid_prepared");
  }

  const { top1, top2 } = computeRanking(prepared);

  const n1 = top1.n;
  const n2 = top2.n;

  if (n2 === 0) {
    return {
      p_value: null,
      significant: false,
      diagnosis: "sin_base",
      n: { winner: n1, second: n2 }
    };
  }

  if (n1 === n2) {
    return {
      p_value: 1,
      significant: false,
      diagnosis: "empate",
      n: { winner: n1, second: n2 }
    };
  }

  const p_value = normalApproxPValue(n1, n2);

  const significant = p_value < 0.05;

  let diagnosis = "no_concluyente";

  if (significant) {
    diagnosis = "diferencia_clara";
  }

  return {
    p_value,
    significant,
    diagnosis,
    n: {
      winner: n1,
      second: n2
    }
  };
}
