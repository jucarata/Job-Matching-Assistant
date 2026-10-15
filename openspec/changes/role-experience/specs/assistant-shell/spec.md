# Spec Delta

## ADDED Requirements

### Requirement: Mostrar cada rol conservado
El sistema SHALL mostrar en la zona de perfil cada rol conservado con su nombre, su `experience_time` y la palabra «años». SHALL NOT mostrar `reliability` ni `evidence`. Si `roles` está vacío, SHALL NOT mostrar una línea de experiencia, y la conversación SHALL seguir habilitada.

#### Scenario: Tres roles del mismo empleo
- **WHEN** el perfil conservó Full Stack, Backend y Frontend, cada uno con `experience_time` 2
- **THEN** la zona de perfil muestra «Full Stack: 2 años», «Backend: 2 años» y «Frontend: 2 años», y no muestra fiabilidad ni frase

#### Scenario: El arquitecto descartado no se muestra
- **WHEN** la propuesta incluyó Arquitecto de software con fiabilidad 0.3 y Full Stack con fiabilidad 0.95, y solo Full Stack se conservó
- **THEN** la zona de perfil muestra el Full Stack y no muestra Arquitecto de software

#### Scenario: Sin roles
- **WHEN** hay un perfil y `roles` está vacío
- **THEN** la zona de perfil no muestra una línea de experiencia y la conversación acepta texto
