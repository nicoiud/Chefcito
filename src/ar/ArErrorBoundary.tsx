import React from 'react';

/**
 * Red de seguridad alrededor de la escena AR.
 *
 * La AR es la parte con más chances de fallar en un dispositivo concreto:
 * puede faltar ARCore, la versión instalada puede ser vieja, o el módulo
 * nativo puede tirar una excepción al montarse. Sin esto, cualquiera de
 * esos casos deja la pantalla en blanco y el usuario no entiende nada.
 *
 * Con el boundary, un fallo de AR degrada a la guía 2D — que muestra la
 * misma información— en lugar de romper la pantalla. Es el mismo criterio
 * que en el resto de la app: la función se cae, el producto no.
 *
 * Tiene que ser un componente de clase: los hooks no pueden capturar
 * errores de render de sus hijos.
 */

interface Props {
  children: React.ReactNode;
  /** Se llama con el mensaje del error para poder mostrarlo en la guía 2D. */
  onError: (message: string) => void;
}

export class ArErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message || 'La vista AR no pudo iniciarse.');
  }

  render() {
    // Al fallar no se renderiza nada: la pantalla que lo contiene detecta
    // el error por `onError` y pasa sola a la guía 2D.
    return this.state.failed ? null : this.props.children;
  }
}
