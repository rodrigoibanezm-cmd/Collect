// /lib/engine/computeRunner.js

import { computeResultado } from "./computeResultado.js";
import { computeEstabilidad } from "./computeEstabilidad.js";
import { computeSegmentacion } from "./computeSegmentacion.js";

const ENGINE_BY_ANALYSIS_TYPE = {
  resultado: computeResultado,
  estabilidad: computeEstabilidad,
  segmentacion: computeSegmentacion
};

export async function computeRunner(prepared, input) {
  if (!prepared || typeof prepared !== "object" || Array.isArray(prepared)) {
    throw new Error("invalid_prepared");
  }

  const analysisType = input?.analysis_type;

  if (typeof analysisType !== "string") {
    throw new Error("invalid_analysis_type");
  }

  const engine = ENGINE_BY_ANALYSIS_TYPE[analysisType];

  if (typeof engine !== "function") {
    throw new Error("invalid_engine_route");
  }

  return engine(prepared);
}
