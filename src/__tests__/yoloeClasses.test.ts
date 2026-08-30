import { getEnglishClassNames, ingredientCatalog } from '../vision/ingredientCatalog';

/**
 * El modelo YOLOE se exporta con estos nombres horneados adentro. Si acá se
 * cuela un nombre en español o repetido, el modelo sale mal y no hay forma
 * de darse cuenta hasta probarlo en el celular.
 */
describe('clases para exportar el modelo YOLOE', () => {
  const clases = getEnglishClassNames();

  it('da una clase por ingrediente', () => {
    expect(clases).toHaveLength(ingredientCatalog.length);
  });

  it('no repite clases', () => {
    expect(new Set(clases).size).toBe(clases.length);
  });

  it('usa nombres en inglés, sin acentos ni eñes', () => {
    for (const clase of clases) {
      // CLIP entiende mucho mejor el inglés; un alias en español con tilde
      // es la señal más barata de que el orden de aliases se dio vuelta.
      expect(clase).toMatch(/^[a-z][a-z ]*$/);
    }
  });

  it('no deja ninguna clase vacía', () => {
    for (const clase of clases) {
      expect(clase.trim().length).toBeGreaterThan(0);
    }
  });
});
