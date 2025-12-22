# Diagramas de Flujo - Ticket-Ya Backend

## 1. Flujo de Compra de Entradas

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       │ 1. Selecciona entradas
       ▼
┌─────────────────────┐
│ POST /api/orders    │
│ - Valida auth       │
│ - Verifica stock    │
└──────┬──────────────┘
       │
       │ 2. Reserva temporal (5 min)
       ▼
┌─────────────────────┐
│ Crea orden PENDING  │
│ Reserva en Redis    │
└──────┬──────────────┘
       │
       │ 3. Integra con MercadoPago
       ▼
┌─────────────────────┐
│ Genera URL de pago  │
└──────┬──────────────┘
       │
       │ 4. Retorna URL
       ▼
┌─────────────┐
│   Usuario   │
│ Paga en MP  │
└──────┬──────┘
       │
       │ 5. Webhook de confirmación
       ▼
┌─────────────────────┐
│ POST /webhooks/     │
│ payment             │
│ - Valida firma      │
│ - Verifica pago     │
└──────┬──────────────┘
       │
       │ 6. Si pago aprobado
       ▼
┌─────────────────────┐
│ Genera entradas:    │
│ - Código único      │
│ - QR code           │
│ - Hash de seguridad │
└──────┬──────────────┘
       │
       │ 7. Asigna al usuario
       ▼
┌─────────────────────┐
│ Actualiza:          │
│ - Estado orden      │
│ - Disponibilidad    │
│ - Stock vendido     │
└──────┬──────────────┘
       │
       │ 8. Envía email
       ▼
┌─────────────────────┐
│ Email con:          │
│ - PDF de entradas   │
│ - QR codes          │
└─────────────────────┘
```

## 2. Flujo de Transferencia de Entrada

```
┌──────────────────┐
│ Usuario A        │
│ (Propietario)    │
└────────┬─────────┘
         │
         │ 1. Selecciona entrada
         ▼
┌────────────────────────┐
│ POST /api/transfers    │
│ - Valida propiedad     │
│ - Verifica no usada    │
│ - Verifica evento futuro│
└────────┬───────────────┘
         │
         │ 2. Genera código único
         ▼
┌────────────────────────┐
│ Crea transferencia:    │
│ - Status: PENDING      │
│ - Código único         │
│ - Expira en 7 días     │
└────────┬───────────────┘
         │
         │ 3. Envía email a Usuario B
         ▼
┌──────────────────┐
│ Usuario B         │
│ Recibe email      │
└────────┬──────────┘
         │
         │ 4. Acepta transferencia
         ▼
┌────────────────────────┐
│ POST /transfers/:id/   │
│ accept                 │
│ - Valida código        │
│ - Verifica no expirada │
└────────┬───────────────┘
         │
         │ 5. Transfiere propiedad
         ▼
┌────────────────────────┐
│ Actualiza:             │
│ - ownerId → Usuario B  │
│ - Status: ACCEPTED      │
│ - Invalida entrada     │
│   original de Usuario A│
└────────┬───────────────┘
         │
         │ 6. Notifica a ambos
         ▼
┌────────────────────────┐
│ Email a Usuario A y B  │
│ Confirmación           │
└────────────────────────┘
```

## 3. Flujo de Validación/Escaneo

```
┌──────────────┐
│  Validador   │
└──────┬───────┘
       │
       │ 1. Escanea QR
       ▼
┌────────────────────────┐
│ POST /validation/scan  │
│ - Valida rol VALIDATOR │
└──────┬─────────────────┘
       │
       │ 2. Decodifica QR
       ▼
┌────────────────────────┐
│ Verifica:              │
│ - Firma digital        │
│ - Hash existe en DB    │
└──────┬─────────────────┘
       │
       │ 3. Busca entrada
       ▼
┌────────────────────────┐
│ Valida entrada:        │
│ - ¿Existe?             │
│ - ¿No está usada?      │
│ - ¿No está vencida?     │
│ - ¿Corresponde evento? │
└──────┬─────────────────┘
       │
       ├─── Válida ───────┐
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Marca USED   │   │ Retorna      │
│ Registra     │   │ ERROR        │
│ validación   │   │ con razón    │
└──────┬───────┘   └──────────────┘
       │
       │ 4. Notifica usuario
       ▼
┌────────────────────────┐
│ Email: "Entrada        │
│ escaneada exitosamente"│
└────────────────────────┘
```

## 4. Flujo de Vencimiento de Entradas

```
┌─────────────────────┐
│ Job Programado      │
│ (Cada hora)        │
└──────────┬──────────┘
           │
           │ 1. Busca entradas
           ▼
┌──────────────────────────┐
│ SELECT tickets WHERE:    │
│ - status = ACTIVE        │
│ - expiresAt < NOW()      │
└──────────┬───────────────┘
           │
           │ 2. Para cada entrada
           ▼
┌──────────────────────────┐
│ Verifica:                │
│ - ¿Fecha evento pasó?    │
│ - ¿Más de 2 horas desde │
│   inicio del evento?     │
└──────────┬───────────────┘
           │
           │ 3. Si cumple condiciones
           ▼
┌──────────────────────────┐
│ Actualiza:               │
│ - status = EXPIRED       │
│ - Registra timestamp     │
└──────────────────────────┘
```

## 5. Flujo de Reserva Temporal (Prevención de Race Conditions)

```
┌─────────────┐     ┌─────────────┐
│ Usuario A   │     │ Usuario B   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │ 1. Compra         │ 1. Compra
       │    última entrada│    misma entrada
       ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│ Verifica stock  │   │ Verifica stock  │
│ Disponible: 1   │   │ Disponible: 1   │
└──────┬──────────┘   └──────┬──────────┘
       │                     │
       │ 2. Lock en Redis   │ 2. Intenta lock
       ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ SETNX lock:     │   │ SETNX lock:     │
│ ticket_type_1   │   │ ticket_type_1   │
│ TTL: 5 min      │   │ (FALLA - ya     │
│ ✓ Éxito         │   │  existe)         │
└──────┬──────────┘   └──────┬──────────┘
       │                     │
       │ 3. Reserva         │ 3. Retorna error
       ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ Decrementa      │   │ "No disponible" │
│ disponible      │   │                  │
│ Crea orden      │   └──────────────────┘
└──────┬──────────┘
       │
       │ 4. Si pago exitoso
       ▼
┌─────────────────┐
│ Genera entrada  │
│ Libera lock     │
└─────────────────┘
       │
       │ 5. Si pago falla o expira
       ▼
┌─────────────────┐
│ Libera lock     │
│ Incrementa stock│
└─────────────────┘
```

## 6. Flujo de Generación de QR

```
┌─────────────────┐
│ Datos de entrada│
└────────┬────────┘
         │
         │ 1. Genera hash único
         ▼
┌────────────────────────┐
│ qrHash = SHA256(      │
│   ticketId +           │
│   timestamp +          │
│   random)              │
└────────┬───────────────┘
         │
         │ 2. Crea payload
         ▼
┌────────────────────────┐
│ Payload:               │
│ {                      │
│   ticketId,            │
│   qrHash,              │
│   eventId,             │
│   timestamp,           │
│   signature            │
│ }                      │
└────────┬───────────────┘
         │
         │ 3. Firma con clave secreta
         ▼
┌────────────────────────┐
│ signature = HMAC(      │
│   payload,              │
│   SECRET_KEY)           │
└────────┬───────────────┘
         │
         │ 4. Cifra payload
         ▼
┌────────────────────────┐
│ encrypted = AES256(   │
│   payload,              │
│   SECRET_KEY)           │
└────────┬───────────────┘
         │
         │ 5. Codifica Base64
         ▼
┌────────────────────────┐
│ base64 = encode(      │
│   encrypted)            │
└────────┬───────────────┘
         │
         │ 6. Genera imagen QR
         ▼
┌────────────────────────┐
│ QR Image = qrcode(    │
│   base64)              │
└────────────────────────┘
```

## 7. Flujo de Autenticación

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       │ 1. Login
       ▼
┌─────────────────────┐
│ POST /auth/login    │
│ email + password    │
└──────┬──────────────┘
       │
       │ 2. Valida credenciales
       ▼
┌─────────────────────┐
│ Busca usuario       │
│ Compara hash        │
└──────┬──────────────┘
       │
       ├─── Inválido ────┐
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Incrementa   │   │ Genera JWT:  │
│ intentos     │   │ - Access     │
│ Si > 5:      │   │   (15 min)   │
│ Bloquea 30min│   │ - Refresh    │
└──────────────┘   │   (7 días)   │
                   └──────┬───────┘
                          │
                          │ 3. Almacena refresh token
                          ▼
                   ┌──────────────┐
                   │ Redis:       │
                   │ refresh:    │
                   │ user_id     │
                   └──────┬───────┘
                          │
                          │ 4. Retorna tokens
                          ▼
                   ┌──────────────┐
                   │ Usuario      │
                   │ recibe tokens│
                   └──────────────┘
                          │
                          │ 5. Usa access token
                          ▼
                   ┌──────────────┐
                   │ Authorization│
                   │ Bearer token │
                   └──────────────┘
                          │
                          │ 6. Si expira
                          ▼
                   ┌──────────────┐
                   │ POST         │
                   │ /auth/refresh│
                   └──────────────┘
```

## 8. Estados de Entrada (State Machine)

```
┌─────────────────┐
│ PENDING_PAYMENT │ (Reservada durante checkout)
└────────┬────────┘
         │
         │ Pago exitoso
         ▼
┌─────────────────┐
│     ACTIVE      │ (Disponible para uso/transferencia)
└────────┬────────┘
         │
         ├─── Transferida ────► TRANSFERRED (histórico)
         │
         ├─── Escaneada ──────► USED
         │
         └─── Evento pasó ────► EXPIRED
         
┌─────────────────┐
│   CANCELLED     │ (Cancelada/reembolsada)
└─────────────────┘
```

## 9. Flujo de Notificaciones

```
┌──────────────────┐
│ Evento ocurre    │
│ (compra,         │
│ transferencia,   │
│ validación)      │
└────────┬─────────┘
         │
         │ 1. Determina tipo
         ▼
┌────────────────────────┐
│ Tipo de notificación: │
│ - Compra exitosa       │
│ - Transferencia recibida│
│ - Entrada escaneada     │
│ - Cambio de evento      │
│ - Recordatorio          │
└────────┬───────────────┘
         │
         │ 2. Prepara datos
         ▼
┌────────────────────────┐
│ Genera template        │
│ email con datos        │
└────────┬───────────────┘
         │
         │ 3. Encola en queue
         ▼
┌────────────────────────┐
│ Redis Queue o          │
│ Bull Queue             │
└────────┬───────────────┘
         │
         │ 4. Worker procesa
         ▼
┌────────────────────────┐
│ Envía email via        │
│ SMTP/SendGrid          │
└────────┬───────────────┘
         │
         │ 5. Registra envío
         ▼
┌────────────────────────┐
│ Log en DB:             │
│ - Email enviado        │
│ - Timestamp            │
│ - Estado               │
└────────────────────────┘
```

## 10. Flujo de Webhook de Pago

```
┌──────────────────┐
│ MercadoPago      │
│ (o pasarela)     │
└────────┬─────────┘
         │
         │ 1. Pago procesado
         ▼
┌────────────────────────┐
│ POST /webhooks/payment │
│ Headers:               │
│ - X-Signature          │
│ Body:                  │
│ - payment_id           │
│ - status               │
└────────┬───────────────┘
         │
         │ 2. Valida firma
         ▼
┌────────────────────────┐
│ Verifica HMAC          │
│ signature              │
└────────┬───────────────┘
         │
         ├─── Inválida ────┐
         │                  │
         ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Retorna 401  │   │ Busca orden  │
└──────────────┘   └──────┬───────┘
                          │
                          │ 3. Actualiza estado
                          ▼
                   ┌──────────────┐
                   │ Si approved: │
                   │ - COMPLETED  │
                   │ Si rejected: │
                   │ - FAILED     │
                   └──────┬───────┘
                          │
                          │ 4. Si approved
                          ▼
                   ┌──────────────┐
                   │ Genera       │
                   │ entradas     │
                   └──────────────┘
```

