# Campus Seguro — Plataforma de Gestión de Infraestructura y Mantenimiento

![Django](https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

Plataforma web centralizada para el reporte geolocalizado, inspección técnica en terreno, trazabilidad operativa, control de inventario de pañol y analítica Business Intelligence (BI) para campus universitarios.

---

## Características Principales y Roles del Sistema

| Rol | Funcionalidades Clave |
| :--- | :--- |
| **Estudiante / Comunidad** | Reporte interactivo por Sede, Edificio, Piso y Sala. Subida de evidencias fotográficas, historial personal y seguimiento de estado en tiempo real. |
| **Guardia de Seguridad** | Inspección en terreno, evaluación de matrices de riesgo (*eléctrico, estructural, accesibilidad, suspensión de clases*), validación operativa o derivación/rechazo justificado. |
| **Gestor de Infraestructura** | Asignación estratégica de mantenedores por especialidad y balanceo de carga, control de inasistencias, directorio de usuarios, provisión de personal y panel BI con analítica gerencial. |
| **Mantenedor Técnico** | Recepción de órdenes de trabajo, consumo y rebaja de stock del pañol central en tiempo real, registro de bitácoras de avance e informe final de reparación con fotos. |

---

## Ciclo de Vida del Ticket

```text
[ Creado ] ──► [ Enviado ] ──► [ Validado por Guardia ] ──► [ En Mantenimiento ] ──► [ Reparado ] ──► [ Cerrado ]
                     │
                     └──► [ Rechazado / Derivado a Empresa Externa ]
```

---

## Arquitectura y Tecnologías

* **Backend**: Python 3.12+ / Django 5.2 & Django REST Framework
  * Autenticación JWT con rotación de tokens (`djangorestframework-simplejwt`).
  * Conexión dinámica con `psycopg2-binary`, `dj-database-url` y `python-dotenv`.
* **Frontend**: Angular 22 (Standalone Components + Signals Reactivas + Flow Control `@if`/`@for`).
  * Estilos con Tailwind CSS v4 y componentes modulares.
  * Iconografía oficial con Font Awesome.
  * Gestor de paquetes ultrarrápido: **PNPM**.
* **Base de Datos & Contenedores**:
  * PostgreSQL 16 sobre Docker Compose con persistencia de volúmenes en disco.

---

## Guía de Inicio Rápido (Entorno Local)

### Requisitos Previos
* [Git](https://git-scm.com/)
* [Python 3.12+](https://www.python.org/)
* [Node.js v20+ LTS](https://nodejs.org/) & [PNPM](https://pnpm.io/) (`npm install -g pnpm`)
* [Docker Desktop](https://www.docker.com/) (iniciado)

---

### Paso 1: Iniciar la Base de Datos PostgreSQL con Docker

En la raíz del proyecto, ejecuta:

```bash
docker compose up -d
```
> Esto levantará el contenedor `campus_seguro_postgres` en el puerto `5432` con volumen persistente.

---

### Paso 2: Configurar y Ejecutar el Backend (Django)

1. Abre una terminal y navega a `backend/`:
   ```bash
   cd backend
   ```
2. Crea y activa el entorno virtual:
   ```bash
   python -m venv venv
   # En Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # En Linux / macOS:
   source venv/bin/activate
   ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configura el archivo `.env` (si no existe, crea una copia desde el ejemplo):
   ```bash
   cp .env.example .env
   ```
5. Ejecuta las migraciones y puebla los catálogos e infraestructura:
   ```bash
   python manage.py migrate
   python manage.py seed_data
   ```
6. Inicia el servidor de desarrollo:
   ```bash
   python manage.py runserver
   ```
   * **API REST**: `http://127.0.0.1:8000/api/`
   * **Admin de Django**: `http://127.0.0.1:8000/admin/`

---

### Paso 3: Configurar y Ejecutar el Frontend (Angular)

1. Abre otra terminal y navega a `frontend/`:
   ```bash
   cd frontend
   ```
2. Instala las dependencias con PNPM:
   ```bash
   pnpm install
   ```
3. Inicia el servidor de Angular:
   ```bash
   pnpm start
   ```
4. Abre tu navegador en:
    **`http://localhost:4200`**

---

## Cuentas de Acceso Rápido (1-Click)

La plataforma incluye botones de **Acceso Rápido (1-Click)** en la pantalla de inicio de sesión con las siguientes credenciales pre-configuradas:

| Rol | Usuario | Contraseña | Especialidad / Función |
| :--- | :--- | :--- | :--- |
| **Gestor** | `gestor1` | `Gestor2026!` | Administrador de Infraestructura & Personal |
| **Guardia** | `guardia1` | `Guardia2026!` | Inspección y Validación en Terreno |
| **Mantenedor 1** | `mantencion1` | `Mantencion2026!` | Técnico en Electricidad & Climatización |
| **Mantenedor 2** | `mantencion2` | `Mantencion2026!` | Técnico en Gasfitería & Cerrajería |
| **Estudiante** | `estudiante1` | `Estudiante2026!` | Usuario Base / Reporte de Incidentes |

---

## Estructura del Repositorio

```text
Campus-Seguro/
├── backend/
│   ├── api/                     # Modelos, vistas, serializers y management commands
│   │   ├── management/commands/ # seed_data.py, create_test_users.py
│   │   ├── models.py            # Modelos relacionales de Tickets, Pañol, Usuarios, etc.
│   │   ├── views.py             # ViewSets y lógica de negocio REST
│   │   └── serializers.py       # Serializadores DRF
│   ├── campus_seguro_backend/   # Configuración de Django (settings, urls, wsgi)
│   ├── .env.example             # Plantilla de variables de entorno
│   ├── requirements.txt         # Dependencias Python
│   └── manage.py
├── frontend/
│   ├── src/app/
│   │   ├── components/          # Vistas por Rol (Gestor, Guardia, Mantenedor, Estudiante)
│   │   ├── services/            # Servicios HTTP y gestión de estado con Signals
│   │   ├── guards/              # Route Guards de autenticación y autorización
│   │   └── models/              # Interfaces y contratos TypeScript
│   └── package.json
├── docker-compose.yml           # Configuración de PostgreSQL en contenedor
├── .gitignore
└── README.md
```

---

## Origen del Proyecto & Licencia

Este proyecto nació originalmente como **Proyecto de Título para la carrera de Ingeniería en Informática**, diseñado para resolver de manera real la gestión, trazabilidad y seguridad en la infraestructura de recintos educativos.

Posteriormente, la plataforma fue refactorizada, ampliada y modernizada como **portafolio profesional de ingeniería de software**, aplicando estándares corporativos: containerización con **Docker**, persistencia en **PostgreSQL**, arquitectura desacoplada con **Django REST Framework** y una experiencia de usuario reactiva construida en **Angular** con Signals y Tailwind CSS.

&copy; 2026 Campus Seguro. Todos los derechos reservados.
