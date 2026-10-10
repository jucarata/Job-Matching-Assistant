# Spec Delta

## REMOVED Requirements

### Requirement: Conservar el borrador al pulsar Enviar
**Reason**: «Enviar» llama al modelo y muestra el veredicto de la vacante.
**Migration**: Si el veredicto se muestra, el compositor queda vacío. Si la llamada no se hace o falla, el borrador se conserva y no aparece un veredicto.

## ADDED Requirements

### Requirement: Pedir la clave junto a la carga del CV
El sistema SHALL mostrar un campo con la etiqueta «Clave de Gemini» en la misma fila que «Cargar CV» cuando no hay perfil, y en la misma fila que «Reemplazar CV» cuando sí hay. Ese campo SHALL NOT ser la acción primaria.

#### Scenario: Sin perfil
- **WHEN** no hay un perfil
- **THEN** el campo «Clave de Gemini» está en la misma fila que «Cargar CV» y la única acción primaria sigue siendo «Cargar CV»

#### Scenario: Con perfil
- **WHEN** hay un perfil
- **THEN** el campo «Clave de Gemini» está en la misma fila que «Reemplazar CV» y la única acción primaria sigue siendo «Enviar»

### Requirement: Mostrar el veredicto al enviar
El sistema SHALL mostrar el veredicto en la zona de conversación cuando la llamada termina bien, y SHALL vaciar el compositor. SHALL etiquetar en español `matches` como «Coincidencias», `weaknesses` como «Debilidades», `score` como «Puntaje» y `apply_recommendation` como «Postular» o «No postular».

#### Scenario: Veredicto mostrado
- **WHEN** hay un perfil, una clave y un texto de vacante, y la llamada devuelve las cuatro piezas
- **THEN** el compositor queda vacío y la conversación muestra esas cuatro piezas con esas etiquetas

#### Scenario: La llamada falla
- **WHEN** hay un perfil, una clave y un texto de vacante, y la llamada falla o el veredicto no es utilizable
- **THEN** el borrador se conserva, no aparece un veredicto y el error se muestra junto a «Enviar»

#### Scenario: Envío sin clave o sin texto
- **WHEN** hay un perfil y falta la clave o el texto de la vacante
- **THEN** el borrador se conserva, no aparece un veredicto y no se llama al modelo

## MODIFIED Requirements

### Requirement: Vaciar la conversación si el reemplazo tiene éxito
El sistema SHALL vaciar el borrador y el veredicto, y SHALL mostrar solo el perfil nuevo cuando una carga de reemplazo termina bien. La conversación SHALL quedar habilitada.

#### Scenario: Reemplazo válido
- **WHEN** hay un borrador o un veredicto y una carga de reemplazo termina bien
- **THEN** el borrador queda vacío, el veredicto desaparece, el perfil visible es el nuevo y la conversación acepta texto

### Requirement: Conservar la conversación si el reemplazo falla
El sistema SHALL conservar el perfil, el borrador y el veredicto cuando una carga de reemplazo se rechaza, y SHALL mostrar el error junto a «Reemplazar CV».

#### Scenario: Reemplazo rechazado
- **WHEN** hay un perfil y un borrador o un veredicto, y la carga de reemplazo se rechaza
- **THEN** el perfil, el borrador y el veredicto siguen igual y el error aparece junto a «Reemplazar CV»
