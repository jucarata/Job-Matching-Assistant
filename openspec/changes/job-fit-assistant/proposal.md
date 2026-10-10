# Proposal

## Why

El perfil que se compara con una vacante tiene que existir antes del veredicto. Esta primera etapa deja ese perfil listo en el navegador: el CV entra como PDF y sale como chunks, embeddings y un estado estructurado.

## What Changes

- Cargar un CV en PDF, validar el archivo y extraer su texto sin un modelo. El PDF no se guarda.
- Con ese texto, en paralelo: Gemini arma chunks por aspecto del CV y Gemini saca el estado estructurado. Luego se embedan los chunks y se guardan las dos salidas. Si un paso falla, se aborta toda la carga.
- Guardar, junto a los embeddings, un estado local del usuario: habilidades técnicas, habilidades blandas, idiomas con nivel, años de experiencia y títulos.
- Publicar la interfaz como sitio estático. Quien lo use escribe su propia API key de Gemini en la página.
- Mostrar el estado guardado. Esta etapa no recibe vacantes ni devuelve un fit.

Supuestos de este cambio, corregibles antes de implementar:

- La interfaz es una aplicación web estática, desplegada en GitHub Pages. No hay backend ni CLI.
- El único dato que la persona debe introducir para el modelo es su API key de Gemini, creada en Google AI Studio. No se pide project id ni ningún identificador de proyecto.
- Hay un solo perfil activo. Cargar otro PDF válido lo reemplaza.
- Cada carga es una ejecución nueva. No hay chat ni memoria de mensajes.
- El grafo es LangGraph, sin checkpointer. El texto del PDF se obtiene sin un modelo. Los chunks y el estado los propone Gemini. El redondeo de los años lo aplica el código. Los embeddings usan `gemini-embedding-2`.
- El idioma de la interfaz es español.
- El fit con vacantes, las coincidencias, las debilidades y el puntaje quedan fuera de esta change.

## Capabilities

### New Capabilities

- `cv-profile`: cargar un PDF, guardar chunks con embeddings y el estado estructurado, y no conservar el archivo.

### Modified Capabilities

- Ninguna. El proyecto aún no tiene specs.

## Impact

- Proyecto nuevo, sin código de aplicación. Esta change introduce la interfaz web y la base local del perfil.
- La página llama a la API de Gemini desde el navegador con LangGraph para los chunks, el estado y los embeddings. La API key no se guarda en el repositorio ni en el build.
- El PDF no se guarda. Se guardan los chunks, sus embeddings y el estado. No hay envío de postulaciones ni evaluación de vacantes.
