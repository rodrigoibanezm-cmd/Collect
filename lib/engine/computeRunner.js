// /lib/engine/computeRunner.js

import { computeDiagnostico } from "./diagnostico.js";

const ENGINE_BY_ANALYSIS_TYPE = {
  resultado: computeDiagnostico,
  estabilidad: computeDiagnostico
};

export async function computeRunner(prepared, input) {
  if (!prepared || typeof prepared !== "object" || Array.isArray(prepared)) {
    throw new Error("invalid_prepared");
  }

  const engine = ENGINE_BY_ANALYSIS_TYPE[input?.analysis_type];

  if (typeof engine !== "function") {
    throw new Error("invalid_engine_route");
  }

  return engine(prepared);
}
