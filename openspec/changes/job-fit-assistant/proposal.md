# Proposal

## Why

El perfil que se compara con una vacante tiene que existir antes del veredicto. Esta primera etapa deja ese perfil listo en el navegador: el CV entra como PDF y sale como un `profile` con `flat_text`.

## What Changes

- Cargar un CV en PDF, validar el archivo y extraer su texto sin un modelo. El PDF no se guarda. Ese texto queda en `flat_text`.
- Con una cadena lineal de LangChain, Gemini saca el resto del `profile`. Si un paso falla, se aborta toda la carga.
- Guardar un estado local del usuario: habilidades técnicas, habilidades blandas, idiomas con nivel, años de experiencia, títulos y `flat_text`.
- Publicar la interfaz como sitio estático. Quien lo use escribe su propia API key de Gemini en la fila de carga del CV.
- Mostrar el estado guardado. Esta etapa no recibe vacantes ni devuelve un fit.

Supuestos de este cambio, corregibles antes de implementar:

- La interfaz es una aplicación web estática, desplegada en GitHub Pages. No hay backend ni CLI.
- El único dato que la persona debe introducir para el modelo es su API key de Gemini, creada en Google AI Studio. No se pide project id ni ningún identificador de proyecto. La clave está en la fila de carga, no en los ajustes.
- Hay un solo perfil activo. Cargar otro PDF válido lo reemplaza, incluido `flat_text`.
- Cada carga es una ejecución nueva. No hay chat ni memoria de mensajes.
- La carga es una cadena lineal de LangChain. El texto del PDF se obtiene sin un modelo y se guarda como `flat_text`. El resto del `profile` lo propone Gemini. El redondeo de los años lo aplica el código.
- El idioma de la interfaz es español.
- El fit con vacantes, las coincidencias, las debilidades y el puntaje quedan fuera de esta change.

## Capabilities

### New Capabilities

- `cv-profile`: cargar un PDF, guardar el `profile` con `flat_text` y no conservar el archivo.

### Modified Capabilities

- Ninguna. El proyecto aún no tiene specs.

## Impact

- Proyecto nuevo, sin código de aplicación. Esta change introduce la interfaz web y la base local del perfil.
- La página llama a la API de Gemini desde el navegador con una cadena de LangChain para el estado. La API key no se guarda en el repositorio ni en el build, y se escribe en la fila de carga.
- El PDF no se guarda. Se guarda el `profile`, incluido `flat_text`. No hay envío de postulaciones ni evaluación de vacantes.
