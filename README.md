# Ticket-Ya Backend

Backend API para la plataforma de venta y gestión de entradas digitales Ticket-Ya.

## 📋 Documentación

Este proyecto incluye documentación completa antes de comenzar el desarrollo.

**👉 Empieza aquí**: **[Índice de Documentación](./INDICE_DOCUMENTACION.md)**

### Documentos Principales

- **[Documentación de Negocio](./DOCUMENTACION_NEGOCIO.md)**: Requisitos de negocio, casos de uso, reglas de negocio y actores del sistema
- **[Documentación Técnica](./DOCUMENTACION_TECNICA.md)**: Arquitectura, stack tecnológico, endpoints de API, modelos de datos y esquema de base de datos
- **[Funcionalidades](./FUNCIONALIDADES.md)**: Registro completo de funcionalidades a implementar, organizadas por módulos y prioridades
- **[Diagramas de Flujo](./DIAGRAMAS_FLUJO.md)**: Diagramas de los procesos principales (compra, transferencia, validación, etc.)
- **[Decisiones Técnicas](./DECISIONES_TECNICAS.md)**: Justificación de decisiones técnicas importantes del proyecto

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm o yarn

### Instalación sin Docker

1. **Clonar e instalar dependencias**
```bash
npm install
```

2. **Configurar variables de entorno**
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env

# Luego editar .env con tus credenciales reales
# IMPORTANTE: Cambia las claves JWT_SECRET, JWT_REFRESH_SECRET y QR_SECRET_KEY en producción
```

3. **Configurar base de datos**
```bash
# Iniciar PostgreSQL y Redis localmente
# Luego ejecutar:
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
```

4. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

### Instalación con Docker

1. **Iniciar servicios (PostgreSQL y Redis)**
```bash
docker-compose up -d
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Asegúrate de que DATABASE_URL apunte a: postgresql://ticketya:ticketya123@localhost:5432/ticketya
```

3. **Configurar base de datos**
```bash
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
```

4. **Iniciar servidor**
```bash
npm run dev
```

## 📝 Scripts Disponibles

- `npm run dev` - Inicia servidor en modo desarrollo con hot reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia servidor en producción
- `npm run prisma:generate` - Genera Prisma Client
- `npm run prisma:migrate` - Ejecuta migraciones
- `npm run prisma:seed` - Ejecuta seed (crea usuario admin)
- `npm run prisma:studio` - Abre Prisma Studio (GUI para DB)
- `npm test` - Ejecuta tests
- `npm run test:watch` - Ejecuta tests en modo watch
- `npm run test:coverage` - Genera reporte de cobertura

## 🗄️ Base de Datos

El proyecto usa Prisma como ORM. Para trabajar con la base de datos:

```bash
# Crear nueva migración
npx prisma migrate dev --name nombre_migracion

# Ver datos en Prisma Studio
npm run prisma:studio

# Resetear base de datos (CUIDADO: borra todos los datos)
npx prisma migrate reset
```

## 🔧 Variables de Entorno

Ver `.env.example` para todas las variables requeridas. Las más importantes:

- `DATABASE_URL` - URL de conexión a PostgreSQL
- `REDIS_URL` - URL de conexión a Redis
- `JWT_SECRET` - Clave secreta para JWT
- `MERCADOPAGO_ACCESS_TOKEN` - Token de MercadoPago
- `SMTP_*` - Configuración de email

## 🏗️ Arquitectura

El proyecto sigue Domain-Driven Design (DDD):

```
src/
├── domain/          # Entidades y lógica de dominio
├── application/     # Casos de uso y servicios de aplicación
├── infrastructure/  # Implementaciones técnicas (DB, Redis, etc.)
└── presentation/   # Controladores y rutas (API REST)
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Con cobertura
npm run test:coverage
```

## 📚 Referencias

- [Ticketek Argentina](https://www.ticketek.com.ar/)
- [Quentro](https://www.quentro.com/)

## 📝 Notas

Este backend está diseñado para trabajar en conjunto con el frontend React existente en `../ticket-ya/`.
