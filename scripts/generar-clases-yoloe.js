/**
 * Escribe ml/yoloe_classes.json con las clases que hay que hornear en el
 * modelo YOLOE.
 *
 * La lista sale del catálogo de ingredientes de la app, no de una copia a
 * mano: si alguien agrega un ingrediente a las recetas y el modelo no lo
 * conoce, la app promete una detección que no puede cumplir. Generarlo
 * evita que las dos listas se separen con el tiempo.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const salidaTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chefcito-clases-'));

try {
  // El catálogo es TypeScript y no importa nada, así que se puede compilar
  // solo y requerir el resultado.
  execFileSync(
    'npx',
    [
      'tsc',
      path.join(raiz, 'src/vision/ingredientCatalog.ts'),
      // tsc se niega a compilar un archivo suelto si hay tsconfig.json.
      '--ignoreConfig',
      '--module', 'commonjs',
      '--target', 'es2019',
      '--outDir', salidaTmp,
    ],
    { stdio: 'inherit' }
  );

  const catalogo = require(path.join(salidaTmp, 'ingredientCatalog.js'));
  const clases = catalogo.getEnglishClassNames();

  const destino = path.join(raiz, 'ml', 'yoloe_classes.json');
  fs.writeFileSync(destino, JSON.stringify(clases, null, 2) + '\n');
  console.log(`${clases.length} clases escritas en ml/yoloe_classes.json`);
} finally {
  fs.rmSync(salidaTmp, { recursive: true, force: true });
}
