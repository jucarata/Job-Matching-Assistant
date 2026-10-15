# Design

## Context

El repositorio no tiene código de aplicación: solo OpenSpec. Ver `proposal.md` para la motivación. La spec `cv-profile` fija esta primera etapa. La app es una web estática en GitHub Pages, sin servidor. Cada persona pega su API key de Gemini en la fila de carga y el navegador llama a la API para leer el CV. El fit con vacantes no entra aquí.

## Goals / Non-Goals

**Goals:**

- Una SPA en TypeScript con la que se carga un PDF y se ve el estado guardado.
- Un solo `profile` en una base local del navegador, con `flat_text`. La API key de Gemini también persiste en el navegador.
- Publicación en GitHub Pages a partir del build estático.
- Pruebas de los escenarios de `cv-profile` sin llamar a Gemini.

**Non-Goals:**

- Recibir una vacante, calcular coincidencias, debilidades, puntaje o recomendación de postular.
- Consultas exactas sobre el estado. Esta change lo guarda y no define cómo se consulta.
- Backend, funciones serverless o lectura de GitHub Secrets en el sitio publicado.
- Cuentas de usuario, varios CV a la vez o un project id de Google.
- Rastreo de portales de empleo, envío de postulaciones o contacto con empleadores.
- OCR de PDF escaneados. Un PDF sin capa de texto se rechaza.
- Partir el CV en chunks o guardar vectores.

## Decisions

### SPA con Vite, React y TypeScript

La app es una SPA construida con Vite. El build genera archivos estáticos y GitHub Actions los publica en GitHub Pages. `base` de Vite usa el nombre del repositorio para que las rutas funcionen en `https://<usuario>.github.io/<repo>/`.

La pantalla tiene la fila de carga del PDF, con la clave de Gemini en esa misma fila, y el estado del perfil. Los ajustes no piden la clave. Si falta la clave, el archivo no es PDF o el PDF no tiene texto, se muestra el error y el perfil anterior no cambia.

Alternativa considerada: Next.js. Su valor está en el servidor y en las rutas de API, y GitHub Pages no ejecuta ninguno de los dos.

### Solo la API key de Gemini, en la fila de carga

El único secreto que introduce la persona es su API key de Gemini, creada en Google AI Studio. Se guarda en `localStorage` y se envía como `x-goog-api-key` al leer el CV. No se escribe en el repositorio, en el bundle ni en GitHub Secrets. El campo está en la fila de «Cargar CV» y de «Reemplazar CV», no en los ajustes.

No se pide project id. Ese id identifica el proyecto de Google de quien creó la clave. La propia clave ya pertenece a esa cuenta. Pedirlo en la app ataría las llamadas a un solo proyecto e impediría que otra persona use la suya.

El id de modelo para el estado tiene un valor por defecto en el código (`gemini-3.5-flash`). Quien solo pega su clave ya puede cargar un CV.

La API de Gemini responde al preflight de un origen `github.io` con `Access-Control-Allow-Origin` de ese origen y permite la cabecera `x-goog-api-key`. La página llama directo, sin proxy.

Alternativa considerada: leer la clave desde GitHub Secrets durante el build. El valor quedaría dentro del JavaScript público.

### Base local en IndexedDB

El perfil vive en IndexedDB, no en un servidor. Hay un solo almacén, `profile`, con un `profile` que incluye `flat_text`. No hay almacén de chunks ni campo de vectores. La API key sigue en `localStorage` porque es un secreto corto, distinta del CV. Una carga nueva que termina bien borra el perfil anterior y escribe el nuevo. Una carga rechazada no toca lo ya guardado. El archivo PDF no se escribe en ningún almacén.

### Una cadena lineal de LangChain por carga, sin memoria de chat

Cada carga invoca una cadena lineal de LangChain con estado nuevo. No hay historial de mensajes. La única persistencia entre cargas es el `profile` ya guardado y la API key, no la conversación.

```
[1 validar PDF] --no--> error, perfil anterior intacto
        |
       si
        v
[2 texto sin modelo] --falla--> error, perfil anterior intacto
        |
       ok
        v
[3 estado con el modelo; el código asigna flat_text y redondea experience_time]
        |
        v
[4 guardar el profile]
        |
        v
[5 avisar éxito]
```

El paso 1 solo comprueba que el archivo sea PDF. El paso 2 usa `pdfjs-dist` y no llama a Gemini. Si el texto no sale, la cadena no sigue. El texto extraído se asigna a `flat_text` sin pasar por el modelo.

El paso 3 pide a `gemini-3.5-flash` el estado en JSON: `tech_skills`, `soft_skills`, `languages` (`language` y `level`), `experience_time` y `education`. Los niveles de idioma admitidos son `básico`, `intermedio`, `avanzado` y `nativo`. El código, no el modelo, aplica el redondeo de `experience_time`: menos de 6 meses sobrantes dejan el entero de años; 6 meses o más suben al año siguiente; un valor ya escrito como `1.5` años se guarda como `1.5`. El paso 4 escribe ese `profile`, con `flat_text`.

Si cualquier paso falla, la cadena se detiene, muestra un error que dice qué paso falló y deja el perfil anterior intacto. No se avisa éxito.

Alternativa considerada: partir el texto por caracteres y guardar esos trozos. El `profile` con `flat_text` conserva el CV literal en un solo campo.

### Pruebas con un cliente falso

Los escenarios de spec se prueban con Vitest. El cliente del modelo se inyecta. Las pruebas no abren red. Las de perfil usan una IndexedDB de prueba. El redondeo de `experience_time` se prueba aparte, sin modelo.

## Risks / Trade-offs

- [El modelo inventa habilidades o títulos que el CV no trae] → El prompt pide extraer solo lo que el texto sostiene. Las pruebas cubren la forma del estado, no la calidad de un modelo concreto.
- [Un PDF escaneado parece un archivo válido y se rechaza] → El mensaje dice que no hay texto extraíble. No se añade OCR en esta change.
- [La API key es visible en el navegador de quien la pegó] → Vive en `localStorage` de esa persona. El sitio publicado no la contiene. Otra persona crea la suya en Google AI Studio.
- [El texto del CV sale del navegador al leerlo] → Se envía a Gemini para el estado. `flat_text` queda en el navegador. El PDF y el perfil no se commitean.

## Migration Plan

No hay sistema previo que migrar. El primer uso guarda la API key y el `profile`, incluido `flat_text`, en el navegador. Para volver atrás basta con dejar de publicar el sitio y borrar esos datos en el navegador.

## Open Questions

Ninguna que cambie esta etapa. El fit con vacantes y las consultas exactas sobre el estado se especifican en una change posterior. El único dato que introduce quien usa la app es la API key de Gemini, en la fila de carga.
