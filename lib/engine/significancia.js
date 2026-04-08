// /lib/engine/significancia.js

export function computeSignificancia(input) {
  if (!input || typeof input !== "object") {
    throw new Error("invalid_significancia_input");
  }

  const { top1, top2 } = input;

  if (!top1 || !top2) {
    return {
      n: null,
      k: null,
      p_value: null,
      significativo: false,
      nivel: "no_aplica"
    };
  }

  const n1 = top1.n;
  const n2 = top2.n;

  if (!Number.isFinite(n1) || !Number.isFinite(n2) || n1 < 0 || n2 < 0) {
    throw new Error("invalid_significancia_counts");
  }

  const n = n1 + n2;
  const k = n1;

  if (n === 0) {
    return {
      n: 0,
      k: 0,
      p_value: null,
      significativo: false,
      nivel: "no_aplica"
    };
  }

  const logFactorial = (x) => {
    let res = 0;
    for (let i = 2; i <= x; i++) res += Math.log(i);
    return res;
  };

  const logCombination = (n, k) =>
    logFactorial(n) - logFactorial(k) - logFactorial(n - k);

  const binomPMF = (n, k, p) => {
    const logP =
      logCombination(n, k) +
      k * Math.log(p) +
      (n - k) * Math.log(1 - p);
    return Math.exp(logP);
  };

  const p = 0.5;
  const probObserved = binomPMF(n, k, p);

  let p_value = 0;

  for (let i = 0; i <= n; i++) {
    const prob = binomPMF(n, i, p);
    if (prob <= probObserved + 1e-12) {
      p_value += prob;
    }
  }

  let nivel = "no_concluyente_fuerte";
  let significativo = false;

  if (p_value < 0.05) {
    nivel = "significativo";
    significativo = true;
  } else if (p_value < 0.10) {
    nivel = "no_concluyente";
  }

  return {
    n,
    k,
    p_value,
    significativo,
    nivel
  };
}
