# Decisiones Técnicas - Ticket-Ya Backend

Este documento registra las decisiones técnicas importantes tomadas durante el diseño del sistema.

## 1. Stack Tecnológico

### 1.1 Node.js + TypeScript
**Decisión**: Usar Node.js con TypeScript  
**Razón**: 
- TypeScript proporciona type safety y mejor experiencia de desarrollo
- Node.js es ideal para APIs REST y tiene excelente ecosistema
- Alineado con el stack del frontend (React + TypeScript)

### 1.2 Express.js
**Decisión**: Usar Express.js como framework web  
**Razón**:
- Framework maduro y ampliamente usado
- Gran cantidad de middleware disponible
- Fácil de aprender y mantener

### 1.3 PostgreSQL
**Decisión**: PostgreSQL como base de datos principal  
**Razón**:
- Base de datos relacional robusta y confiable
- Excelente soporte para transacciones ACID
- Ideal para datos estructurados como eventos y entradas
- Soporte para JSON para campos flexibles

### 1.4 Prisma ORM
**Decisión**: Usar Prisma como ORM  
**Razón**:
- Type-safe database client
- Migraciones automáticas
- Excelente soporte para TypeScript
- Genera tipos automáticamente


### 1.5 Redis
**Decisión**: Usar Redis para caché y sesiones  
**Razón**:
- Alto rendimiento para operaciones de lectura/escritura
- Ideal para caché de datos frecuentes
- Soporte para locks distribuidos (prevención de race conditions)
- TTL automático para expiración

## 2. Autenticación y Seguridad

### 2.1 JWT para Autenticación
**Decisión**: Usar JWT (JSON Web Tokens) para autenticación  
**Razón**:
- Stateless: no requiere almacenar sesiones en servidor
- Escalable: funciona bien con múltiples servidores
- Estándar de la industria
- Refresh tokens para seguridad adicional

**Implementación**:
- Access token: expira en 15 minutos
- Refresh token: expira en 7 días, almacenado en Redis
- Firma con algoritmo HS256

### 2.2 Bcrypt para Contraseñas
**Decisión**: Usar bcrypt para hash de contraseñas  
**Razón**:
- Algoritmo diseñado específicamente para contraseñas
- Salt automático incluido
- Resistente a ataques de fuerza bruta
- Estándar de la industria

**Configuración**:
- Salt rounds: 10 (balance entre seguridad y rendimiento)

### 2.3 Rate Limiting
**Decisión**: Implementar rate limiting en endpoints críticos  
**Razón**:
- Prevenir abuso y ataques DDoS
- Proteger contra compras automatizadas masivas
- Proteger endpoints de autenticación

**Implementación**:
- Usar `express-rate-limit`
- Diferentes límites según endpoint:
  - Login: 5 intentos por IP cada 15 minutos
  - Compra: 10 requests por usuario cada minuto
  - API general: 100 requests por IP cada 15 minutos

## 3. Generación y Validación de QR

### 3.1 Estructura del QR
**Decisión**: QR contiene datos cifrados y firmados  
**Razón**:
- Prevenir falsificación de entradas
- Validar autenticidad sin consultar base de datos (offline validation posible)
- Proteger información sensible

**Implementación**:
- Payload JSON con información del ticket
- Firma HMAC con clave secreta
- Cifrado AES-256
- Codificación Base64
- Generación de imagen QR con librería `qrcode`

### 3.2 Hash Único por Entrada
**Decisión**: Cada entrada tiene un hash único (`qrHash`)  
**Razón**:
- Validación rápida en base de datos (índice único)
- Prevenir duplicación
- Rastreabilidad

**Generación**:
- SHA-256 de: ticketId + timestamp + random salt
- Almacenado en base de datos para validación

## 4. Manejo de Concurrencia

### 4.1 Reserva Temporal con Redis Locks
**Decisión**: Usar Redis SETNX para locks distribuidos  
**Razón**:
- Prevenir race conditions en compra de última entrada
- Garantizar atomicidad
- TTL automático para liberar locks abandonados

**Implementación**:
- Lock por tipo de entrada durante checkout
- TTL de 5 minutos
- Liberación automática si pago falla o expira

### 4.2 Actualización de Disponibilidad
**Decisión**: Actualizar disponibilidad inmediatamente después de pago  
**Razón**:
- Prevenir sobreventa
- Datos en tiempo real
- Transaccionalidad garantizada

**Implementación**:
- Decrementar `soldQty` e incrementar en `availableQty`
- Transacción de base de datos
- Validación antes de decrementar

## 5. Integración de Pagos

### 5.1 MercadoPago como Pasarela Principal
**Decisión**: Integrar MercadoPago como método de pago principal  
**Razón**:
- Popular en Argentina
- SDK oficial disponible
- Soporte para múltiples métodos de pago
- Webhooks para confirmación automática

**Implementación**:
- SDK de MercadoPago para Node.js
- Crear preferencia de pago
- Webhook para confirmación
- Validación de firma del webhook

### 5.2 Webhooks para Confirmación
**Decisión**: Usar webhooks para confirmar pagos  
**Razón**:
- Confirmación automática e inmediata
- No requiere polling
- Mejor experiencia de usuario

**Implementación**:
- Endpoint protegido `/api/webhooks/payment`
- Validación de firma HMAC
- Idempotencia: verificar si pago ya fue procesado
- Reintentos en caso de fallo

## 6. Transferencias

### 6.1 Transferencia Única
**Decisión**: Una entrada solo puede transferirse una vez  
**Razón**:
- Prevenir reventa múltiple
- Simplificar trazabilidad
- Regla de negocio clara

**Implementación**:
- Validar que entrada no haya sido transferida previamente
- Invalidar entrada original al transferir
- Registrar historial de transferencias

### 6.2 Código de Transferencia Temporal
**Decisión**: Códigos de transferencia expiran en 7 días  
**Razón**:
- Prevenir acumulación de transferencias pendientes
- Seguridad: códigos no válidos indefinidamente
- Limpieza automática de datos

**Implementación**:
- Campo `expiresAt` en modelo `TicketTransfer`
- Job programado para limpiar transferencias expiradas
- Validación en aceptación de transferencia

## 7. Validación de Entradas

### 7.1 Validación Offline Posible
**Decisión**: QR contiene información suficiente para validación básica offline  
**Razón**:
- Funciona en eventos con conexión limitada
- Validación más rápida
- Redundancia

**Limitaciones**:
- Validación completa requiere conexión (verificar en DB)
- Prevenir uso de entradas ya escaneadas requiere DB

### 7.2 Registro de Todas las Validaciones
**Decisión**: Registrar todos los intentos de escaneo (válidos e inválidos)  
**Razón**:
- Auditoría y trazabilidad
- Detección de fraudes
- Estadísticas de asistencia
- Debugging

**Implementación**:
- Modelo `TicketValidation` para cada intento
- Campos: ticketId, validatorId, isValid, reason, timestamp

## 8. Notificaciones

### 8.1 Email como Canal Principal
**Decisión**: Usar email para todas las notificaciones  
**Razón**:
- Universalmente accesible
- No requiere app móvil
- Historial permanente
- Fácil de implementar

**Implementación**:
- Nodemailer para SMTP
- Templates HTML profesionales
- Queue para procesamiento asíncrono (Bull o similar)

**Futuro**:
- SMS para notificaciones críticas
- Push notifications en app móvil

### 8.2 Queue para Emails
**Decisión**: Usar cola de mensajes para envío de emails  
**Razón**:
- No bloquear respuesta HTTP
- Reintentos automáticos en caso de fallo
- Escalabilidad
- Rate limiting del proveedor SMTP

**Implementación**:
- Bull Queue con Redis como backend
- Workers para procesar cola
- Reintentos con backoff exponencial

## 9. Caché

### 9.1 Caché de Eventos Populares
**Decisión**: Cachear eventos populares en Redis  
**Razón**:
- Reducir carga en base de datos
- Respuestas más rápidas
- Mejor experiencia de usuario

**TTL**:
- Eventos populares: 5 minutos
- Información de usuario: 10 minutos
- Disponibilidad de entradas: 30 segundos (crítico)

### 9.2 Invalidación de Caché
**Decisión**: Invalidar caché al actualizar datos  
**Razón**:
- Consistencia de datos
- Prevenir datos obsoletos

**Implementación**:
- Invalidar al crear/actualizar evento
- Invalidar al comprar entradas (disponibilidad)
- Patrón: actualizar DB → invalidar caché → retornar respuesta

## 10. Manejo de Errores

### 10.1 Formato Consistente de Errores
**Decisión**: Todos los errores siguen mismo formato JSON  
**Razón**:
- Consistencia en API
- Fácil manejo en frontend
- Debugging más simple

**Formato**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje legible",
    "details": {}
  }
}
```

### 10.2 Códigos de Error Personalizados
**Decisión**: Usar códigos de error descriptivos  
**Razón**:
- Fácil identificación del tipo de error
- Manejo específico en frontend
- Documentación clara

**Ejemplos**:
- `TICKET_ALREADY_USED`
- `TICKET_EXPIRED`
- `INSUFFICIENT_AVAILABILITY`
- `TRANSFER_EXPIRED`

## 11. Testing

### 11.1 Tests en Tres Niveles
**Decisión**: Tests unitarios, integración y E2E  
**Razón**:
- Cobertura completa
- Detección temprana de bugs
- Confianza en despliegues

**Estrategia**:
- Unitarios: servicios y utilidades (Jest)
- Integración: endpoints y DB (Supertest + Prisma)
- E2E: flujos completos críticos

### 11.2 Mocks para Servicios Externos
**Decisión**: Mockear servicios externos en tests  
**Razón**:
- Tests independientes y rápidos
- No depender de servicios externos
- Controlar escenarios de prueba

**Servicios mockeados**:
- MercadoPago
- Email (SMTP)
- Redis (opcional, usar Redis real en integración)

## 12. Despliegue

### 12.1 Variables de Entorno
**Decisión**: Todas las configuraciones via variables de entorno  
**Razón**:
- Seguridad: no commitear secretos
- Flexibilidad: diferentes configs por ambiente
- Best practice

**Implementación**:
- Archivo `.env.example` con todas las variables
- Validación al iniciar aplicación
- Uso de librería `dotenv` para desarrollo

### 12.2 Docker para Desarrollo
**Decisión**: Usar Docker Compose para desarrollo local  
**Razón**:
- Consistencia entre desarrolladores
- Fácil setup de dependencias (PostgreSQL, Redis)
- Reproduce ambiente de producción

**Stack**:
- Node.js container para aplicación
- PostgreSQL container
- Redis container
- Volúmenes para persistencia

## 13. Monitoreo y Logging

### 13.1 Logging Estructurado
**Decisión**: Usar logging estructurado (JSON)  
**Razón**:
- Fácil parsing y análisis
- Compatible con herramientas de log (ELK, Datadog)
- Mejor debugging

**Implementación**:
- Librería Winston
- Niveles: error, warn, info, debug
- Contexto adicional (userId, requestId, etc.)

### 13.2 Health Checks
**Decisión**: Endpoint `/api/health` para monitoreo  
**Razón**:
- Verificar estado del sistema
- Integración con orquestadores (Kubernetes)
- Alertas automáticas

**Checks**:
- Conexión a PostgreSQL
- Conexión a Redis
- Estado de servicios externos (opcional)

## 14. Documentación API

### 14.1 Swagger/OpenAPI
**Decisión**: Documentación API con Swagger  
**Razón**:
- Estándar de la industria
- Interfaz interactiva
- Generación automática desde código
- Fácil mantenimiento

**Implementación**:
- `swagger-jsdoc` para anotaciones
- `swagger-ui-express` para UI
- Endpoint `/api-docs`

## 15. Escalabilidad Futura

### 15.1 Arquitectura Preparada para Escala
**Decisión**: Diseñar pensando en escalabilidad horizontal  
**Razón**:
- Preparado para crecimiento
- Sin cambios mayores futuros

**Consideraciones**:
- Stateless API (JWT, no sessions en servidor)
- Redis compartido para locks y caché
- Base de datos puede escalar (read replicas)
- Load balancer para múltiples instancias

### 15.2 Posibles Mejoras Futuras
- CDN para imágenes de eventos
- Microservicios si escala (servicio de pagos separado)
- Event sourcing para auditoría completa
- GraphQL como alternativa a REST
- WebSockets para notificaciones en tiempo real

