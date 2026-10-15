# Spec Delta

## MODIFIED Requirements

### Requirement: Pedir el veredicto con el profile y el mensaje
El sistema SHALL pedir el veredicto enviando `tech_skills`, `soft_skills`, `languages`, `roles`, `education`, `flat_text` y el texto del mensaje. De `roles` SHALL enviar solo los conservados, y de cada uno solo `role` y `experience_time`. De `education` SHALL enviar cada entrada guardada con `name`, `issuer` y `status`. SHALL NOT enviar `reliability`, `evidence`, los roles descartados, un `experience_time` suelto, `end_year`, `end_month`, `ongoing` ni el corte de postulación.

#### Scenario: Envío con perfil y mensaje
- **WHEN** hay un `profile`, una clave de Gemini y el usuario envía un texto
- **THEN** la llamada incluye los roles conservados con `role` y `experience_time`, la educación guardada con `name`, `issuer` y `status`, `flat_text` y ese texto, y no incluye el corte

#### Scenario: Un rol descartado no viaja
- **WHEN** el perfil conservó Full Stack y descartó Arquitecto de software, y el usuario envía un texto
- **THEN** la llamada incluye Full Stack y no incluye Arquitecto de software, `reliability`, `evidence` ni un `experience_time` suelto

#### Scenario: La fecha cruda no viaja
- **WHEN** una entrada de educación quedó guardada con `status` `FINALIZADO` y el usuario envía un texto
- **THEN** la llamada incluye `name`, `issuer` y `status`, y no incluye `end_year`, `end_month` ni `ongoing`

## ADDED Requirements

### Requirement: Respetar el estado de la educación
El sistema SHALL tratar `FINALIZADO` como un título o certificado ya obtenido y `ACTUALMENTE` como uno que sigue en curso. Si `status` es null, SHALL NOT afirmar ninguna de las dos. Para ese punto, `status` SHALL mandar sobre una fecha leída en `flat_text`.

#### Scenario: Un título ya marcado como finalizado
- **WHEN** `education` trae Ingeniero en Sistemas con `status` `FINALIZADO` y `flat_text` contiene marzo de 2026
- **THEN** el veredicto no trata ese título como pendiente ni como una fecha estimada de graduación

#### Scenario: Un estudio en curso
- **WHEN** una entrada trae `status` `ACTUALMENTE`
- **THEN** el veredicto trata ese estudio como todavía en curso

#### Scenario: Educación sin estado
- **WHEN** una entrada trae `status` null
- **THEN** el veredicto no afirma que ese título o certificado ya se tiene ni que sigue en curso
