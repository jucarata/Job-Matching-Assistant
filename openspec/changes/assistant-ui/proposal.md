# Proposal

## Why

El perfil del CV ya tiene un flujo definido, y la pantalla que lo rodea todavía no. Sin una interfaz común, la carga del PDF y la conversación de un solo envío se construirían como pantallas distintas. Esta change fija esa interfaz ahora, antes de implementar, para que el código y la spec de la pantalla avancen juntos.

## What Changes

- Mostrar una sola pantalla con tres zonas: la conversación, el perfil y los ajustes. La conversación se ve desde el inicio y permanece inactiva hasta que existe un perfil.
- Con perfil, la acción primaria es Enviar. Reemplazar el CV es una acción secundaria que usa la misma carga de PDF. Mientras esa carga está en curso, Enviar permanece inactivo.
- Si el reemplazo termina bien, vaciar el borrador de la conversación y mostrar solo el perfil nuevo. Si se rechaza, conservar el perfil y el borrador.
- Aplicar un sistema visual de papel, tinta y un solo acento teal, con colores de resultado aparte.
- Trabajar anclado a la spec: un cambio de comportamiento en el código actualiza su escenario, y un cambio de escenario actualiza el código que lo cumple. Las dos cosas van en el mismo trabajo.

Supuestos de este cambio, corregibles antes de implementar:

- Enviar se muestra habilitado cuando hay perfil y no hay una carga en curso, pero esta change no llama a un modelo ni muestra una respuesta del asistente. El texto escrito sigue en el compositor. Cerrar el compositor al enviar, y mostrar una sola respuesta, entra con la change que produzca esa respuesta.
- Una carga exitosa borra ese borrador. Todavía no hay un mensaje ni una respuesta que conservar.
- La change `job-fit-assistant` sigue siendo la dueña de validar el PDF, extraer el texto, guardar chunks y estado, y rechazar una carga sin tocar el perfil anterior. Esta change no altera esos requisitos.
- El idioma de la interfaz es español.
- El fit con vacantes queda fuera.

## Capabilities

### New Capabilities

- `assistant-shell`: la pantalla del asistente, con la conversación inactiva sin perfil, habilitada cuando el perfil existe, y vaciada cuando un PDF nuevo reemplaza ese perfil con éxito.

### Modified Capabilities

- Ninguna. El proyecto aún no tiene specs durables. El comportamiento de `cv-profile` sigue en la change `job-fit-assistant`.

## Impact

- Añade la interfaz sobre la SPA en Vite, React y TypeScript que `job-fit-assistant` va a crear. Todavía no hay código de aplicación.
- La pantalla prevista en `job-fit-assistant` (carga, estado y ajustes) pasa a vivir dentro de este shell. Las tareas 3.1 y 3.2 de esa change y las de esta se solapan en la pantalla; los datos del perfil siguen en `cv-profile`.
- Dependencias de interfaz: Tailwind CSS, shadcn/ui sobre Radix, lucide-react, sonner, y la fuente IBM Plex Sans autoalojada.
- No hay backend, ni envío del texto de la conversación a Gemini, ni evaluación de vacantes.
