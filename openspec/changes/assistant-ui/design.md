# Design

## Context

El repositorio no tiene código de aplicación. La change `job-fit-assistant` define la carga del PDF, los chunks, el estado y el aviso de éxito o rechazo. Ver `proposal.md` para la motivación y `specs/assistant-shell/spec.md` para el comportamiento de la pantalla. Esta change construye el shell que hospeda esa carga.

## Goals / Non-Goals

**Goals:**

- Una pantalla con conversación, perfil y ajustes, en los estados de `assistant-shell`.
- Un solo acento para la acción primaria, y colores distintos para el resultado de la carga.
- El borrador de la conversación vive en memoria y se borra solo cuando un reemplazo termina bien.
- Cada comportamiento de esta change queda cubierto por un escenario, y el código que lo cumple viaja con ese escenario.

**Non-Goals:**

- Llamar a un modelo al pulsar Enviar, cerrar el compositor o mostrar una respuesta.
- Recibir una vacante o calcular un fit.
- Cambiar cómo `cv-profile` valida el PDF, persiste el perfil o aborta una carga.
- Guardar el borrador en IndexedDB o en `localStorage`.

## Decisions

### La pantalla sigue al perfil y a la carga

El shell no tiene ruta propia para la conversación. Lee si hay perfil y si hay una carga en curso, y elige el estado:

```
sin perfil -----------------> conversacion inactiva
                               primaria: Cargar CV
        | carga valida
        v
con perfil, sin carga ------> se puede escribir
                               primaria: Enviar
                               secundaria: Reemplazar CV
        | pulsar Enviar
        v
borrador se queda -----------> sin respuesta y sin llamada

con perfil, carga en curso -> Enviar inactivo
                               perfil visible = el anterior
        | exito                         | rechazo
        v                               v
borrador vacio, perfil nuevo     borrador y perfil iguales
conversacion habilitada          error junto a Reemplazar CV
```

«Cargar CV» y «Reemplazar CV» abren el mismo input de archivo del navegador. El primero es la acción primaria cuando no hay perfil. El segundo es un control neutro en la cabecera del perfil.

El borrador es estado de React. Recargar la página lo pierde; el perfil sigue el que haya dejado `cv-profile`. Pulsar Enviar no limpia el borrador, no cierra el compositor y no llama a Gemini.

Alternativa considerada: ocultar la conversación hasta que exista un perfil. La spec la deja visible e inactiva, con el texto «La conversación se abre cuando hay un perfil.»

### Dos columnas, y una encima de la otra bajo 768 px

En ancho de 768 px o más, la conversación ocupa la columna izquierda y el perfil la derecha. Por debajo de 768 px, la conversación queda encima del perfil. Los ajustes se abren en un diálogo, fuera de la conversación. La entrada se llama «Ajustes».

El aviso de éxito de una carga usa sonner. El rechazo no: queda en un alert junto al control que inició la carga («Cargar CV» si no había perfil, «Reemplazar CV» si había).

### Papel, tinta y un solo teal

Los tokens viven en variables CSS y Tailwind los consume. IBM Plex Sans se autoaloja con `@fontsource-variable/ibm-plex-sans`.

| Token | Hex | Uso |
|---|---|---|
| Papel | `#F4F1EA` | Fondo |
| Superficie | `#FFFDF8` | Perfil y tarjetas |
| Superficie 2 | `#EFEBE3` | Borrador y zonas en reposo |
| Línea | `#DDD8CE` | Bordes |
| Tinta | `#1A1814` | Texto |
| Tinta suave | `#6B6560` | Ayuda |
| Teal | `#0F5C57` | Acción primaria y foco |
| Teal hover | `#0C4A46` | Acción primaria al pasar el cursor |
| Teal suave | `#E5F2F1` | Paso activo |
| Ok | `#1F6B3A` / `#E7F3EC` | Carga terminada |
| Aviso | `#8A5A12` / `#F8F0E0` | Estado incompleto |
| Error | `#9F2D2D` / `#F8E8E8` | Rechazo |

Cuerpo a 16 px, metadatos a 14 px. Radio de 10 px en tarjetas y 8 px en controles. El foco es un anillo de 2 px en teal. La transición entre estados dura de 150 a 200 ms. No hay degradados ni animación en bucle.

La variante primaria del botón se monta una sola vez. Sin perfil es «Cargar CV». Con perfil, y sin una carga en curso, es «Enviar».

### Librerías

- Tailwind CSS para el layout y los tokens.
- shadcn/ui sobre Radix: button, input, label, card, alert, dialog, scroll-area.
- lucide-react para iconos.
- sonner para el aviso de carga terminada.
- `class-variance-authority`, `clsx` y `tailwind-merge`.

Alternativa considerada: un kit de chat. Empuja a un hilo de varios mensajes, y esta conversación todavía no envía.

### Ancla entre spec y código

El escenario de `assistant-shell` es el contrato del comportamiento. Implementar un escenario y cambiar el comportamiento sin actualizar su WHEN/THEN deja la tarea incompleta. Editar un escenario sin actualizar el código y la prueba que lo cubren también. Las tareas de esta change nombran los escenarios que cumplen. El texto visible que fija la spec («Cargar CV», «Enviar», «Reemplazar CV», «Ajustes» y la frase de conversación cerrada) se comparte entre la interfaz y las pruebas.

Esta ancla vale para esta change y es la forma de trabajo de las siguientes: el código y su spec se modifican en el mismo trabajo.

### Orden con `job-fit-assistant`

Esta change no reimplementa el grafo ni IndexedDB. Consume «hay perfil», «carga en curso», «carga terminada» y «carga rechazada». Si el esqueleto Vite, React y TypeScript de esa change aún no existe, esta change lo crea y deja el grafo para `job-fit-assistant`. Las tareas 3.1 y 3.2 de esa change describen la misma pantalla; al implementarlas, la pantalla es este shell.

## Risks / Trade-offs

- [Enviar está habilitado y no hace un envío] → El borrador permanece y no aparece una respuesta. La change que produzca la respuesta cierra el compositor y sustituye este escenario.
- [El borrador se pierde al recargar] → No se persiste. El perfil sí, por `cv-profile`.
- [Las dos changes describen la pantalla] → Este shell es la pantalla. `cv-profile` sigue dueño de los datos y del texto de error de la carga.
- [Una carga rechazada y un borrador conviven] → El error queda junto a «Reemplazar CV» y el borrador no se toca.

## Migration Plan

No hay sistema previo que migrar. El primer build publica el shell estático. Para volver atrás basta con dejar de publicar ese build.

## Open Questions

Ninguna que cambie los escenarios, el enfoque o las tareas. El contenido de la respuesta al pulsar Enviar queda fuera, a propósito, para una change posterior.
