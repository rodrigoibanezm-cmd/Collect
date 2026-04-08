// /lib/engine/estabilidad.js

export function computeEstabilidad(input) {
  if (!input || typeof input !== "object") {
    throw new Error("invalid_estabilidad_input");
  }

  const { diff, p_value } = input;

  if (
    !Number.isFinite(diff) ||
    !Number.isFinite(p_value)
  ) {
    return {
      tipo_resultado: "no_aplica",
      estable: false,
      empate: false
    };
  }

  const empate = diff < 0.05;

  if (empate) {
    return {
      tipo_resultado: "empate",
      estable: false,
      empate: true
    };
  }

  if (p_value >= 0.05) {
    return {
      tipo_resultado: "no_concluyente",
      estable: false,
      empate: false
    };
  }

  return {
    tipo_resultado: "estable",
    estable: true,
    empate: false
  };
}
