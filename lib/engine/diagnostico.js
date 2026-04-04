// /lib/engine/diagnostico.js

import { computeResultado } from "./resultado.js";
import { computeSignificancia } from "./significancia.js";
import { computeEstabilidad } from "./estabilidad.js";
import { computeSegmentacion } from "./segmentacion.js";

export function computeDiagnostico(input) {
  if (!input || !Array.isArray(input.opciones)) {
    throw new Error("Input inválido: falta 'opciones'");
  }

  // 1. Resultado
  const resultado = computeResultado({
    opciones: input.opciones
  });

  // 2. Significancia
  const significancia = computeSignificancia({
    top1: resultado.top1,
    top2: resultado.top2
  });

  // 3. Estabilidad
  const estabilidad = computeEstabilidad({
    diff: resultado.diff,
    p_value: significancia.p_value
  });

  // 4. Segmentación (opcional)
  let segmentacion = {
    segmentos: [],
    dependiente: false,
    n_quiebres: 0
  };

  if (Array.isArray(input.segmentos) && input.segmentos.length > 0) {
    segmentacion = computeSegmentacion({
      global: resultado,
      segmentos: input.segmentos
    });
  }

  // 5. Diagnóstico consolidado (sin lógica nueva)
  const diagnostico = {
    ganador: resultado.top1?.label || null,
    tipo_resultado: estabilidad.tipo_resultado,
    dependiente: segmentacion.dependiente,
    n_quiebres: segmentacion.n_quiebres
  };

  return {
    resultado,
    significancia,
    estabilidad,
    segmentacion,
    diagnostico
  };
}
