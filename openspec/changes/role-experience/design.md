# Design

## Context

La carga ya es una cadena lineal: valida el PDF, saca `flat_text`, pide a Gemini habilidades, idiomas y educación, y redondea un solo `experience_time` en `src/profile/experience.ts`. El perfil vive en IndexedDB, almacén `profile`, base `johai`. La pantalla muestra una fila «Experiencia». El veredicto todavía no está implementado; su contrato abierto envía ese número. Ver `proposal.md` para el motivo.

## Goals / Non-Goals

**Goals:**

- Una segunda salida estructurada, solo de roles, sobre el mismo `flat_text` y el mismo `GEMINI_MODEL`.
- El código filtra, redondea y guarda. El modelo no decide el corte ni el redondeo.
- Un perfil viejo, con `experience_time` numérico y sin `roles`, no se reutiliza.

**Non-Goals:**

- Un agente con memoria, herramientas o un tercer llamado.
- Sumar duraciones de experiencias distintas que compartan nombre.
- Mostrar `reliability` o `evidence` en la pantalla.
- Implementar el veredicto. Solo cambia el campo que su contrato envía.
- Reescribir `job-fit-assistant` ni `remove-rag`.
- Migrar el número viejo a una lista de roles.

## Decisions

### Dos cadenas, el mismo cliente

La primera cadena deja de pedir `experience_years` y `experience_months`. La segunda recibe solo `flat_text` y devuelve una lista. Cada ítem trae `role`, `experience_years`, `experience_months`, `reliability` y `evidence`. Usa el mismo chat de Gemini, sin project id y sin reintentos.

El prompt de la segunda cadena está en español y fija el techo de la fiabilidad:

- Cerca de 1: el CV nombra ese cargo y describe el trabajo.
- De 0.7 a menos de 1: es una parte directa del cargo, como Backend o Frontend dentro de Full Stack, y hay actividades de ese lado.
- Por debajo de 0.7: el título no fue el cargo, sale de tareas sueltas o básicas, o es un título más alto inferido. Aunque existan unas tareas de arquitectura, Arquitecto de software queda bajo 0.7.
- El tiempo de cada ítem es el entero de la experiencia de origen. La fiabilidad no lo acorta.

Alternativa considerada: meter los roles en la primera salida. El mismo prompt que lista habilidades empuja a inflar títulos. La segunda cadena puede fallar sola y abortar la carga aunque las habilidades ya se hayan leído.

### El código se queda con el corte y el redondeo

Después de una lista utilizable, cada ítem se conserva solo si `reliability` es un número de 0 a 1 y es mayor o igual que 0.7, y si `evidence` aparece en `flat_text`. Antes de comparar, los espacios seguidos se tratan como uno. Un ítem con campos incompletos, fiabilidad fuera de 0 a 1, o años y meses que el redondeo no acepta, se descarta. No aborta la carga.

`roundExperienceTime` se aplica a cada rol conservado. Lo guardado es `role`, `experience_time`, `reliability` y `evidence`. Los años y meses crudos no se guardan. Los roles descartados tampoco.

Si la segunda llamada lanza, se agota el tiempo o no devuelve una lista, la carga aborta, no se escribe el perfil de esa carga y se conserva el anterior. Una lista vacía, o una lista cuyos ítems se descartan todos, guarda el perfil con `roles: []`.

Alternativa considerada: que el modelo omita los roles débiles. El corte quedaría dentro del modelo. Aquí el modelo propone, incluso el arquitecto en 0.3, y el código tira.

### La barra gana un paso

Entre «Leer los datos con Gemini» y «Redondear la experiencia» entra «Proponer los roles». El tope de esa llamada es el mismo de la lectura con Gemini, 90 segundos. El total de pasos pasa de 6 a 7.

### El perfil viejo no se lee

`readProfile` acepta un registro solo si trae `roles` con esa forma. Un registro con `experience_time` numérico y sin `roles` se trata como ausencia de perfil. No se borra la base: la próxima carga que termina bien reemplaza el registro.

### La pantalla y el veredicto

La zona de perfil pinta una línea por rol conservado: nombre, `experience_time` y «años». Sin roles, no hay línea de experiencia y el perfil sigue contando como perfil. La llamada del veredicto, cuando exista, mapea `roles` a `role` y `experience_time`. No adjunta `reliability`, `evidence` ni lo descartado.

## Risks / Trade-offs

- [El modelo pone 0.8 a un arquitecto que no fue cargo] → El prompt obliga a dejar ese título bajo 0.7. El código no tiene una lista de títulos. Una frase real de arquitectura con fiabilidad alta todavía puede colarse.
- [El modelo calcula mal los meses de la experiencia de origen] → El redondeo sigue en código, pero los años y meses de partida los declara el modelo. Esta change no resta las fechas en código.
- [La segunda llamada alarga la carga y suma otro 503] → Si falla, no se guarda un perfil a medias. El paso tiene el mismo tope de 90 segundos.
- [Un perfil ya guardado desaparece al recargar] → No hay de dónde sacar los roles. Hay que volver a cargar el CV.
- [Dos deltas abiertos describen la experiencia] → `vacancy-fit` sigue diciendo que el veredicto envía un número. El delta de esta change es el contrato nuevo; la tarea de alineación corrige el texto de esa change.

## Migration Plan

Publicar el código nuevo basta. Quien ya tenga un perfil guardado vuelve a cargar el CV. Para volver atrás, se publica el código anterior y se borra la base `johai` en el navegador: el registro con `roles` no lo entiende la versión vieja.

## Open Questions

Ninguna que cambie los specs, el enfoque o las tareas.
