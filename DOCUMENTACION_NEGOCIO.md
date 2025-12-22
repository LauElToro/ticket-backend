# Documentación de Negocio - Ticket-Ya Backend

## 1. Visión General del Proyecto

**Ticket-Ya** es una plataforma digital para la venta, gestión y transferencia de entradas para eventos (fiestas, recitales, eventos deportivos, teatro, etc.). El sistema permite a los usuarios comprar entradas digitales, transferirlas a otros usuarios y validarlas mediante escaneo QR en el momento del evento.

### 1.1 Objetivo del Negocio
Proporcionar una solución completa y segura para la comercialización de entradas digitales, facilitando tanto la compra como la transferencia entre usuarios, con un sistema robusto de validación y prevención de fraudes.

### 1.2 Referencias del Mercado
- **Ticketek Argentina**: https://www.ticketek.com.ar/
- **Quentro**: https://www.quentro.com/

## 2. Actores del Sistema

### 2.1 Usuario Final (Comprador)
- Persona que compra entradas para eventos
- Puede transferir sus entradas a otros usuarios
- Puede descargar y visualizar sus entradas
- Recibe notificaciones sobre sus compras y transferencias

### 2.2 Organizador de Eventos
- Crea y gestiona eventos
- Define tipos de entradas y precios
- Controla la disponibilidad de entradas
- Visualiza estadísticas de ventas

### 2.3 Administrador del Sistema
- Gestiona usuarios y permisos
- Supervisa transacciones
- Resuelve conflictos y reembolsos
- Configura parámetros del sistema

### 2.4 Validador (Scanner)
- Personal autorizado que escanea entradas en el evento
- Valida la autenticidad de las entradas
- Registra el ingreso de asistentes

## 3. Casos de Uso Principales

### 3.1 Gestión de Usuarios

#### CU-001: Registro de Usuario
**Actor**: Usuario Final  
**Precondiciones**: No tener cuenta en el sistema  
**Flujo Principal**:
1. Usuario accede al formulario de registro
2. Completa datos personales (nombre, email, DNI, teléfono, contraseña)
3. Sistema valida unicidad de email y DNI
4. Sistema crea cuenta y envía email de confirmación
5. Usuario confirma cuenta mediante link en email

**Flujo Alternativo**:
- Si email o DNI ya existe, se muestra error
- Si email no se confirma en 24 horas, se elimina el registro

#### CU-002: Autenticación de Usuario
**Actor**: Usuario Final, Organizador, Administrador  
**Precondiciones**: Tener cuenta activa  
**Flujo Principal**:
1. Usuario ingresa email y contraseña
2. Sistema valida credenciales
3. Sistema genera token JWT
4. Usuario accede al sistema

**Flujo Alternativo**:
- Si credenciales son incorrectas, se muestra error
- Después de 5 intentos fallidos, se bloquea cuenta temporalmente

### 3.2 Gestión de Eventos

#### CU-003: Crear Evento
**Actor**: Organizador  
**Precondiciones**: Estar autenticado como organizador  
**Flujo Principal**:
1. Organizador accede al panel de creación de eventos
2. Completa información del evento (título, descripción, fecha, hora, lugar, imagen)
3. Define tipos de entradas (nombre, precio, cantidad disponible)
4. Sistema valida datos y crea evento
5. Evento queda disponible para venta

**Reglas de Negocio**:
- Un evento debe tener al menos un tipo de entrada
- La fecha del evento debe ser futura
- El precio debe ser mayor a 0

#### CU-004: Listar Eventos
**Actor**: Usuario Final  
**Precondiciones**: Ninguna  
**Flujo Principal**:
1. Usuario accede a la página de eventos
2. Sistema muestra eventos disponibles con filtros (categoría, ciudad, fecha, búsqueda)
3. Usuario puede aplicar filtros y ordenar resultados

#### CU-005: Ver Detalle de Evento
**Actor**: Usuario Final  
**Precondiciones**: Evento debe existir y estar activo  
**Flujo Principal**:
1. Usuario selecciona un evento
2. Sistema muestra información completa del evento
3. Sistema muestra tipos de entradas disponibles con precios
4. Usuario puede seleccionar cantidad de entradas por tipo

### 3.3 Compra de Entradas

#### CU-006: Comprar Entradas
**Actor**: Usuario Final  
**Precondiciones**: Estar autenticado, evento debe tener entradas disponibles  
**Flujo Principal**:
1. Usuario selecciona tipos y cantidades de entradas
2. Usuario completa datos personales (si no están guardados)
3. Usuario selecciona método de pago
4. Sistema valida disponibilidad de entradas
5. Sistema procesa pago (integración con pasarela de pago)
6. Si pago es exitoso:
   - Sistema genera entradas únicas con QR
   - Sistema registra entradas al usuario comprador
   - Sistema envía email con entradas
   - Sistema actualiza disponibilidad
7. Usuario recibe confirmación de compra

**Reglas de Negocio**:
- No se pueden comprar más entradas de las disponibles
- Cada entrada tiene un código único e irrepetible
- Las entradas se generan inmediatamente después del pago exitoso
- El QR contiene información cifrada del ticket

**Flujo Alternativo**:
- Si pago falla, se liberan las entradas reservadas
- Si no hay disponibilidad suficiente, se muestra error

### 3.4 Transferencia de Entradas

#### CU-007: Transferir Entrada por Email
**Actor**: Usuario Final (propietario)  
**Precondiciones**: Tener entradas válidas y no escaneadas  
**Flujo Principal**:
1. Usuario accede a "Mis Entradas"
2. Selecciona entrada(s) a transferir
3. Ingresa email del destinatario
4. Sistema valida que el email existe o invita a registrarse
5. Sistema genera código de transferencia único
6. Sistema envía email al destinatario con link de aceptación
7. Destinatario acepta transferencia
8. Sistema actualiza propietario de la(s) entrada(s)
9. Sistema notifica a ambos usuarios

**Reglas de Negocio**:
- Solo se pueden transferir entradas no escaneadas
- Solo se pueden transferir entradas de eventos futuros
- Una entrada solo puede transferirse una vez
- El propietario original puede cancelar transferencia pendiente

#### CU-008: Transferir Entrada por QR
**Actor**: Usuario Final (propietario)  
**Precondiciones**: Tener entradas válidas  
**Flujo Principal**:
1. Usuario accede a "Mis Entradas"
2. Selecciona entrada a transferir
3. Genera código QR de transferencia temporal (válido por 24 horas)
4. Comparte QR con destinatario
5. Destinatario escanea QR y acepta transferencia
6. Sistema actualiza propietario de la entrada
7. Sistema invalida QR de transferencia

**Reglas de Negocio**:
- El QR de transferencia expira en 24 horas
- Solo puede ser usado una vez
- El destinatario debe tener cuenta activa

### 3.5 Validación de Entradas

#### CU-009: Escanear Entrada para Validación
**Actor**: Validador  
**Precondiciones**: Estar autenticado como validador, tener acceso al evento  
**Flujo Principal**:
1. Validador escanea QR de entrada con dispositivo móvil
2. Sistema valida:
   - Que el QR es válido y no ha sido usado
   - Que la entrada corresponde al evento correcto
   - Que el evento está en curso o próximo
   - Que la entrada no ha expirado
3. Si es válida:
   - Sistema marca entrada como "usada/escaneada"
   - Sistema registra timestamp de escaneo
   - Sistema muestra confirmación al validador
   - Sistema notifica al usuario propietario
4. Si es inválida:
   - Sistema muestra razón de rechazo
   - Sistema registra intento de uso inválido

**Reglas de Negocio**:
- Una entrada solo puede ser escaneada una vez
- Una entrada escaneada queda invalidada permanentemente
- Si se intenta escanear una entrada ya usada, se muestra alerta
- El sistema registra todos los intentos de escaneo (válidos e inválidos)

#### CU-010: Validación Manual (Backup)
**Actor**: Validador  
**Precondiciones**: Estar autenticado como validador  
**Flujo Principal**:
1. Validador ingresa código de entrada manualmente
2. Sistema realiza mismas validaciones que escaneo QR
3. Sistema marca entrada como usada si es válida

### 3.6 Gestión de Entradas del Usuario

#### CU-011: Ver Mis Entradas
**Actor**: Usuario Final  
**Precondiciones**: Estar autenticado  
**Flujo Principal**:
1. Usuario accede a "Mis Entradas"
2. Sistema muestra entradas agrupadas por:
   - Próximos eventos (no escaneadas, evento futuro)
   - Eventos pasados (escaneadas o evento ya ocurrido)
3. Para cada entrada muestra:
   - Información del evento
   - Tipo de entrada
   - QR code
   - Estado (disponible, transferida, usada)
   - Fecha de compra

#### CU-012: Descargar Entrada
**Actor**: Usuario Final  
**Precondiciones**: Tener entrada válida  
**Flujo Principal**:
1. Usuario selecciona entrada a descargar
2. Sistema genera PDF con:
   - Información del evento
   - Información del comprador
   - QR code
   - Código de entrada
3. Usuario descarga PDF

#### CU-013: Reenviar Entrada por Email
**Actor**: Usuario Final  
**Precondiciones**: Tener entrada válida  
**Flujo Principal**:
1. Usuario selecciona entrada
2. Solicita reenvío por email
3. Sistema envía email con entrada al email registrado del usuario

## 4. Reglas de Negocio Críticas

### 4.1 Vencimiento y Validez de Entradas

**RN-001**: Una entrada vence automáticamente cuando:
- Es escaneada/validada en el evento
- Pasa la fecha y hora de inicio del evento (más margen de tolerancia de 2 horas)
- Es transferida a otro usuario (la entrada original del comprador se invalida)

**RN-002**: Una entrada no puede ser usada por dos personas diferentes. Una vez escaneada, queda permanentemente invalidada.

**RN-003**: Las entradas tienen un código único e irrepetible que se genera al momento de la compra.

### 4.2 Transferencias

**RN-004**: Solo el propietario actual de una entrada puede transferirla.

**RN-005**: Una entrada solo puede ser transferida una vez. No se permite re-transferencia.

**RN-006**: Las transferencias pendientes expiran después de 7 días si no son aceptadas.

**RN-007**: No se pueden transferir entradas de eventos que ya ocurrieron.

### 4.3 Pagos

**RN-008**: Las entradas se reservan temporalmente durante el proceso de pago (5 minutos). Si el pago no se completa, se liberan automáticamente.

**RN-009**: Una vez confirmado el pago, las entradas se generan inmediatamente y no son reembolsables automáticamente (requiere proceso manual).

**RN-010**: El sistema debe integrarse con pasarelas de pago (MercadoPago, tarjetas de crédito/débito, transferencias).

### 4.4 Seguridad

**RN-011**: Los códigos QR deben ser únicos, no predecibles y contener información cifrada.

**RN-012**: Todos los intentos de escaneo (válidos e inválidos) deben registrarse para auditoría.

**RN-013**: Las entradas deben tener protección contra duplicación (validación de timestamp y firma digital).

**RN-014**: El sistema debe prevenir la compra masiva automatizada (rate limiting, CAPTCHA si es necesario).

### 4.5 Disponibilidad

**RN-015**: La disponibilidad de entradas se actualiza en tiempo real durante el proceso de compra.

**RN-016**: Si dos usuarios intentan comprar la última entrada simultáneamente, solo uno debe tener éxito.

**RN-017**: Los organizadores pueden pausar la venta de entradas en cualquier momento.

## 5. Estados de Entrada

Una entrada puede encontrarse en los siguientes estados:

1. **Pendiente de Pago**: Reservada durante proceso de checkout
2. **Activa**: Comprada y disponible para uso o transferencia
3. **Transferida**: Transferida a otro usuario (el nuevo propietario tiene estado "Activa")
4. **Usada/Escaneada**: Validada en el evento, no puede usarse nuevamente
5. **Vencida**: Pasó la fecha del evento sin ser escaneada
6. **Cancelada**: Cancelada por el organizador o reembolsada

## 6. Notificaciones

El sistema debe enviar notificaciones en los siguientes casos:

- Confirmación de compra exitosa
- Transferencia recibida
- Transferencia aceptada/rechazada
- Entrada escaneada/validada
- Cambios en el evento (fecha, hora, lugar)
- Recordatorio de evento próximo (24 horas antes)
- Confirmación de reenvío de entrada

## 7. Métricas y Reportes

### 7.1 Para Organizadores
- Total de entradas vendidas por evento
- Ingresos por evento
- Entradas disponibles vs vendidas
- Historial de transferencias
- Estadísticas de asistencia (entradas escaneadas)

### 7.2 Para Administradores
- Total de transacciones
- Usuarios activos
- Eventos activos
- Intentos de fraude detectados
- Rendimiento del sistema

## 8. Consideraciones Legales y de Privacidad

- Cumplimiento con protección de datos personales (Ley de Protección de Datos Personales Argentina)
- Almacenamiento seguro de información de pago (PCI DSS compliance)
- Términos y condiciones de uso
- Política de reembolsos
- Política de privacidad

## 9. Escalabilidad y Rendimiento

- El sistema debe soportar picos de tráfico durante ventas masivas
- Tiempo de respuesta de API < 200ms para operaciones críticas
- Disponibilidad del 99.9%
- Backup automático de base de datos cada 24 horas
- Sistema de caché para eventos populares

