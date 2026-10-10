# Tasks

## 1. Proyecto web

- [ ] 1.1 Crear la SPA con Vite, React y TypeScript, y un workflow de GitHub Actions que publique el build estático en GitHub Pages sin inyectar una API key. Verificar que `npm run build` genera la carpeta estática y que el workflow no referencia secretos de modelo.
- [ ] 1.2 Documentar en `README.md` cómo crear una API key en Google AI Studio, que el único dato a pegar es esa clave y que no se usa project id. Verificar que el README dice eso y no pide variables de entorno de modelo para el sitio publicado.

## 2. Perfil de CV

- [ ] 2.1 Extraer el texto de un PDF con `pdfjs-dist`, sin llamar a un modelo, y rechazar un archivo que no sea PDF o un PDF sin texto. Verificar con pruebas: PDF con capa de texto, PDF sin texto y archivo que no es PDF. El PDF no se escribe en almacenamiento.
- [ ] 2.2 Armar el grafo de LangGraph sin checkpointer ni historial de mensajes: validar PDF, extraer texto, y en paralelo generar chunks por aspecto y extraer el estado. El nodo final avisa éxito solo si ambas escrituras terminaron. Si un nodo falla, abortar, borrar lo escrito en esa carga y conservar el perfil anterior. Verificar con clientes falsos: archivo que no es PDF, PDF sin texto, fallo de chunks, fallo de embeddings, fallo del estado, una rama que guarda y la otra que falla, y éxito de las dos. Una segunda invocación no recibe el texto ni los mensajes de la primera.
- [ ] 2.3 Aplicar en código el redondeo de `experience_time`: 2 años y 3 meses quedan en 2, 2 años y 6 meses quedan en 3, y 1.5 años queda en 1.5, con como máximo un decimal. Verificar esas tres pruebas sin llamar a un modelo.
- [ ] 2.4 Pedir a `gemini-3.5-flash` chunks con aspecto (experiencia, educación, perfil u otra sección del CV) y el estado (`tech_skills`, `soft_skills`, `languages` con nivel `básico`, `intermedio`, `avanzado` o `nativo`, `experience_time` y `education`). Embedar cada chunk con `gemini-embedding-2` a 768 dimensiones y guardar texto, aspecto y embedding junto con el estado en IndexedDB. Verificar con clientes falsos que un CV de varias secciones produce chunks distinguidos por aspecto y que no se usa un corte por cantidad fija de caracteres.
- [ ] 2.5 Guardar la API key en `localStorage`, reutilizarla al reabrir la página y no pedir project id. Verificar con pruebas: clave guardada y releída, y ajustes sin campo de project id.

## 3. Pantalla

- [ ] 3.1 Armar la pantalla con la carga de un PDF, el estado del perfil y los ajustes de la API key. Los rechazos (sin clave, PDF vacío o archivo que no es PDF) se muestran sin modificar el perfil anterior. Verificar con pruebas de interfaz: carga de PDF, estado visible sin el archivo, reemplazo, carga sin clave y archivo inválido.
- [ ] 3.2 Actualizar `README.md` con las zonas de la pantalla y el modelo por defecto. Verificar que el README describe esas zonas, que no describe un fit de vacantes y que el build no contiene una API key de ejemplo.

## Workflow follow-up

- Archivar la change cuando la implementación cumpla las specs y las pruebas pasen.
- Comprobar el resultado archivado con `openspec validate`.
- Abrir otra change para el fit con vacantes.
