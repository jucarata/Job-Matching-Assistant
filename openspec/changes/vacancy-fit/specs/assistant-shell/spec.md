# Spec Delta

## REMOVED Requirements

### Requirement: Conservar el borrador al pulsar Enviar
**Reason**: «Enviar» llama al modelo y muestra el veredicto de la vacante.
**Migration**: Si la llamada termina bien, el compositor queda vacío y el texto enviado queda en el intercambio. Si la llamada no se hace o falla, el borrador vuelve al compositor.

## ADDED Requirements

### Requirement: Pedir la clave junto a la carga del CV
El sistema SHALL mostrar un campo con la etiqueta «Clave de Gemini» en la misma fila que «Cargar CV» cuando no hay perfil, y en la misma fila que «Reemplazar CV» cuando sí hay. Ese campo SHALL NOT ser la acción primaria.

#### Scenario: Sin perfil
- **WHEN** no hay un perfil
- **THEN** el campo «Clave de Gemini» está en la misma fila que «Cargar CV» y la única acción primaria sigue siendo «Cargar CV»

#### Scenario: Con perfil
- **WHEN** hay un perfil
- **THEN** el campo «Clave de Gemini» está en la misma fila que «Reemplazar CV» y la única acción primaria sigue siendo «Enviar»

### Requirement: Mostrar el mensaje y el veredicto
El sistema SHALL mostrar en la zona de conversación el texto enviado y el veredicto cuando la llamada termina bien, y SHALL vaciar el compositor. SHALL etiquetar `score` como «Puntaje», `matches` como «Coincidencias» y `mismatches` como «No coinciden». SHALL NOT persistir el intercambio.

#### Scenario: Intercambio mostrado
- **WHEN** la llamada devuelve un veredicto utilizable
- **THEN** el compositor queda vacío y la conversación muestra el texto enviado, el puntaje, la etiqueta, «Coincidencias» y «No coinciden»

#### Scenario: La llamada falla
- **WHEN** hay un perfil, una clave y un texto, y la llamada falla o el veredicto no es utilizable
- **THEN** el texto vuelve al compositor, no aparece un intercambio y el error se muestra junto a «Enviar»

#### Scenario: Envío sin clave o sin texto
- **WHEN** hay un perfil y un intercambio visible, y falta la clave o el texto
- **THEN** el borrador y ese intercambio se conservan, y no se llama al modelo

#### Scenario: Recargar la página
- **WHEN** había un intercambio visible y el usuario vuelve a abrir la página
- **THEN** la conversación no muestra el intercambio y el perfil sigue disponible

### Requirement: Avisar cuando no hay intercambio
El sistema SHALL mostrar «La conversación está abierta» en la zona de conversación cuando hay un perfil y no hay un intercambio visible.

#### Scenario: Conversación sin envío
- **WHEN** hay un perfil y no hay un intercambio
- **THEN** la zona de conversación muestra «La conversación está abierta»

#### Scenario: Tras una respuesta
- **WHEN** la llamada termina bien y el intercambio está visible
- **THEN** «La conversación está abierta» no está visible

### Requirement: Quitar el intercambio anterior al enviar
El sistema SHALL quitar el intercambio visible cuando un envío llama al modelo, y SHALL mostrar el texto de ese envío mientras llega la respuesta. SHALL conservar solo el intercambio de la llamada que termina bien.

#### Scenario: Segundo envío
- **WHEN** hay un intercambio visible y el usuario envía otro mensaje que llama al modelo
- **THEN** el intercambio anterior desaparece y la conversación muestra el texto del envío nuevo

#### Scenario: La llamada nueva falla
- **WHEN** un envío quitó el intercambio anterior y la llamada falla
- **THEN** la conversación queda sin intercambio, el texto vuelve al compositor y el error queda junto a «Enviar»

### Requirement: Etiquetar el puntaje con el corte
El sistema SHALL etiquetar «Postular» cuando `score` es mayor o igual al corte, y «No postular» cuando es menor. El corte SHALL ser un valor de la grilla de 0.5 entre 0 y 10. Sin un corte guardado, SHALL ser 7. El control SHALL estar en Ajustes. Cambiar el corte SHALL volver a etiquetar el puntaje visible y SHALL NOT llamar al modelo. El corte SHALL persistir en el navegador.

#### Scenario: Corte inicial
- **WHEN** no hay un corte guardado y el puntaje visible es 7
- **THEN** la etiqueta es «Postular»

#### Scenario: Puntaje bajo el corte
- **WHEN** el corte es 7 y el puntaje visible es 6.5
- **THEN** la etiqueta es «No postular» y se muestra 6.5

#### Scenario: Cambiar el corte
- **WHEN** el puntaje visible es 6.5 y el usuario deja el corte en 6
- **THEN** la etiqueta pasa a «Postular» y no hay una llamada al modelo

#### Scenario: El corte está en Ajustes
- **WHEN** el usuario abre Ajustes
- **THEN** el control del corte está ahí y Ajustes no piden la clave de Gemini

## MODIFIED Requirements

### Requirement: Vaciar la conversación si el reemplazo tiene éxito
El sistema SHALL vaciar el borrador y el intercambio, y SHALL mostrar solo el perfil nuevo cuando una carga de reemplazo termina bien. La conversación SHALL quedar habilitada y SHALL mostrar «La conversación está abierta».

#### Scenario: Reemplazo válido
- **WHEN** hay un borrador o un intercambio y una carga de reemplazo termina bien
- **THEN** el borrador queda vacío, el intercambio desaparece, se muestra «La conversación está abierta», el perfil visible es el nuevo y la conversación acepta texto

### Requirement: Conservar la conversación si el reemplazo falla
El sistema SHALL conservar el perfil, el borrador y el intercambio cuando una carga de reemplazo se rechaza, y SHALL mostrar el error junto a «Reemplazar CV».

#### Scenario: Reemplazo rechazado
- **WHEN** hay un perfil y un borrador o un intercambio, y la carga de reemplazo se rechaza
- **THEN** el perfil, el borrador y el intercambio siguen igual y el error aparece junto a «Reemplazar CV»
