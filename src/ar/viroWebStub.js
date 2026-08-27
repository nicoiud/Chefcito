/**
 * Stub de `@reactvision/viro-web-renderer` para la build web.
 *
 * Viro trae variantes `.web.js` de sus componentes que dependen de ese
 * paquete, que es un peer opcional pensado para AR en navegador. Chefcito
 * usa AR solo en el celular: en web la pantalla cae siempre a la guía 2D y
 * el código de Viro nunca se ejecuta. Metro igual necesita **resolver** el
 * import al armar el bundle, así que se lo apunta acá en vez de sumar una
 * dependencia de varios megas que no se usaría nunca.
 *
 * Si alguna vez se quiere AR en el navegador, hay que instalar el paquete
 * real y borrar el alias de metro.config.js.
 */
module.exports = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'viro-web-renderer no está instalado: la AR de Chefcito corre solo en iOS y Android.'
      );
    },
  }
);
