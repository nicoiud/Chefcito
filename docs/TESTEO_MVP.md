# Probar el MVP completo en tu Samsung

Todo el código está escrito. Lo que falta es **compilar y probar**, y eso
requiere un dispositivo real que yo no tengo.

## Qué falta, exactamente

| # | Qué | Quién | Cuánto |
|---|---|---|---|
| 1 | Compilar el APK | vos (EAS, gratis) | ~20 min, casi todo espera |
| 2 | Verificar ARCore en el Samsung | vos | 2 min |
| 3 | Levantar backend + Ollama | vos | 5 min |
| 4 | Probar y reportar qué falla | los dos | iterativo |
| 5 | Entrenar el modelo de visión | pendiente | horas + GPU |

Solo el 5 es trabajo grande. Los cuatro primeros son configuración.

---

## 1. Compilar el APK

```bash
npm install -g eas-cli
eas login                    # cuenta de Expo, gratis
eas build --platform android --profile development
```

Cuando termina te da un link. Bajás el APK al celular, lo tocás, y aceptás
"instalar apps de origen desconocido". **No hace falta modo desarrollador**
para esto.

Usá el perfil `development`: los cambios de JavaScript se recargan sin
recompilar. Solo necesitás un APK nuevo si tocamos dependencias nativas.

## 2. Verificar ARCore

Los Samsung de gama media y alta de los últimos años lo soportan. Fijate en
la [lista oficial](https://developers.google.com/ar/devices) y, si está,
instalá **"Servicios de Google Play para RA"** desde Play Store.

Si tu modelo no está: la app funciona igual, solo que la pantalla de AR
muestra la guía 2D.

## 3. Backend con Ollama (gratis)

En tu computadora:

```bash
ollama pull qwen3:7b

# Importante: por defecto Ollama solo escucha en localhost y el celular
# no lo alcanzaría.
OLLAMA_HOST=0.0.0.0 ollama serve
```

En otra terminal:

```bash
cd backend && npm install
LLM_PROVIDER=ollama OLLAMA_MODEL=qwen3:7b npm start
```

Sobre qué modelo elegir según tu GPU, ver [`backend/README.md`](../backend/README.md).
Resumen: el asistente responde tres oraciones en español, así que un 7B
alcanza de sobra y uno más grande solo agrega demora.

### Conectar el celular

`localhost` desde el celular apunta al **propio celular**, no a tu
computadora. Hay que usar la IP de tu máquina en la red local:

```bash
# Linux / macOS
ip addr | grep "inet 192" || ifconfig | grep "inet 192"
# Windows
ipconfig
```

Con esa IP (por ejemplo `192.168.0.10`), arrancás Metro así:

```bash
EXPO_PUBLIC_ASSISTANT_API_URL=http://192.168.0.10:3000/ask npx expo start --dev-client
```

Las variables `EXPO_PUBLIC_*` se resuelven al armar el bundle, y con un
development build eso pasa cuando arranca Metro. O sea: **cambiar esta URL
no requiere recompilar el APK**, solo reiniciar Metro.

El celular y la computadora tienen que estar en la misma red WiFi. Si no
conecta, suele ser el firewall de la compu bloqueando el puerto 3000.

---

## 4. Qué probar, en orden

### Primero: 🩺 Diagnóstico

Arriba a la derecha en la lista de recetas. **Antes de probar nada más.**

| Fila | Lo que tiene que decir |
|---|---|
| Motor de visión | `YOLOv8n on-device (TFLite)` |
| Runtime TFLite nativo | `presente` |
| Módulo nativo de Viro | `presente` |
| Motor AR | `ViroReact (ARKit / ARCore)` |

Si alguna dice "ausente" o "simulado", el módulo no quedó en el build y no
tiene sentido seguir: mandame la captura.

### Después, en este orden

1. **Recetas y modo cocinar** — debería andar todo. Si algo falla acá, es un
   bug común y fácil de arreglar.
2. **Asistente** — probá "¿qué ingredientes lleva?" (responde local, sin
   gastar cupo) y después una pregunta abierta como "¿puedo reemplazar la
   manteca?" (va a Ollama). El contador de arriba tiene que bajar solo con
   la segunda.
3. **Cámara** — apuntale a una **zanahoria o una banana**. Son de las 5
   cosas que el modelo actual reconoce. Si esas las detecta, el circuito
   completo funciona.
4. **Corrección manual** — con cualquier ingrediente: tocá "Ya lo tengo" y
   verificá que el paso se complete.
5. **AR** — lo último, porque es lo que nunca corrió. Movés el celular
   despacio apuntando a la mesada hasta que detecte el plano, y tocás.

---

## 5. Lo que va a fallar (y no es un bug)

**La cámara casi no va a reconocer nada.** El modelo que viene es YOLOv8n
de COCO: conoce banana, manzana, naranja, brócoli y zanahoria, y nada más.
**Tomate, cebolla, papa y huevo no los conoce.** Eso se arregla entrenando
(paso 5), no ajustando código.

Por eso la corrección manual importa tanto: es lo que hace la función usable
mientras tanto.

**La AR es lo más probable que necesite ajustes.** Escribí la escena contra
la API de Viro leyendo sus tipos, pero nunca la vi ejecutarse.

---

## Cómo reportarme un problema

1. Qué pantalla y qué hiciste.
2. Captura de 🩺 Diagnóstico.
3. Qué pasó vs qué esperabas.
4. Si crashea, el log (necesita modo desarrollador + depuración USB):

```bash
adb logcat -s ReactNativeJS:V ReactNative:V Viro:V
```

### Síntomas probables

| Síntoma | Causa más probable |
|---|---|
| Diagnóstico dice "simulado" | El módulo nativo no se linkeó; rebuild |
| El asistente dice "no configurado" | La URL del backend, o el firewall |
| Ollama no responde | Falta `OLLAMA_HOST=0.0.0.0` |
| La cámara no detecta nada | Normal: probá con zanahoria o banana |
| Detección muy lenta | El armado del tensor en JS; subimos el intervalo |
| La AR no encuentra la mesada | Poca luz o superficie muy uniforme |
| Los marcadores tiemblan | Tracking inestable: botón Recalibrar |
| Marcadores lejos o encimados | Ajustamos el arco en `markerLayout.ts` |
| Crashea al abrir la guía AR | Viro no linkeó, o falta ARCore |

---

## Sobre Ollama en producción

Ollama sirve para **desarrollo**: es gratis y no depende de internet. Pero
no es una opción para los usuarios finales, que no van a tener un servidor
corriendo en su casa. Para publicar hay que cambiar a `LLM_PROVIDER=anthropic`
con la API key en el servidor desplegado.

La interfaz es la misma, así que el cambio es una variable de entorno.
