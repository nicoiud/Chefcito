import { base64ToBytes } from '../vision/frameToTensor';

describe('base64ToBytes', () => {
  /** Referencia independiente, para no comparar la función contra sí misma. */
  const ref = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));

  it('decodifica ASCII simple', () => {
    expect(Array.from(base64ToBytes('aGVsbG8='))).toEqual(Array.from(ref('aGVsbG8=')));
  });

  it('coincide con la referencia para los tres restos de padding', () => {
    for (const texto of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
      const b64 = Buffer.from(texto).toString('base64');
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(ref(b64)));
    }
  });

  it('decodifica bytes binarios arbitrarios, no solo texto', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const b64 = Buffer.from(bytes).toString('base64');
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
  });

  it('ignora saltos de línea y espacios intercalados', () => {
    const b64 = Buffer.from('hola mundo').toString('base64');
    const conRuido = b64.slice(0, 4) + '\n  ' + b64.slice(4);
    expect(Array.from(base64ToBytes(conRuido))).toEqual(Array.from(ref(b64)));
  });

  it('devuelve vacío para entrada vacía', () => {
    expect(base64ToBytes('').length).toBe(0);
  });

  it('reproduce la cabecera de un JPEG real', () => {
    // Todo JPEG arranca con FF D8 FF: si el decodificador se equivoca en el
    // corrimiento de bits, esto es lo primero que se rompe.
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const b64 = Buffer.from(jpegHeader).toString('base64');
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(jpegHeader));
  });
});
