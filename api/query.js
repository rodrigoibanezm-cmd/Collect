// /api/query.js

import { loadInputs, compute } from "../lib/compute";

export default async function handler(req, res) {
  try {
    const DATA_URL = "PEGA_URL_DATA_JSON";
    const SCHEMA_URL = "PEGA_URL_SCHEMA_JSON";

    const { data, schema } = await loadInputs(DATA_URL, SCHEMA_URL);
    const result = compute(data, schema);

    // 🔴 filtrar opciones válidas
    const entries = Object.entries(result).filter(
      ([_, v]) => v.score_compuesto !== null
    );

    if (entries.length < 2) {
      throw new Error("No hay datos suficientes para comparar");
    }

    // ordenar
    entries.sort((a, b) => b[1].score_compuesto - a[1].score_compuesto);

    const [wKey, w] = entries[0];
    const [sKey, s] = entries[1];

    const diffScore = w.score_compuesto - s.score_compuesto;

    // 🔴 driver
    const diffClaridad = (w.claridad ?? 0) - (s.claridad ?? 0);
    const diffAtractivo = (w.atractivo ?? 0) - (s.atractivo ?? 0);

    const driver =
      Math.abs(diffAtractivo) > Math.abs(diffClaridad)
        ? "atractivo"
        : "claridad";

    // 🔴 reglas de decisión
    let tipo_resultado = "diferencia_clara";
    let confianza = "alta";

    if (Math.abs(diffScore) < 0.05) {
      tipo_resultado = "empate";
      confianza = "baja";
    } else if (diffScore < 0.2) {
      tipo_resultado = "diferencia_no_concluyente";
      confianza = "media";
    }

    return res.status(200).json({
      status: "ok",
      decision: {
        ganador: tipo_resultado === "empate" ? null : wKey,
        tipo_resultado,
        confianza,
        driver,
        diferencia_score: Number(diffScore.toFixed(4))
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
