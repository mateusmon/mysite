import assert from "node:assert/strict";
import { compareCars, getCarsForList, suggestCars } from "../carCatalog.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

run("catalogo possui 1000 modelos", () => {
  const cars = getCarsForList();
  assert.equal(cars.length, 1000);
});

run("simulador considera renda mensal", () => {
  const result = suggestCars({
    orcamento: 130000,
    rendaMensal: 7000,
    uso: "urbano",
    perfil: "solteiro",
    prioridade: "economia"
  });

  assert.equal(result.perfil_busca.renda_mensal, 7000);
  assert.equal(result.sugestoes.length, 3);
  assert.ok(result.sugestoes[0].gasto_mensal_estimado > 0);
});

run("comparador retorna lista ordenada", () => {
  const cars = getCarsForList();
  const ids = [cars[0].id, cars[1].id, cars[2].id];
  const result = compareCars({ modelIds: ids, kmMensal: 1200, precoCombustivel: 5.89 });

  assert.equal(result.resultados.length, 3);
  assert.ok(result.resultados[0].gasto_mensal <= result.resultados[1].gasto_mensal);
});

if (!process.exitCode) {
  console.log("RESULT: OK");
}
