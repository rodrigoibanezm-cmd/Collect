// /lib/engine/diagnostico.js

import { computeResultado } from "./resultado.js";
import { computeSignificancia } from "./significancia.js";
import { computeEstabilidad } from "./estabilidad.js";

export function computeDiagnostico(prepared) {
  if (!prepared || typeof prepared !== "object") {
    throw new Error("invalid_prepared");
  }

  if (!Array.isArray(prepared.options)) {
    throw new Error("invalid_prepared_options");
  }

  const resultado = computeResultado({
    opciones: prepared.options
  });

  const significancia = computeSignificancia({
    top1: resultado.top1,
    top2: resultado.top2
  });

  const estabilidad = computeEstabilidad({
    diff: resultado.diff,
    p_value: significancia.p_value
  });

  return {
    winner: resultado.top1?.label || null,
    second: resultado.top2?.label || null,
    diff: typeof resultado.diff === "number" ? resultado.diff : null,
    p_value:
      typeof significancia.p_value === "number"
        ? significancia.p_value
        : null,
    significant:
      typeof significancia.significativo === "boolean"
        ? significancia.significativo
        : false,
    n: {
      winner: typeof resultado.top1?.n === "number" ? resultado.top1.n : null,
      second: typeof resultado.top2?.n === "number" ? resultado.top2.n : null
    },
    diagnosis:
      typeof estabilidad.tipo_resultado === "string"
        ? estabilidad.tipo_resultado
        : "no_concluyente"
  };
}
