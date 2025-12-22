# Registro de Funcionalidades - Ticket-Ya Backend

## Resumen Ejecutivo

Este documento registra todas las funcionalidades que debe implementar el backend de Ticket-Ya, organizadas por módulos y prioridad de desarrollo.

## Prioridades

- **P0**: Crítico - Sin esto el sistema no funciona
- **P1**: Alto - Funcionalidad principal del negocio
- **P2**: Medio - Mejora la experiencia del usuario
- **P3**: Bajo - Nice to have, puede esperar

---

## Módulo 1: Autenticación y Usuarios

### 1.1 Registro de Usuario
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Permitir que nuevos usuarios se registren en el sistema

**Funcionalidades**:
- [ ] Validar unicidad de email y DNI
- [ ] Hash de contraseña con bcrypt
- [ ] Generar token de verificación de email
- [ ] Enviar email de confirmación
- [ ] Endpoint de verificación de email
- [ ] Validación de datos de entrada (Zod)

**Endpoints**:
- `POST /api/auth/register`
- `POST /api/auth/verify-email`

### 1.2 Autenticación (Login)
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Permitir a usuarios autenticarse

**Funcionalidades**:
- [ ] Validar credenciales
- [ ] Generar JWT access token
- [ ] Generar JWT refresh token
- [ ] Almacenar refresh token en Redis
- [ ] Rate limiting en intentos de login
- [ ] Bloqueo temporal después de intentos fallidos

**Endpoints**:
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### 1.3 Gestión de Perfil
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Usuarios pueden ver y editar su perfil

**Funcionalidades**:
- [ ] Obtener perfil del usuario autenticado
- [ ] Actualizar información personal
- [ ] Cambiar contraseña
- [ ] Validar permisos (solo propio perfil)

**Endpoints**:
- `GET /api/users/me`
- `PUT /api/users/me`
- `PUT /api/users/me/password`

---

## Módulo 2: Gestión de Eventos

### 2.1 Crear Evento
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Organizadores pueden crear eventos

**Funcionalidades**:
- [ ] Validar rol de organizador
- [ ] Crear evento con información completa
- [ ] Crear tipos de entrada asociados
- [ ] Validar que fecha sea futura
- [ ] Validar precios y cantidades
- [ ] Subir y almacenar imagen del evento

**Endpoints**:
- `POST /api/events`

### 2.2 Listar Eventos
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Mostrar eventos disponibles con filtros

**Funcionalidades**:
- [ ] Listar eventos activos
- [ ] Filtros: categoría, ciudad, fecha, búsqueda
- [ ] Paginación
- [ ] Ordenamiento (fecha, precio, popularidad)
- [ ] Caché de eventos populares (Redis)
- [ ] Incluir disponibilidad de entradas

**Endpoints**:
- `GET /api/events`

### 2.3 Detalle de Evento
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Ver información completa de un evento

**Funcionalidades**:
- [ ] Obtener información del evento
- [ ] Incluir tipos de entrada disponibles
- [ ] Mostrar disponibilidad en tiempo real
- [ ] Validar que evento esté activo

**Endpoints**:
- `GET /api/events/:id`

### 2.4 Actualizar Evento
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Organizadores pueden editar sus eventos

**Funcionalidades**:
- [ ] Validar propiedad del evento
- [ ] Actualizar información
- [ ] Notificar cambios a compradores (si fecha cambia)
- [ ] Validar que no haya entradas vendidas (para cambios críticos)

**Endpoints**:
- `PUT /api/events/:id`

### 2.5 Cancelar Evento
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Organizadores pueden cancelar eventos

**Funcionalidades**:
- [ ] Validar propiedad del evento
- [ ] Marcar evento como cancelado
- [ ] Notificar a compradores
- [ ] Procesar reembolsos (si aplica)

**Endpoints**:
- `DELETE /api/events/:id`

---

## Módulo 3: Compra de Entradas

### 3.1 Crear Orden de Compra
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Usuario selecciona entradas y crea orden

**Funcionalidades**:
- [ ] Validar disponibilidad de entradas
- [ ] Reservar entradas temporalmente (5 minutos)
- [ ] Crear orden de compra
- [ ] Calcular total
- [ ] Integrar con pasarela de pago (MercadoPago)
- [ ] Generar URL de pago
- [ ] Liberar reserva si expira

**Endpoints**:
- `POST /api/orders`

### 3.2 Confirmar Pago y Generar Entradas
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Procesar pago exitoso y generar entradas

**Funcionalidades**:
- [ ] Validar estado del pago
- [ ] Generar entradas únicas con QR
- [ ] Asignar entradas al comprador
- [ ] Actualizar disponibilidad
- [ ] Enviar email con entradas
- [ ] Generar PDF de entradas
- [ ] Actualizar estado de orden

**Endpoints**:
- `POST /api/orders/:id/confirm`
- Webhook: `POST /api/webhooks/payment`

### 3.3 Webhook de Pagos
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Recibir notificaciones de pasarela de pago

**Funcionalidades**:
- [ ] Validar firma del webhook
- [ ] Procesar notificación de pago
- [ ] Actualizar estado de orden
- [ ] Generar entradas si pago aprobado
- [ ] Manejar errores y reintentos

**Endpoints**:
- `POST /api/webhooks/payment`

---

## Módulo 4: Gestión de Entradas del Usuario

### 4.1 Ver Mis Entradas
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Usuario ve todas sus entradas

**Funcionalidades**:
- [ ] Listar entradas del usuario autenticado
- [ ] Separar por próximos eventos y pasados
- [ ] Filtrar por estado
- [ ] Incluir información del evento
- [ ] Mostrar QR de cada entrada
- [ ] Mostrar estado de la entrada

**Endpoints**:
- `GET /api/tickets/my-tickets`

### 4.2 Detalle de Entrada
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Ver información completa de una entrada

**Funcionalidades**:
- [ ] Validar propiedad de la entrada
- [ ] Mostrar información completa
- [ ] Generar QR si no existe
- [ ] Mostrar historial de transferencias (si aplica)

**Endpoints**:
- `GET /api/tickets/:id`

### 4.3 Descargar Entrada (PDF)
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Descargar entrada en formato PDF

**Funcionalidades**:
- [ ] Validar propiedad
- [ ] Generar PDF con información del evento
- [ ] Incluir QR code en PDF
- [ ] Incluir información del comprador
- [ ] Formato profesional y legible

**Endpoints**:
- `GET /api/tickets/:id/download`

### 4.4 Reenviar Entrada por Email
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Reenviar entrada al email del usuario

**Funcionalidades**:
- [ ] Validar propiedad
- [ ] Generar email con entrada
- [ ] Incluir PDF adjunto
- [ ] Rate limiting (máx 3 por hora)

**Endpoints**:
- `POST /api/tickets/:id/resend-email`

---

## Módulo 5: Transferencia de Entradas

### 5.1 Transferir por Email
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Transferir entrada a otro usuario por email

**Funcionalidades**:
- [ ] Validar propiedad de entrada
- [ ] Validar que entrada no esté usada
- [ ] Validar que evento sea futuro
- [ ] Generar código de transferencia único
- [ ] Enviar email al destinatario
- [ ] Crear registro de transferencia pendiente
- [ ] Expirar transferencia después de 7 días

**Endpoints**:
- `POST /api/transfers`

### 5.2 Generar QR de Transferencia
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Generar QR para transferencia directa

**Funcionalidades**:
- [ ] Validar propiedad
- [ ] Generar QR temporal (24 horas)
- [ ] Código único de transferencia
- [ ] Incluir información cifrada

**Endpoints**:
- `POST /api/transfers/:id/qr`

### 5.3 Aceptar Transferencia
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Destinatario acepta transferencia

**Funcionalidades**:
- [ ] Validar código de transferencia
- [ ] Validar que no haya expirado
- [ ] Validar que destinatario tenga cuenta
- [ ] Transferir propiedad de entrada
- [ ] Invalidar entrada del propietario original
- [ ] Notificar a ambos usuarios
- [ ] Actualizar estado de transferencia

**Endpoints**:
- `POST /api/transfers/:id/accept`
- `POST /api/transfers/accept-by-code` (con código)

### 5.4 Rechazar Transferencia
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Destinatario rechaza transferencia

**Funcionalidades**:
- [ ] Validar código
- [ ] Marcar transferencia como rechazada
- [ ] Notificar al propietario original
- [ ] Liberar entrada para nueva transferencia

**Endpoints**:
- `POST /api/transfers/:id/reject`

### 5.5 Cancelar Transferencia
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Propietario original cancela transferencia pendiente

**Funcionalidades**:
- [ ] Validar propiedad original
- [ ] Validar que esté pendiente
- [ ] Cancelar transferencia
- [ ] Notificar al destinatario

**Endpoints**:
- `POST /api/transfers/:id/cancel`

---

## Módulo 6: Validación y Escaneo

### 6.1 Escanear Entrada (QR)
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Validador escanea QR de entrada

**Funcionalidades**:
- [ ] Validar rol de validador
- [ ] Decodificar QR
- [ ] Verificar firma digital
- [ ] Validar que entrada existe
- [ ] Validar que no esté usada
- [ ] Validar que no esté vencida
- [ ] Validar que corresponde al evento correcto
- [ ] Marcar entrada como usada
- [ ] Registrar validación
- [ ] Retornar resultado (válido/inválido con razón)

**Endpoints**:
- `POST /api/validation/scan`

### 6.2 Validar por Código Manual
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Validar entrada ingresando código manualmente

**Funcionalidades**:
- [ ] Validar rol de validador
- [ ] Buscar entrada por código
- [ ] Mismas validaciones que escaneo QR
- [ ] Registrar validación manual

**Endpoints**:
- `POST /api/validation/validate-code`

### 6.3 Historial de Validaciones
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Ver historial de validaciones de un evento

**Funcionalidades**:
- [ ] Validar rol de validador/organizador
- [ ] Listar validaciones de evento
- [ ] Filtrar por fecha, validador
- [ ] Estadísticas (total escaneadas, inválidas, etc.)

**Endpoints**:
- `GET /api/validation/event/:eventId/history`

---

## Módulo 7: Notificaciones

### 7.1 Email de Confirmación de Compra
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Enviar email cuando se completa compra

**Funcionalidades**:
- [ ] Generar email con información de compra
- [ ] Adjuntar PDF de entradas
- [ ] Incluir QR codes
- [ ] Template profesional

### 7.2 Email de Transferencia Recibida
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Notificar cuando se recibe transferencia

**Funcionalidades**:
- [ ] Email al destinatario
- [ ] Link para aceptar transferencia
- [ ] Información del evento y entrada

### 7.3 Email de Entrada Escaneada
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Notificar cuando entrada es validada

**Funcionalidades**:
- [ ] Email al propietario
- [ ] Confirmación de ingreso
- [ ] Información del evento

### 7.4 Recordatorio de Evento
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Recordar evento 24 horas antes

**Funcionalidades**:
- [ ] Job programado (cron)
- [ ] Buscar eventos próximos
- [ ] Enviar email a compradores
- [ ] Incluir información del evento

---

## Módulo 8: Reportes y Estadísticas

### 8.1 Estadísticas de Evento (Organizador)
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Organizador ve estadísticas de sus eventos

**Funcionalidades**:
- [ ] Total de entradas vendidas
- [ ] Ingresos totales
- [ ] Disponibilidad restante
- [ ] Gráficos de ventas por día
- [ ] Entradas escaneadas vs vendidas

**Endpoints**:
- `GET /api/events/:id/stats`

### 8.2 Dashboard de Organizador
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Vista general de todos los eventos

**Funcionalidades**:
- [ ] Listar todos los eventos del organizador
- [ ] Estadísticas agregadas
- [ ] Eventos próximos
- [ ] Ventas recientes

**Endpoints**:
- `GET /api/organizer/dashboard`

---

## Módulo 9: Administración

### 9.1 Gestión de Usuarios (Admin)
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Administradores gestionan usuarios

**Funcionalidades**:
- [ ] Listar usuarios
- [ ] Ver detalle de usuario
- [ ] Cambiar roles
- [ ] Bloquear/desbloquear usuarios
- [ ] Ver historial de actividad

**Endpoints**:
- `GET /api/admin/users`
- `PUT /api/admin/users/:id`
- `POST /api/admin/users/:id/block`

### 9.2 Gestión de Eventos (Admin)
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Administradores pueden gestionar cualquier evento

**Funcionalidades**:
- [ ] Ver todos los eventos
- [ ] Editar cualquier evento
- [ ] Cancelar eventos
- [ ] Ver estadísticas globales

---

## Módulo 10: Utilidades y Soporte

### 10.1 Health Check
**Prioridad**: P0  
**Estado**: Pendiente  
**Descripción**: Endpoint para verificar estado del sistema

**Funcionalidades**:
- [ ] Verificar conexión a base de datos
- [ ] Verificar conexión a Redis
- [ ] Verificar servicios externos
- [ ] Retornar estado general

**Endpoints**:
- `GET /api/health`

### 10.2 Búsqueda Global
**Prioridad**: P2  
**Estado**: Pendiente  
**Descripción**: Búsqueda de eventos, usuarios, etc.

**Funcionalidades**:
- [ ] Búsqueda de eventos
- [ ] Filtros avanzados
- [ ] Resultados paginados

**Endpoints**:
- `GET /api/search`

### 10.3 Documentación API
**Prioridad**: P1  
**Estado**: Pendiente  
**Descripción**: Documentación interactiva de la API

**Funcionalidades**:
- [ ] Swagger/OpenAPI
- [ ] Ejemplos de requests/responses
- [ ] Códigos de error documentados

**Endpoints**:
- `GET /api-docs`

---

## Cronograma Sugerido de Desarrollo

### Fase 1: Fundamentos (Semanas 1-2)
- Autenticación y usuarios
- Health check
- Estructura base del proyecto

### Fase 2: Eventos y Compra (Semanas 3-4)
- Gestión de eventos
- Compra de entradas
- Integración de pagos

### Fase 3: Entradas y Transferencias (Semanas 5-6)
- Gestión de entradas del usuario
- Transferencias
- Generación de QR

### Fase 4: Validación (Semana 7)
- Escaneo y validación
- Historial de validaciones

### Fase 5: Notificaciones y Mejoras (Semana 8)
- Sistema de emails
- Recordatorios
- Reportes básicos

### Fase 6: Administración y Pulido (Semanas 9-10)
- Panel de administración
- Optimizaciones
- Testing completo
- Documentación

---

## Notas Técnicas

- Todas las funcionalidades deben incluir validación de datos
- Todas las operaciones críticas deben tener logging
- Implementar rate limiting en endpoints sensibles
- Manejo de errores consistente en toda la API
- Tests unitarios e integración para funcionalidades críticas

