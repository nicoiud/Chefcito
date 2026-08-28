import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ArErrorBoundary } from '../ar/ArErrorBoundary';

/**
 * La AR es lo que más chances tiene de fallar en un dispositivo concreto y
 * es lo único que no pude probar sobre hardware real. Estos tests fijan la
 * garantía que importa: un fallo de Viro degrada a la guía 2D en vez de
 * dejar la pantalla en blanco.
 */

function Explota(): React.JSX.Element {
  throw new Error('ARCore no disponible');
}

/** React loguea el error capturado; se silencia para no ensuciar la salida. */
function silenciarErrores() {
  const original = console.error;
  console.error = () => {};
  return () => {
    console.error = original;
  };
}

/** React 19 renderiza de forma concurrente: sin act() no se aplica nada. */
function render(node: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(node);
  });
  return tree;
}

describe('ArErrorBoundary', () => {
  it('renderiza a los hijos cuando todo anda bien', () => {
    const tree = render(
      <ArErrorBoundary onError={() => {}}>
        <Text>escena AR</Text>
      </ArErrorBoundary>
    );
    expect(JSON.stringify(tree.toJSON())).toContain('escena AR');
  });

  it('avisa el motivo cuando la escena AR falla al montarse', () => {
    const restaurar = silenciarErrores();
    const errores: string[] = [];

    render(
      <ArErrorBoundary onError={(m) => errores.push(m)}>
        <Explota />
      </ArErrorBoundary>
    );

    restaurar();
    expect(errores).toEqual(['ARCore no disponible']);
  });

  it('no deja nada renderizado tras el fallo, para que la pantalla pase a 2D', () => {
    const restaurar = silenciarErrores();

    const tree = render(
      <ArErrorBoundary onError={() => {}}>
        <Explota />
      </ArErrorBoundary>
    );

    restaurar();
    expect(tree.toJSON()).toBeNull();
  });

  it('no propaga el error: la app no se cae', () => {
    const restaurar = silenciarErrores();

    expect(() =>
      render(
        <ArErrorBoundary onError={() => {}}>
          <Explota />
        </ArErrorBoundary>
      )
    ).not.toThrow();

    restaurar();
  });
});
