# Índice de Documentación - Ticket-Ya Backend

## 📚 Guía de Lectura Recomendada

### Para Product Owners / Stakeholders
1. **[Documentación de Negocio](./DOCUMENTACION_NEGOCIO.md)** - Comprender requisitos y reglas de negocio
2. **[Funcionalidades](./FUNCIONALIDADES.md)** - Ver qué se va a construir y prioridades

### Para Desarrolladores
1. **[Documentación Técnica](./DOCUMENTACION_TECNICA.md)** - Arquitectura y diseño técnico
2. **[Decisiones Técnicas](./DECISIONES_TECNICAS.md)** - Entender por qué se tomaron ciertas decisiones
3. **[Diagramas de Flujo](./DIAGRAMAS_FLUJO.md)** - Visualizar procesos principales
4. **[Funcionalidades](./FUNCIONALIDADES.md)** - Checklist de implementación

### Para Arquitectos
1. **[Documentación Técnica](./DOCUMENTACION_TECNICA.md)** - Arquitectura completa
2. **[Decisiones Técnicas](./DECISIONES_TECNICAS.md)** - Justificación técnica
3. **[Diagramas de Flujo](./DIAGRAMAS_FLUJO.md)** - Flujos de proceso

---

## 📄 Documentos Disponibles

### 1. Documentación de Negocio
**Archivo**: `DOCUMENTACION_NEGOCIO.md`

**Contenido**:
- Visión general del proyecto
- Actores del sistema (Usuario, Organizador, Admin, Validador)
- Casos de uso detallados (CU-001 a CU-013)
- Reglas de negocio críticas (RN-001 a RN-017)
- Estados de entrada
- Sistema de notificaciones
- Métricas y reportes
- Consideraciones legales

**Cuándo leerlo**: Antes de comenzar desarrollo, para entender el dominio del negocio

---

### 2. Documentación Técnica
**Archivo**: `DOCUMENTACION_TECNICA.md`

**Contenido**:
- Stack tecnológico completo
- Arquitectura de capas
- Estructura de directorios
- Modelo de datos (Prisma Schema completo)
- Endpoints de API (todos los endpoints documentados)
- Generación y validación de QR
- Integración de pagos
- Seguridad
- Caché y rendimiento
- Manejo de errores
- Testing
- Despliegue

**Cuándo leerlo**: Antes de escribir código, como referencia durante desarrollo

---

### 3. Funcionalidades
**Archivo**: `FUNCIONALIDADES.md`

**Contenido**:
- Registro completo de funcionalidades por módulo
- Prioridades (P0, P1, P2, P3)
- Checklist de implementación
- Cronograma sugerido de desarrollo
- Endpoints asociados a cada funcionalidad

**Módulos cubiertos**:
1. Autenticación y Usuarios
2. Gestión de Eventos
3. Compra de Entradas
4. Gestión de Entradas del Usuario
5. Transferencia de Entradas
6. Validación y Escaneo
7. Notificaciones
8. Reportes y Estadísticas
9. Administración
10. Utilidades y Soporte

**Cuándo leerlo**: Durante planificación de sprints, como checklist de tareas

---

### 4. Diagramas de Flujo
**Archivo**: `DIAGRAMAS_FLUJO.md`

**Contenido**:
- Flujo de compra de entradas
- Flujo de transferencia de entrada
- Flujo de validación/escaneo
- Flujo de vencimiento de entradas
- Flujo de reserva temporal (prevención race conditions)
- Flujo de generación de QR
- Flujo de autenticación
- Estados de entrada (state machine)
- Flujo de notificaciones
- Flujo de webhook de pago

**Cuándo leerlo**: Para entender visualmente cómo funcionan los procesos principales

---

### 5. Decisiones Técnicas
**Archivo**: `DECISIONES_TECNICAS.md`

**Contenido**:
- Justificación de stack tecnológico
- Decisiones de arquitectura
- Decisiones de seguridad
- Decisiones de escalabilidad
- Alternativas consideradas y rechazadas

**Secciones**:
1. Stack Tecnológico
2. Autenticación y Seguridad
3. Generación y Validación de QR
4. Manejo de Concurrencia
5. Integración de Pagos
6. Transferencias
7. Validación de Entradas
8. Notificaciones
9. Caché
10. Manejo de Errores
11. Testing
12. Despliegue
13. Monitoreo y Logging
14. Documentación API
15. Escalabilidad Futura

**Cuándo leerlo**: Cuando necesites entender el "por qué" detrás de decisiones técnicas

---

## 🗺️ Mapa de Conceptos Clave

### Conceptos de Negocio
- **Entrada**: Ticket digital con QR único
- **Transferencia**: Cambio de propietario de una entrada
- **Validación**: Escaneo de entrada en el evento
- **Vencimiento**: Entrada que expira después del evento o al ser escaneada

### Conceptos Técnicos
- **QR Code**: Código cifrado y firmado con información del ticket
- **Reserva Temporal**: Lock en Redis durante proceso de compra
- **Webhook**: Notificación de pasarela de pago
- **JWT**: Token de autenticación stateless

---

## 🎯 Flujos Principales Documentados

### 1. Compra de Entrada
**Documentos relacionados**:
- Diagramas: Flujo de Compra (DIAGRAMAS_FLUJO.md)
- Negocio: CU-006 (DOCUMENTACION_NEGOCIO.md)
- Técnico: Endpoints de Compra (DOCUMENTACION_TECNICA.md)
- Funcionalidades: Módulo 3 (FUNCIONALIDADES.md)

### 2. Transferencia de Entrada
**Documentos relacionados**:
- Diagramas: Flujo de Transferencia (DIAGRAMAS_FLUJO.md)
- Negocio: CU-007, CU-008 (DOCUMENTACION_NEGOCIO.md)
- Técnico: Endpoints de Transferencia (DOCUMENTACION_TECNICA.md)
- Funcionalidades: Módulo 5 (FUNCIONALIDADES.md)

### 3. Validación/Escaneo
**Documentos relacionados**:
- Diagramas: Flujo de Validación (DIAGRAMAS_FLUJO.md)
- Negocio: CU-009, CU-010 (DOCUMENTACION_NEGOCIO.md)
- Técnico: Endpoints de Validación (DOCUMENTACION_TECNICA.md)
- Funcionalidades: Módulo 6 (FUNCIONALIDADES.md)

---

## 📋 Checklist de Inicio de Proyecto

Antes de comenzar a escribir código, asegúrate de haber leído:

- [ ] Documentación de Negocio (al menos casos de uso principales)
- [ ] Documentación Técnica (arquitectura y modelos de datos)
- [ ] Decisiones Técnicas (entender el stack elegido)
- [ ] Diagramas de Flujo (flujos principales)
- [ ] Funcionalidades (prioridades y módulos)

---

## 🔄 Mantenimiento de Documentación

Esta documentación debe actualizarse cuando:
- Se agreguen nuevas funcionalidades
- Se cambien decisiones técnicas importantes
- Se modifiquen endpoints de API
- Se agreguen nuevos casos de uso

---

