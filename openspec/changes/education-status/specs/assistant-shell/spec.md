# Spec Delta

## ADDED Requirements

### Requirement: Mostrar cada estudio o certificación
El sistema SHALL mostrar en la zona de perfil cada entrada de `education` con su `name`, su `issuer` y, cuando `status` no es null, esa palabra. SHALL NOT mostrar `end_year`, `end_month` ni `ongoing`. Si `education` está vacío, SHALL NOT mostrar una línea de educación, y la conversación SHALL seguir habilitada.

#### Scenario: Título finalizado
- **WHEN** el perfil tiene una entrada con `name` Ingeniero en Sistemas, `issuer` Universidad ICESI y `status` `FINALIZADO`
- **THEN** la zona de perfil muestra «Ingeniero en Sistemas, Universidad ICESI, FINALIZADO»

#### Scenario: Sin estado
- **WHEN** el perfil tiene una entrada con nombre, emisor y `status` null
- **THEN** la zona de perfil muestra el nombre y el emisor, y no muestra `FINALIZADO` ni `ACTUALMENTE`

#### Scenario: Emisor vacío
- **WHEN** el perfil tiene una entrada con nombre, `issuer` vacío y un `status`
- **THEN** la zona de perfil muestra el nombre y ese estado

#### Scenario: Sin educación
- **WHEN** hay un perfil y `education` está vacío
- **THEN** la zona de perfil no muestra una línea de educación y la conversación acepta texto
