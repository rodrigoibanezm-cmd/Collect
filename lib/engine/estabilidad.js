// /lib/engine/estabilidad.js

export function computeEstabilidad(input) {
  if (!input || typeof input.diff !== "number" || typeof input.p_value !== "number") {
    return {
      tipo_resultado: "no_aplica",
      estable: false,
      empate: false
    };
  }

  const diff = input.diff;
  const p = input.p_value;

  // --- reglas ---

  const empate = diff < 0.05;

  let tipo_resultado = "no_concluyente";
  let estable = false;

  if (empate) {
    tipo_resultado = "empate";
    estable = false;
  } else if (p >= 0.05) {
    tipo_resultado = "no_concluyente";
    estable = false;
  } else {
    tipo_resultado = "estable";
    estable = true;
  }

  return {
    tipo_resultado,
    estable,
    empate
  };
}
