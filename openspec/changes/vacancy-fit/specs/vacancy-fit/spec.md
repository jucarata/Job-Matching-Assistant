# Spec Delta

## Purpose

Compara el profile completo de un CV con el mensaje de una vacante y devuelve la cobertura: coincidencias, huecos y un puntaje.

## ADDED Requirements

### Requirement: Pedir el veredicto con el profile y el mensaje
El sistema SHALL pedir el veredicto enviando `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education`, `flat_text` y el texto del mensaje. SHALL NOT enviar el corte de postulación.

#### Scenario: Envío con perfil y mensaje
- **WHEN** hay un `profile`, una clave de Gemini y el usuario envía un texto
- **THEN** la llamada incluye esos campos, `flat_text` y ese texto, y no incluye el corte

### Requirement: Pedir la comparación en inglés
El system prompt de la llamada SHALL estar en inglés. SHALL pedir `matches`, `mismatches` y `score`, y SHALL pedir esas listas en el idioma del `profile`. SHALL NOT pedir una recomendación de postular ni un consejo. SHALL indicar que las notas del mensaje no son requisitos del puesto.

#### Scenario: Prompt sin corte
- **WHEN** el sistema pide un veredicto
- **THEN** el system prompt está en inglés, pide esas tres piezas en el idioma del `profile` y no menciona el corte ni una recomendación de postular

### Requirement: Devolver la cobertura en la grilla
El sistema SHALL aceptar un veredicto con `matches`, `mismatches` y `score`. `matches` y `mismatches` SHALL ser listas de textos. `score` SHALL ser un número de 0 a 10 en pasos de 0.5. El sistema SHALL NOT redondear un `score` fuera de esa grilla.

#### Scenario: Veredicto utilizable
- **WHEN** el modelo devuelve las tres piezas y `score` es 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5 o 10
- **THEN** el sistema acepta ese veredicto

#### Scenario: Veredicto incompleto
- **WHEN** el modelo no devuelve las tres piezas utilizables, o `score` queda fuera de esa grilla
- **THEN** el sistema no acepta el veredicto

### Requirement: Comparar cada vacante por separado
El sistema SHALL NOT enviar mensajes ni veredictos anteriores al pedir un veredicto nuevo.

#### Scenario: Segundo envío
- **WHEN** el usuario envía otra vacante después de haber obtenido un veredicto
- **THEN** la llamada nueva no incluye el mensaje ni el veredicto anteriores

### Requirement: No pedir el veredicto sin clave o sin texto
El sistema SHALL NOT pedir el veredicto si falta la clave de Gemini o el texto del mensaje.

#### Scenario: Envío sin clave
- **WHEN** hay un `profile`, el mensaje tiene texto y no hay clave de Gemini
- **THEN** el sistema no pide el veredicto

#### Scenario: Envío sin texto
- **WHEN** hay un `profile` y una clave, y el mensaje está vacío
- **THEN** el sistema no pide el veredicto
