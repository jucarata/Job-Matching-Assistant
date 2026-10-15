# Spec Delta

## MODIFIED Requirements

### Requirement: Pedir el veredicto con el profile y el mensaje
El sistema SHALL pedir el veredicto enviando `tech_skills`, `soft_skills`, `languages`, `roles`, `education`, `flat_text` y el texto del mensaje. De `roles` SHALL enviar solo los conservados, y de cada uno solo `role` y `experience_time`. SHALL NOT enviar `reliability`, `evidence`, los roles descartados ni el corte de postulación.

#### Scenario: Envío con perfil y mensaje
- **WHEN** hay un `profile`, una clave de Gemini y el usuario envía un texto
- **THEN** la llamada incluye los roles conservados con `role` y `experience_time`, `flat_text` y ese texto, y no incluye el corte

#### Scenario: Un rol descartado no viaja
- **WHEN** el perfil conservó Full Stack y descartó Arquitecto de software, y el usuario envía un texto
- **THEN** la llamada incluye Full Stack y no incluye Arquitecto de software, `reliability` ni `evidence`
