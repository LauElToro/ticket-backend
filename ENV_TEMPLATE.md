# Template de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# ============================================
# Ticket-Ya Backend - Variables de Entorno
# ============================================

# ============================================
# Base de Datos
# ============================================
# PostgreSQL - URL de conexión directa (usada por migraciones y por Prisma en local)
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_db?schema=public
# Para Docker: postgresql://ticketya:ticketya123@localhost:5432/ticketya?schema=public
DATABASE_URL="postgresql://ticketya:ticketya123@localhost:5432/ticketya?schema=public"

# En Vercel con Prisma: usar la misma URL directa para migraciones
POSTGRES_URL="postgresql://ticketya:ticketya123@localhost:5432/ticketya?schema=public"

# URL para el cliente Prisma en runtime:
# - En local: puede ser la misma que DATABASE_URL
# - En Vercel: usar la URL de Prisma Accelerate (prisma+postgres://accelerate.prisma-data.net/?api_key=...)
PRISMA_DATABASE_URL="postgresql://ticketya:ticketya123@localhost:5432/ticketya?schema=public"

# ============================================
# Redis
# ============================================
# URL de conexión a Redis
# Para Docker: redis://localhost:6379
REDIS_URL="redis://localhost:6379"

# ============================================
# JWT - Autenticación
# ============================================
# IMPORTANTE: Cambia estos valores en producción por claves seguras y aleatorias
# Genera claves seguras con: openssl rand -base64 32
JWT_SECRET="cambiar-por-clave-secreta-super-segura-en-produccion"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="cambiar-por-clave-refresh-super-segura-en-produccion"
JWT_REFRESH_EXPIRES_IN="7d"

# ============================================
# MercadoPago
# ============================================
# Credenciales de MercadoPago
# Obtén tus credenciales en: https://www.mercadopago.com.ar/developers/panel
MERCADOPAGO_ACCESS_TOKEN="TU_ACCESS_TOKEN_DE_MERCADOPAGO"
MERCADOPAGO_PUBLIC_KEY="TU_PUBLIC_KEY_DE_MERCADOPAGO"
MERCADOPAGO_WEBHOOK_SECRET="TU_WEBHOOK_SECRET_DE_MERCADOPAGO"

# ============================================
# Vercel Blob Storage (imágenes de eventos)
# ============================================
# En Vercel: crear Blob en Storage y vincular al proyecto; se asigna BLOB_READ_WRITE_TOKEN.
# Store actual: store_iuW1gnctN1Hxzcnx (IAD1)
# Base URL: https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com
BLOB_READ_WRITE_TOKEN="TU_TOKEN_DE_VERCEL_BLOB"
# Opcionales (por defecto usan el store anterior):
# BLOB_STORE_ID="store_iuW1gnctN1Hxzcnx"
# BLOB_STORE_BASE_URL="https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com"

# ============================================
# Email (SMTP)
# ============================================
# Configuración del servidor SMTP para envío de emails
# Ejemplo para Gmail:
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-contraseña-de-aplicacion"
SMTP_FROM="Ticket-Ya <noreply@ticketya.com>"

# Para otros proveedores:
# - SendGrid: smtp.sendgrid.net (puerto 587)
# - Mailgun: smtp.mailgun.org (puerto 587)
# - Outlook: smtp-mail.outlook.com (puerto 587)

# ============================================
# QR - Seguridad
# ============================================
# Clave secreta para firmar y cifrar códigos QR
# IMPORTANTE: Cambia este valor en producción
# Genera una clave segura con: openssl rand -base64 32
QR_SECRET_KEY="cambiar-por-clave-secreta-para-qr-en-produccion"

# ============================================
# Aplicación
# ============================================
# Ambiente: development, production, test
NODE_ENV="development"

# Puerto donde correrá el servidor
PORT=3000

# URL del frontend (para CORS)
# Desarrollo: http://localhost:5173
# Producción: https://ticketya.com
FRONTEND_URL="http://localhost:5173"

# ============================================
# Admin - Usuario Administrador Inicial
# ============================================
# Credenciales del usuario admin que se creará con el seed
# IMPORTANTE: Cambia estos valores en producción
ADMIN_EMAIL="admin@ticketya.com"
ADMIN_PASSWORD="admin123"
```

## Instrucciones

1. Copia el contenido de arriba
2. Crea un archivo `.env` en la raíz del proyecto `ticket-ya-backend/`
3. Pega el contenido y completa los valores según tu configuración
4. **NUNCA** commitees el archivo `.env` al repositorio (ya está en .gitignore)

## Valores por Defecto para Desarrollo

Si usas Docker Compose, estos valores funcionan directamente:

- `DATABASE_URL`: `postgresql://ticketya:ticketya123@localhost:5432/ticketya?schema=public`
- `POSTGRES_URL`: igual que `DATABASE_URL`
- `PRISMA_DATABASE_URL`: igual que `DATABASE_URL` (en local no hace falta Accelerate)
- `REDIS_URL`: `redis://localhost:6379`
- `FRONTEND_URL`: `http://localhost:5173`

## Despliegue en Vercel (Prisma + Accelerate)

En el dashboard de Vercel, en **Settings → Environment Variables**, configura:

| Variable | Valor | Notas |
|----------|--------|--------|
| `DATABASE_URL` | `postgres://...@db.prisma.io:5432/postgres?sslmode=require` | URL directa Postgres (migraciones) |
| `POSTGRES_URL` | Mismo que `DATABASE_URL` | Requerido por Vercel/Prisma |
| `PRISMA_DATABASE_URL` | `prisma+postgres://accelerate.prisma-data.net/?api_key=...` | URL de Prisma Accelerate (runtime) |

Además, define el resto de variables de producción: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `QR_SECRET_KEY`, `FRONTEND_URL`, MercadoPago, SMTP, etc.

**Migraciones:** Antes del primer deploy o tras cambiar el schema, ejecuta en local (con `DATABASE_URL` apuntando a la misma DB):

```bash
npx prisma migrate deploy
```

**Nota:** Redis en Vercel serverless puede requerir un servicio compatible (ej. Upstash). Ajusta `REDIS_URL` si usas uno.

## Generar Claves Seguras

Para generar claves seguras para JWT y QR en producción:

```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

