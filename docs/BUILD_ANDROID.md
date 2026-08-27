# Compilar el APK y probar en tu Android

La cámara con detección real y la AR **no funcionan en Expo Go**: necesitan
módulos nativos (TFLite y Viro). Hay que compilar un APK propio.

## Cuál de los dos builds conviene

| | `development` | `preview` |
|---|---|---|
| Cambios de JavaScript | Se recargan al toque, **sin recompilar** | Requiere APK nuevo |
| Necesita la compu prendida | Sí, corriendo Metro | No, corre solo |
| Para qué sirve | **Iterar rápido mientras arreglamos cosas** | Probar como usuario final |

**Para lo que vamos a hacer, usá `development`.** Casi todo lo que
arreglemos —lógica de detección, umbrales, posiciones de marcadores,
textos— es JavaScript: lo cambiás sin compilar de nuevo. Solo hace falta
un APK nuevo si tocamos dependencias nativas o `app.json`.

## Camino recomendado: EAS Build (en la nube)

No necesitás instalar Android Studio ni el SDK.

```bash
npm install -g eas-cli
eas login                       # cuenta gratuita de Expo
eas build --platform android --profile development
```

Cuando termina te da un link para bajar el APK. Lo pasás al celular y lo
instalás (hay que permitir "instalar apps de origen desconocido").

Después, para trabajar:

```bash
npx expo start --dev-client
```

Abrís la app en el celular y se conecta a tu Metro. Cada cambio de código
se recarga solo.

Para un APK independiente que corra sin la compu:

```bash
eas build --platform android --profile preview
```

## Camino alternativo: compilar local

Necesitás JDK 17+ y el SDK de Android instalados.

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
# el APK queda en android/app/build/outputs/apk/debug/
```

> Yo no pude compilar el APK desde mi entorno: el proxy bloquea
> `dl.google.com`, de donde salen el Android Gradle Plugin y las
> librerías de AndroidX. Sí verifiqué que `expo prebuild` genera el
> proyecto nativo correctamente y que los plugins de Viro escriben lo que
> corresponde en el manifiesto.

## Qué necesita tu celular

- **Android 7.0+** y **ARCore** ("Servicios de Google Play para RA"). Si no
  lo tenés, se instala desde Play Store.
- Si el celular no soporta ARCore, la app **igual funciona**: la pantalla de
  AR cae a la guía 2D. El resto anda normal.
- Lista de dispositivos compatibles: https://developers.google.com/ar/devices

## Lo primero que conviene mirar

Antes de probar la cámara, entrá a **🩺 Diagnóstico** (arriba a la derecha
en la lista de recetas). Te dice qué encontró la app:

| Fila | Lo que querés ver en el APK |
|---|---|
| Motor de visión | `YOLOv8n on-device (TFLite)` |
| Runtime TFLite nativo | `presente` |
| Módulo nativo de Viro | `presente` |
| Motor AR | `ViroReact (ARKit / ARCore)` |

Si alguna dice "ausente" o "simulado", el módulo nativo no quedó en el
build y no tiene sentido seguir probando esa función: mandame una captura
de esa pantalla.

## Qué esperar (y qué no)

**La detección de ingredientes va a fallar en la mayoría de los casos, y es
esperable.** El modelo que viene es YOLOv8n de COCO: reconoce banana,
manzana, naranja, brócoli y zanahoria, y **nada más**. Tomate, cebolla,
papa y huevo no los conoce. Ver `docs/VISION_MODEL.md`.

Para probar la cámara de verdad conviene apuntarle a una **zanahoria o una
banana**: si esos los detecta, el circuito completo funciona y lo que falta
es entrenar el modelo con el resto.

**La AR nunca la vi funcionando**, porque no tengo dispositivo. Es la parte
con más chances de necesitar ajustes.

## Cómo reportarme un problema

Con esto puedo diagnosticar casi cualquier cosa sin tener el celular:

1. **Qué pantalla** y qué hiciste.
2. **Captura de 🩺 Diagnóstico.**
3. **Qué pasó** vs qué esperabas.
4. Si la app crashea, el log:

```bash
adb logcat -s ReactNativeJS:V ReactNative:V Viro:V ExpoModules:V
```

(Necesitás activar "Depuración por USB" en Opciones de desarrollador.)

### Cosas que probablemente pasen, y qué significan

| Síntoma | Causa más probable |
|---|---|
| Diagnóstico dice "simulado" en el APK | `react-native-fast-tflite` no se linkeó; hay que rebuildear |
| La cámara detecta pero muy lento | El armado del tensor en JS tarda; se sube el intervalo o se baja la resolución |
| No detecta nada nunca | Umbral de confianza, o el ingrediente no está en las 5 clases que conoce |
| La AR no encuentra la mesada | Poca luz o superficie muy uniforme; probá con algo apoyado encima |
| Los marcadores "tiemblan" | Tracking inestable: botón Recalibrar |
| Los marcadores quedan lejos o encimados | Ajustamos radio y apertura del arco en `markerLayout.ts` |
| La app crashea al abrir la guía AR | Viro no linkeó, o falta ARCore en el celular |
