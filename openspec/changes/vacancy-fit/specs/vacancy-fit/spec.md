# Spec Delta

## Purpose

Compara el profile estructurado de un CV con el texto de una vacante y devuelve un veredicto de cuatro campos en inglés.

## ADDED Requirements

### Requirement: Pedir el veredicto con el profile y la vacante
El sistema SHALL pedir el veredicto enviando `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education` y el texto de la vacante. SHALL NOT enviar `flat_text` ni el archivo PDF.

#### Scenario: Envío con perfil y vacante
- **WHEN** hay un `profile`, una clave de Gemini y el usuario envía un texto de vacante
- **THEN** la llamada incluye esos campos estructurados y ese texto, y no incluye `flat_text`

### Requirement: Devolver las cuatro piezas
El sistema SHALL devolver `matches`, `weaknesses`, `score` y `apply_recommendation`. `matches` y `weaknesses` SHALL ser listas de textos. `score` SHALL ser un entero de 0 a 100. `apply_recommendation` SHALL ser booleano.

#### Scenario: Veredicto utilizable
- **WHEN** el modelo devuelve las cuatro piezas con esa forma
- **THEN** el sistema acepta ese veredicto

#### Scenario: Veredicto incompleto
- **WHEN** el modelo no devuelve las cuatro piezas utilizables
- **THEN** el sistema no muestra un veredicto e indica el error

### Requirement: Comparar cada vacante por separado
El sistema SHALL NOT enviar mensajes ni veredictos anteriores al pedir un veredicto nuevo.

#### Scenario: Segundo envío
- **WHEN** el usuario envía otra vacante después de haber obtenido un veredicto
- **THEN** la llamada nueva no incluye el mensaje ni el veredicto anteriores

### Requirement: No pedir el veredicto sin clave o sin vacante
El sistema SHALL NOT pedir el veredicto si falta la clave de Gemini o el texto de la vacante.

#### Scenario: Envío sin clave
- **WHEN** hay un `profile`, el mensaje tiene texto y no hay clave de Gemini
- **THEN** el sistema no pide el veredicto

#### Scenario: Envío sin texto
- **WHEN** hay un `profile` y una clave, y el mensaje está vacío
- **THEN** el sistema no pide el veredicto
