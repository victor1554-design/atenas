# TikTok Live Plotter

Aplicación de React con un servidor Express para conectar TikTok Live y mostrar interacciones y overlays para OBS.

## 1. Requisitos

- Node.js y npm. El arranque local se verificó con Node.js `22.14.0` y npm `10.9.2`.
- Internet para instalar las dependencias y conectar con TikTok.
- Una cuenta transmitiendo en vivo para probar la conexión a TikTok Live.

Comprueba la instalación desde PowerShell o una terminal:

```powershell
node --version
npm --version
```

## 2. Abrir la carpeta del proyecto

Abre una terminal en la carpeta que contiene `package.json`. En este equipo:

```powershell
cd "C:\Users\jroja\OneDrive\Escritorio\TikTokVictor\TIKTOK"
```

Si descargaste el proyecto en otra ubicación, cambia la ruta.

## 3. Instalar las dependencias

Ejecuta la primera vez que prepares el proyecto:

```powershell
npm install --legacy-peer-deps
```

Se utiliza `--legacy-peer-deps` porque las versiones actuales de Vite y esbuild declaradas en el proyecto presentan un conflicto de dependencias peer. Este fue el comando utilizado para instalar y levantar la aplicación en local.

Espera a que termine la instalación y la terminal vuelva a permitir escribir comandos. Solo necesitas repetirla si cambian las dependencias o eliminas `node_modules`.

## 4. Configuración de entorno

Para el funcionamiento actual no necesitas crear `.env.local` ni configurar una clave de Gemini: el código actual no utiliza `GEMINI_API_KEY` ni `APP_URL`. El archivo `.env.example` conserva esas variables como referencia de la plantilla original.

## 5. Iniciar el proyecto

Desde la carpeta del proyecto, ejecuta:

```powershell
npm run dev
```

Espera a que aparezca:

```text
[TikTok Live Plotter] Servidor activo en http://0.0.0.0:3000
```

Abre **http://localhost:3000** en tu navegador.

Este comando inicia tanto la API como el frontend con Vite. Mantén la terminal abierta mientras uses la aplicación.

## 6. Conectar TikTok Live

1. Inicia una transmisión en vivo en TikTok.
2. Abre http://localhost:3000.
3. En el panel de conexión, ingresa el usuario que está transmitiendo, con o sin `@`.
4. Pulsa el botón de conexión y comprueba el estado que muestra la aplicación.

Puedes comprobar que la API está activa abriendo http://localhost:3000/api/tiktok/status. Antes de conectar una cuenta, es normal que muestre `"isConnected": false`.

## 7. Usar el overlay en OBS (opcional)

1. Selecciona la aplicación que quieres mostrar y utiliza su opción **Copiar URL OBS** o **OBS Overlay**.
2. En OBS Studio, agrega una fuente de tipo **Navegador**.
3. Pega la URL del overlay y ajusta sus dimensiones a tu escena.
4. Mantén el servidor local ejecutándose durante la transmisión.

Ejemplos de enlaces para OBS en el mismo equipo:

- Fútbol: http://localhost:3000/?app=soccer&overlay=1
- Impresora: http://localhost:3000/?app=printer&overlay=1

La aplicación incluye una guía de OBS con más detalles.

## 8. Detener y volver a iniciar

Presiona **Ctrl + C** en la terminal donde ejecutaste `npm run dev`. Si PowerShell pide confirmar la finalización, confírmala.

Para volver a iniciarlo, abre una terminal en la carpeta del proyecto y ejecuta:

```powershell
npm run dev
```

## Problemas frecuentes

- **`node` o `npm` no se reconoce:** instala Node.js y vuelve a abrir la terminal.
- **Error `ERESOLVE` al instalar:** utiliza `npm install --legacy-peer-deps`.
- **Puerto 3000 ocupado (`EADDRINUSE`):** comprueba si el proyecto ya está abierto en http://localhost:3000. Para reiniciarlo, detén su terminal anterior con **Ctrl + C** antes de volver a ejecutar el comando.
- **TikTok no conecta:** comprueba internet, el nombre de usuario y que la cuenta esté transmitiendo en vivo. Revisa el error que devuelve la aplicación.
- **El overlay no carga en OBS:** comprueba que el servidor siga activo y que la URL abra en el navegador del mismo equipo.

## Otros comandos

```powershell
# Comprobar tipos de TypeScript
npm run lint

# Generar el frontend en dist/
npm run build
```

Para servir el frontend compilado junto con la API en PowerShell:

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

Al terminar, detén el servidor con **Ctrl + C**. Antes de volver al modo de desarrollo en esa misma terminal, elimina la variable:

```powershell
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
npm run dev
```
