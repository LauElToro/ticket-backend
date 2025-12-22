# Template de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# ============================================
# Ticket-Ya Backend - Variables de Entorno
# ============================================

# ============================================
# Base de Datos
# ============================================
# PostgreSQL - URL de conexión completa
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_db?schema=public
# Para Docker: postgresql://ticketya:ticketya123@localhost:5432/ticketya?schema=public
DATABASE_URL="postgresql://ticketya:ticketya123@localhost:5432/ticketya?schema=public"

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
- `REDIS_URL`: `redis://localhost:6379`
- `FRONTEND_URL`: `http://localhost:5173`

## Generar Claves Seguras

Para generar claves seguras para JWT y QR en producción:

```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

