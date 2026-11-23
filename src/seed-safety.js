function assertEmptyCounts(counts) {
  const existing = Object.entries(counts).filter(([, count]) => count > 0);
  if (existing.length) {
    const summary = existing.map(([name, count]) => `${name}: ${count}`).join(', ');
    throw new Error(
      `Carga cancelada: ya hay información en biblio (${summary}). ` +
      'No se insertó ni eliminó ningún documento. Para continuar sin perder datos, respalda la base ' +
      'y define una estrategia de combinación que evite duplicados antes de autorizar otra carga.'
    );
  }
}

function assertExpectedCounts(counts, expectedCount) {
  const unexpected = Object.entries(counts).filter(([, count]) => count !== expectedCount);
  if (unexpected.length) {
    const summary = unexpected.map(([name, count]) => `${name}: ${count}`).join(', ');
    throw new Error(
      `Conteos inesperados en biblio (${summary}); se esperaba ${expectedCount} documentos por colección.`
    );
  }
}

module.exports = { assertEmptyCounts, assertExpectedCounts };
