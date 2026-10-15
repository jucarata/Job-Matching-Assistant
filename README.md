# JOHAI

Asistente para comparar un CV con una vacante.

## Clave de Gemini

La clave se escribe en la fila de «Cargar CV» o «Reemplazar CV». El navegador la guarda y la rellena al abrir la página. La aplicación no pide project id.

## Perfil

Una carga válida guarda un solo `profile`:

- `tech_skills`
- `soft_skills`
- `languages`
- `roles`, cada uno con `role`, `experience_time`, `reliability` y `evidence`
- `education`
- `flat_text`, el texto extraído del PDF

El archivo PDF no se guarda.

## Veredicto

«Enviar» compara ese perfil con el texto del mensaje. La llamada usa `gemini-3.8-flash` (`GEMINI_MODEL`). Envía las habilidades, los idiomas, la educación, `flat_text` y los roles conservados; de cada rol solo `role` y `experience_time`.

La respuesta tiene tres piezas: `matches`, `mismatches` y `score` de 0 a 10 en pasos de 0.5. En la conversación se ven como «Coincidencias», «No coinciden» y «Puntaje».

El chat muestra un solo intercambio: el texto enviado y esa respuesta. Un envío nuevo reemplaza al anterior. Recargar la página no lo recupera.

## Corte

En Ajustes, «Postular desde» elige el corte en la misma grilla. Si no hay uno guardado, es 7. Un puntaje mayor o igual al corte se etiqueta «Postular»; uno menor, «No postular». Cambiar el corte vuelve a etiquetar el puntaje visible sin otra llamada.
