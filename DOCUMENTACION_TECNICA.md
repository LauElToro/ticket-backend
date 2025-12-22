# Documentación Técnica - Ticket-Ya Backend

## 1. Arquitectura General

### 1.1 Stack Tecnológico

- **Runtime**: Node.js (v18 o superior)
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL (principal) + Redis (caché y sesiones)
- **ORM**: Prisma
- **Autenticación**: JWT (JSON Web Tokens)
- **Validación**: Zod
- **Generación de QR**: qrcode + crypto para firma
- **Email**: Nodemailer (SMTP) o servicio como SendGrid
- **Pagos**: Integración con MercadoPago SDK
- **Testing**: Jest + Supertest
- **Documentación API**: Swagger/OpenAPI

### 1.2 Arquitectura de Capas

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
└──────────────┬──────────────────────┘
               │ HTTP/REST API
┌──────────────▼──────────────────────┐
│      API Gateway / Express          │
├─────────────────────────────────────┤
│  Middleware (Auth, Validation, etc) │
├─────────────────────────────────────┤
│      Controladores (Controllers)    │
├─────────────────────────────────────┤
│      Servicios (Business Logic)     │
├─────────────────────────────────────┤
│      Repositorios (Data Access)     │
├─────────────────────────────────────┤
│      Base de Datos (PostgreSQL)     │
└─────────────────────────────────────┘
```

### 1.3 Estructura de Directorios

```
ticket-ya-backend/
├── src/
│   ├── config/              # Configuraciones
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   ├── controllers/         # Controladores HTTP
│   │   ├── auth.controller.ts
│   │   ├── events.controller.ts
│   │   ├── tickets.controller.ts
│   │   ├── transfers.controller.ts
│   │   └── validation.controller.ts
│   ├── services/            # Lógica de negocio
│   │   ├── auth.service.ts
│   │   ├── events.service.ts
│   │   ├── tickets.service.ts
│   │   ├── transfers.service.ts
│   │   ├── validation.service.ts
│   │   ├── payment.service.ts
│   │   ├── qr.service.ts
│   │   └── email.service.ts
│   ├── repositories/       # Acceso a datos
│   │   ├── user.repository.ts
│   │   ├── event.repository.ts
│   │   ├── ticket.repository.ts
│   │   └── transfer.repository.ts
│   ├── models/             # Modelos de datos
│   │   └── (generados por Prisma)
│   ├── middleware/         # Middlewares
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/             # Definición de rutas
│   │   ├── auth.routes.ts
│   │   ├── events.routes.ts
│   │   ├── tickets.routes.ts
│   │   ├── transfers.routes.ts
│   │   └── validation.routes.ts
│   ├── utils/              # Utilidades
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── helpers.ts
│   ├── types/              # Tipos TypeScript
│   │   └── index.ts
│   └── app.ts              # Configuración Express
├── prisma/
│   ├── schema.prisma       # Schema de base de datos
│   └── migrations/         # Migraciones
├── tests/                  # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                   # Documentación adicional
│   └── api/                # Swagger/OpenAPI
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 2. Modelo de Datos

### 2.1 Esquema de Base de Datos (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Usuarios
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // Hash bcrypt
  name          String
  dni           String    @unique
  phone         String?
  role          UserRole  @default(USER)
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relaciones
  ticketsPurchased    Ticket[]      @relation("TicketOwner")
  ticketsTransferred  TicketTransfer[]
  eventsCreated       Event[]
  validations         TicketValidation[]

  @@index([email])
  @@index([dni])
}

enum UserRole {
  USER
  ORGANIZER
  ADMIN
  VALIDATOR
}

// Eventos
model Event {
  id          String   @id @default(cuid())
  title       String
  subtitle    String?
  description String?
  image       String?
  category    String
  date        DateTime
  time        String   // Hora de inicio
  venue       String
  address     String?
  city        String
  organizerId String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  organizer   User     @relation(fields: [organizerId], references: [id])
  ticketTypes TicketType[]
  tickets     Ticket[]

  @@index([organizerId])
  @@index([date])
  @@index([city])
  @@index([category])
  @@index([isActive])
}

// Tipos de Entrada
model TicketType {
  id          String  @id @default(cuid())
  eventId     String
  name        String  // Ej: "Campo General", "Platea VIP"
  price       Decimal @db.Decimal(10, 2)
  totalQty    Int     // Cantidad total disponible
  soldQty     Int     @default(0) // Cantidad vendida
  availableQty Int    // Calculado: totalQty - soldQty
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  event   Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  tickets Ticket[]

  @@index([eventId])
}

// Entradas
model Ticket {
  id              String        @id @default(cuid())
  ticketTypeId    String
  eventId         String
  ownerId         String        // Usuario propietario actual
  orderId         String        // ID de la orden de compra
  qrCode          String        @unique // Código QR único
  qrHash          String        @unique // Hash del QR para validación
  status          TicketStatus  @default(ACTIVE)
  purchaseDate    DateTime      @default(now())
  scannedAt       DateTime?
  expiresAt       DateTime      // Fecha de vencimiento (fecha evento + 2 horas)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relaciones
  ticketType      TicketType    @relation(fields: [ticketTypeId], references: [id])
  event           Event         @relation(fields: [eventId], references: [id])
  owner           User          @relation("TicketOwner", fields: [ownerId], references: [id])
  transfers       TicketTransfer[]
  validations     TicketValidation[]

  @@index([ownerId])
  @@index([eventId])
  @@index([qrCode])
  @@index([qrHash])
  @@index([status])
  @@index([expiresAt])
}

enum TicketStatus {
  PENDING_PAYMENT  // Reservada durante checkout
  ACTIVE           // Disponible para uso
  TRANSFERRED      // Transferida (histórico)
  USED             // Escaneada/validada
  EXPIRED          // Venció sin usar
  CANCELLED        // Cancelada/reembolsada
}

// Transferencias de Entradas
model TicketTransfer {
  id            String            @id @default(cuid())
  ticketId      String
  fromUserId    String            // Usuario que transfiere
  toUserId      String?           // Usuario destinatario (null si pendiente)
  toEmail       String            // Email del destinatario
  transferCode String            @unique // Código único de transferencia
  qrCode        String?          @unique // QR de transferencia (opcional)
  status        TransferStatus    @default(PENDING)
  expiresAt     DateTime          // Expira en 7 días
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  completedAt   DateTime?

  // Relaciones
  ticket  Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  fromUser User  @relation(fields: [fromUserId], references: [id])

  @@index([ticketId])
  @@index([fromUserId])
  @@index([toUserId])
  @@index([transferCode])
  @@index([status])
}

enum TransferStatus {
  PENDING    // Esperando aceptación
  ACCEPTED   // Aceptada
  REJECTED   // Rechazada
  EXPIRED    // Expirada
}

// Validaciones/Escaneos
model TicketValidation {
  id          String   @id @default(cuid())
  ticketId    String
  validatorId String   // Usuario validador
  isValid     Boolean  // Si fue válida o no
  scannedAt   DateTime @default(now())
  reason      String?  // Razón si fue inválida
  metadata    Json?    // Información adicional (IP, dispositivo, etc.)

  // Relaciones
  ticket    Ticket @relation(fields: [ticketId], references: [id])
  validator User   @relation(fields: [validatorId], references: [id])

  @@index([ticketId])
  @@index([validatorId])
  @@index([scannedAt])
}

// Órdenes de Compra
model Order {
  id            String      @id @default(cuid())
  userId        String
  eventId       String
  totalAmount   Decimal     @db.Decimal(10, 2)
  paymentMethod String
  paymentStatus PaymentStatus @default(PENDING)
  paymentId     String?     // ID de pago externo (MercadoPago, etc.)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  completedAt   DateTime?

  // Relaciones
  tickets Ticket[]

  @@index([userId])
  @@index([paymentStatus])
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}
```

## 3. Endpoints de la API

### 3.1 Autenticación

#### POST `/api/auth/register`
Registrar nuevo usuario

**Request Body**:
```json
{
  "email": "usuario@email.com",
  "password": "password123",
  "name": "Juan Pérez",
  "dni": "12345678",
  "phone": "+5491112345678"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "usuario@email.com",
    "name": "Juan Pérez",
    "emailVerified": false
  }
}
```

#### POST `/api/auth/login`
Iniciar sesión

**Request Body**:
```json
{
  "email": "usuario@email.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "usuario@email.com",
      "name": "Juan Pérez",
      "role": "USER"
    }
  }
}
```

#### POST `/api/auth/verify-email`
Verificar email con token

**Request Body**:
```json
{
  "token": "verification_token"
}
```

#### POST `/api/auth/refresh`
Renovar token JWT

**Headers**: `Authorization: Bearer <token>`

### 3.2 Eventos

#### GET `/api/events`
Listar eventos (con filtros y paginación)

**Query Parameters**:
- `page`: número de página (default: 1)
- `limit`: resultados por página (default: 20)
- `category`: filtrar por categoría
- `city`: filtrar por ciudad
- `search`: búsqueda por título
- `dateFrom`: fecha desde
- `dateTo`: fecha hasta
- `isActive`: solo activos (default: true)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "events": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### GET `/api/events/:id`
Obtener detalle de evento

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "event_id",
    "title": "Coldplay - Music of the Spheres Tour",
    "subtitle": "...",
    "description": "...",
    "date": "2025-03-15T21:00:00Z",
    "venue": "Estadio River Plate",
    "city": "Buenos Aires",
    "ticketTypes": [
      {
        "id": "type_id",
        "name": "Campo General",
        "price": 45000,
        "availableQty": 500
      }
    ]
  }
}
```

#### POST `/api/events`
Crear evento (Requiere: ORGANIZER)

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "title": "Evento Nuevo",
  "subtitle": "...",
  "description": "...",
  "category": "Música",
  "date": "2025-03-15T21:00:00Z",
  "time": "21:00",
  "venue": "Estadio",
  "address": "Calle 123",
  "city": "Buenos Aires",
  "image": "https://...",
  "ticketTypes": [
    {
      "name": "Campo General",
      "price": 45000,
      "totalQty": 1000
    }
  ]
}
```

#### PUT `/api/events/:id`
Actualizar evento (Requiere: ORGANIZER, owner del evento)

#### DELETE `/api/events/:id`
Eliminar/Cancelar evento (Requiere: ORGANIZER, owner del evento)

### 3.3 Entradas

#### GET `/api/tickets/my-tickets`
Obtener mis entradas (Requiere: autenticado)

**Query Parameters**:
- `status`: filtrar por estado (ACTIVE, USED, EXPIRED)
- `upcoming`: solo eventos futuros (boolean)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "upcoming": [...],
    "past": [...]
  }
}
```

#### GET `/api/tickets/:id`
Obtener detalle de entrada (Requiere: autenticado, owner)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "ticket_id",
    "qrCode": "base64_qr_image",
    "event": {...},
    "ticketType": {...},
    "status": "ACTIVE",
    "purchaseDate": "2025-01-15T10:00:00Z"
  }
}
```

#### GET `/api/tickets/:id/qr`
Obtener QR de entrada (Requiere: autenticado, owner)

**Response** (200): Imagen PNG del QR

#### GET `/api/tickets/:id/download`
Descargar entrada en PDF (Requiere: autenticado, owner)

**Response** (200): PDF file

#### POST `/api/tickets/:id/resend-email`
Reenviar entrada por email (Requiere: autenticado, owner)

### 3.4 Compra de Entradas

#### POST `/api/orders`
Crear orden de compra (Requiere: autenticado)

**Request Body**:
```json
{
  "eventId": "event_id",
  "tickets": [
    {
      "ticketTypeId": "type_id",
      "quantity": 2
    }
  ],
  "paymentMethod": "mercadopago"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "totalAmount": 90000,
    "paymentUrl": "https://mercadopago.com/checkout/...",
    "reservedUntil": "2025-01-15T10:05:00Z"
  }
}
```

#### POST `/api/orders/:id/confirm`
Confirmar pago y generar entradas (Requiere: autenticado)

**Request Body**:
```json
{
  "paymentId": "payment_id_from_gateway",
  "paymentStatus": "approved"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "tickets": [
      {
        "id": "ticket_id",
        "qrCode": "base64_qr"
      }
    ]
  }
}
```

### 3.5 Transferencias

#### POST `/api/transfers`
Crear transferencia de entrada (Requiere: autenticado, owner)

**Request Body**:
```json
{
  "ticketId": "ticket_id",
  "toEmail": "destinatario@email.com"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "transferId": "transfer_id",
    "transferCode": "TRF-123456",
    "status": "PENDING",
    "expiresAt": "2025-01-22T10:00:00Z"
  }
}
```

#### POST `/api/transfers/:id/qr`
Generar QR de transferencia (Requiere: autenticado, owner)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "qrCode": "base64_qr_image",
    "expiresAt": "2025-01-16T10:00:00Z"
  }
}
```

#### POST `/api/transfers/:id/accept`
Aceptar transferencia (Requiere: autenticado)

**Request Body**:
```json
{
  "transferCode": "TRF-123456"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "ticketId": "ticket_id",
    "newOwnerId": "user_id"
  }
}
```

#### POST `/api/transfers/:id/reject`
Rechazar transferencia (Requiere: autenticado)

#### POST `/api/transfers/:id/cancel`
Cancelar transferencia pendiente (Requiere: autenticado, owner original)

### 3.6 Validación/Escaneo

#### POST `/api/validation/scan`
Escanear/validar entrada (Requiere: VALIDATOR)

**Request Body**:
```json
{
  "qrCode": "qr_code_string",
  "eventId": "event_id"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "ticket": {
      "id": "ticket_id",
      "ticketType": "Campo General",
      "ownerName": "Juan Pérez"
    },
    "message": "Entrada válida"
  }
}
```

**Response** (400) - Entrada inválida:
```json
{
  "success": false,
  "error": {
    "code": "TICKET_INVALID",
    "message": "Entrada ya fue escaneada",
    "reason": "ALREADY_USED"
  }
}
```

#### POST `/api/validation/validate-code`
Validar entrada por código manual (Requiere: VALIDATOR)

**Request Body**:
```json
{
  "ticketCode": "TKT-123456",
  "eventId": "event_id"
}
```

## 4. Generación y Validación de QR

### 4.1 Estructura del QR

El QR contiene un JSON cifrado con la siguiente estructura:

```json
{
  "ticketId": "ticket_id",
  "qrHash": "hash_único",
  "eventId": "event_id",
  "timestamp": 1234567890,
  "signature": "firma_digital"
}
```

### 4.2 Proceso de Generación

1. Generar `qrHash` único usando crypto (SHA-256)
2. Crear objeto con datos del ticket
3. Firmar con clave secreta del servidor
4. Cifrar con AES-256
5. Codificar en Base64
6. Generar imagen QR con la librería qrcode

### 4.3 Proceso de Validación

1. Escanear QR y decodificar Base64
2. Descifrar con clave secreta
3. Verificar firma digital
4. Validar que `qrHash` existe en base de datos
5. Verificar que ticket no está usado
6. Verificar que ticket no está vencido
7. Verificar que corresponde al evento correcto
8. Marcar como usado y registrar validación

## 5. Integración de Pagos

### 5.1 MercadoPago

Flujo de integración:

1. **Crear preferencia de pago**:
   - Usuario selecciona entradas
   - Backend crea preferencia en MercadoPago
   - Retorna URL de pago

2. **Webhook de confirmación**:
   - MercadoPago notifica cuando pago es aprobado
   - Backend valida notificación
   - Genera entradas automáticamente
   - Envía email de confirmación

3. **Consulta de estado**:
   - Backend puede consultar estado del pago
   - Actualiza orden según estado

### 5.2 Otros Métodos de Pago

- Tarjeta de crédito/débito: Integración directa con procesador
- Transferencia bancaria: Confirmación manual o automática
- Efectivo: Confirmación manual por organizador

## 6. Seguridad

### 6.1 Autenticación y Autorización

- JWT tokens con expiración (15 minutos access, 7 días refresh)
- Refresh tokens almacenados en Redis
- Roles y permisos por endpoint
- Rate limiting por IP y usuario

### 6.2 Validación de Datos

- Validación con Zod en todos los endpoints
- Sanitización de inputs
- Validación de tipos y formatos

### 6.3 Protección contra Fraudes

- Rate limiting en compras
- Validación de disponibilidad con locks (Redis)
- Registro de intentos de escaneo inválidos
- Alertas por comportamiento sospechoso

### 6.4 Cifrado

- Contraseñas con bcrypt (salt rounds: 10)
- QR codes con firma digital
- Comunicación HTTPS obligatoria
- Variables de entorno para secretos

## 7. Caché y Rendimiento

### 7.1 Redis Cache

- Eventos populares: TTL 5 minutos
- Información de usuario: TTL 10 minutos
- Disponibilidad de entradas: TTL 30 segundos (crítico)

### 7.2 Optimizaciones

- Índices en base de datos para queries frecuentes
- Paginación en todos los listados
- Lazy loading de relaciones
- Compresión de respuestas (gzip)

## 8. Manejo de Errores

### 8.1 Códigos de Estado HTTP

- `200`: Éxito
- `201`: Creado
- `400`: Bad Request (validación fallida)
- `401`: No autenticado
- `403`: No autorizado
- `404`: No encontrado
- `409`: Conflicto (ej: entrada ya usada)
- `422`: Entidad no procesable
- `429`: Too Many Requests
- `500`: Error interno del servidor

### 8.2 Formato de Error

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

## 9. Testing

### 9.1 Tests Unitarios
- Servicios de negocio
- Utilidades
- Validaciones

### 9.2 Tests de Integración
- Endpoints de API
- Integración con base de datos
- Integración con servicios externos (mocks)

### 9.3 Tests E2E
- Flujo completo de compra
- Flujo de transferencia
- Flujo de validación

## 10. Despliegue

### 10.1 Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/ticketya
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=secret_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=token_here
MERCADOPAGO_PUBLIC_KEY=public_key_here
MERCADOPAGO_WEBHOOK_SECRET=webhook_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@example.com
SMTP_PASS=password

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://ticket-ya.com

# QR
QR_SECRET_KEY=secret_for_qr_signing
```

### 10.2 Docker

Dockerfile y docker-compose.yml para desarrollo y producción.

### 10.3 CI/CD

- GitHub Actions o similar
- Tests automáticos
- Despliegue automático en staging/producción

## 11. Monitoreo y Logging

- Logging estructurado (Winston)
- Métricas con Prometheus
- Alertas por errores críticos
- Dashboard de monitoreo

## 12. Documentación API

- Swagger/OpenAPI en `/api-docs`
- Ejemplos de requests/responses
- Códigos de error documentados

