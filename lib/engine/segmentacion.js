// /lib/engine/segmentacion.js

import { computeResultado } from "./resultado.js";
import { computeSignificancia } from "./significancia.js";
import { computeEstabilidad } from "./estabilidad.js";

const MIN_N = 30;

export function computeSegmentacion(input) {
  if (!input || !input.global || !Array.isArray(input.segmentos)) {
    throw new Error("Input inválido: falta 'global' o 'segmentos'");
  }

  const ganador_global = input.global?.top1?.label || null;

  const resultados_segmentos = [];
  let n_quiebres = 0;

  for (const seg of input.segmentos) {
    const nombre = seg.segmento;

    // --- resultado ---
    const res = computeResultado({ opciones: seg.opciones });

    const n = res.n_total;

    // --- validez ---
    const valido = n >= MIN_N && res.top1 && res.top2;

    if (!valido) {
      resultados_segmentos.push({
        segmento: nombre,
        valido: false,
        n,
        ganador: null,
        p_value: null,
        tipo_resultado: "no_aplica",
        quiebre: false
      });
      continue;
    }

    // --- significancia ---
    const sig = computeSignificancia({
      top1: res.top1,
      top2: res.top2
    });

    // --- estabilidad ---
    const est = computeEstabilidad({
      diff: res.diff,
      p_value: sig.p_value
    });

    // --- quiebre ---
    const ganador_segmento = res.top1.label;

    const quiebre =
      ganador_global &&
      ganador_segmento !== ganador_global &&
      sig.p_value < 0.05 &&
      n >= MIN_N;

    if (quiebre) n_quiebres++;

    resultados_segmentos.push({
      segmento: nombre,
      valido: true,
      n,
      ganador: ganador_segmento,
      p_value: sig.p_value,
      tipo_resultado: est.tipo_resultado,
      quiebre
    });
  }

  return {
    segmentos: resultados_segmentos,
    dependiente: n_quiebres > 0,
    n_quiebres
  };
}
