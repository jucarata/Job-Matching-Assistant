# Tasks

## 1. Base visual

- [x] 1.1 Crear la SPA con Vite, React y TypeScript solo si aún no existe, y dejar listos Tailwind, las piezas de shadcn/ui (button, input, label, card, alert, dialog, scroll-area), lucide-react, sonner, `@fontsource-variable/ibm-plex-sans`, `class-variance-authority`, `clsx` y `tailwind-merge`. Verificar que `npm run build` genera el estático y que el paquete de la fuente está importado.
- [x] 1.2 Definir las variables CSS del diseño (papel `#F4F1EA`, superficie `#FFFDF8`, superficie 2 `#EFEBE3`, línea `#DDD8CE`, tinta `#1A1814`, tinta suave `#6B6560`, teal `#0F5C57`, teal hover `#0C4A46`, teal suave `#E5F2F1`, ok `#1F6B3A` / `#E7F3EC`, aviso `#8A5A12` / `#F8F0E0`, error `#9F2D2D` / `#F8E8E8`), IBM Plex Sans, cuerpo a 16 px y radio de 10 px / 8 px. Verificar con una prueba que esas variables existen en la hoja de estilos.

## 2. Pantalla sin perfil

- [x] 2.1 Armar las tres zonas en la misma pantalla: conversación a la izquierda y perfil a la derecha desde 768 px, y conversación encima del perfil por debajo de 768 px. Verificar los escenarios Pantalla inicial y Ventana estrecha. Si el layout observado cambia alguno, actualizar ese escenario en `specs/assistant-shell/spec.md` en esta misma tarea.
- [x] 2.2 Sin perfil, mostrar la conversación inactiva con el texto «La conversación se abre cuando hay un perfil.», «Cargar CV» como única acción primaria, la zona de perfil vacía, etiquetas visibles en español y foco visible. «Cargar CV» abre el input de archivo. Verificar los escenarios Sin perfil de conversación inactiva, Aviso de conversación cerrada, Sin perfil de la acción primaria, Zona vacía y Control enfocado. Si el texto o el comportamiento cambian, actualizar el escenario en la misma tarea.
- [x] 2.3 Abrir «Ajustes» en un diálogo, fuera de la zona de conversación. Verificar el escenario Abrir ajustes. Si los ajustes pasan a vivir dentro de la conversación, actualizar ese escenario en la misma tarea.

## 3. Pantalla con perfil

- [x] 3.1 Con perfil y sin carga en curso, permitir escribir, mostrar «Enviar» como única acción primaria, «Reemplazar CV» como acción secundaria que abre el mismo input de archivo, y el estado del perfil en su zona. El borrador vive en memoria. Verificar los escenarios Perfil listo, Perfil existente y Perfil activo. Si la acción primaria deja de ser única, actualizar el escenario en la misma tarea.
- [x] 3.2 Al pulsar «Enviar», conservar el texto en el compositor, no llamar a un modelo y no mostrar una respuesta. Verificar el escenario Envío sin respuesta, incluyendo que esa acción no hace una petición de red. Si Enviar pasa a producir una respuesta, actualizar ese escenario en la misma tarea.
- [x] 3.3 Mientras una carga está en curso, inactivar «Enviar» y seguir mostrando el perfil anterior. Verificar el escenario Reemplazo en curso. Si el perfil visible cambia antes de terminar la carga, actualizar ese escenario en la misma tarea.
- [x] 3.4 Cuando una carga termina bien, vaciar el borrador, mostrar solo el perfil nuevo, dejar la conversación habilitada y avisar el éxito con sonner. Cubre la primera carga y el reemplazo. Verificar los escenarios Primera carga válida y Reemplazo válido. Si el borrador se conserva tras el éxito, actualizar el escenario en la misma tarea.
- [x] 3.5 Cuando una carga de reemplazo se rechaza, conservar el perfil y el borrador, y mostrar el error junto a «Reemplazar CV». Verificar el escenario Reemplazo rechazado. Si el borrador se borra en el rechazo, actualizar ese escenario en la misma tarea.

## Workflow follow-up

- Archivar la change cuando la implementación cumpla los escenarios de `assistant-shell` y las pruebas pasen.
- Comprobar el resultado archivado con `openspec validate`.
- En el trabajo siguiente, código y spec se modifican juntos: un comportamiento nuevo actualiza su escenario, y un escenario editado actualiza el código que lo cumple.
