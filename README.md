# Campus-Seguro

Plataforma web centralizada para el reporte, inspección y gestión del flujo de mantenimiento por tickets en campus universitarios.

## Arquitectura del Proyecto

* **Backend**: Python 3.12+ / Django 5.2 (REST Framework) + Django CORS Headers
* **Frontend**: Angular 22 (Standalone Components) + Tailwind CSS v4 + **PNPM**
* **Entorno de Ejecución**: Node.js v24.19.0 LTS
* **Base de Datos**: PostgreSQL (desarrollo local preparado para SQLite/PostgreSQL)

---

## Guía de Inicio Rápido (Local)

### 1. Iniciar Servidor Backend (Django REST API)

Abre una terminal en la carpeta `backend/`:

```bash
cd backend
venv\Scripts\python manage.py runserver
```
* **API REST**: `http://127.0.0.1:8000/api/health/`
* **Admin Django**: `http://127.0.0.1:8000/admin/`

---

### 2. Iniciar Servidor Frontend (Angular con PNPM)

Abre otra terminal en la carpeta `frontend/`:

```bash
cd frontend
pnpm start
```
* **Aplicación Angular**: `http://localhost:4200/`

---

## Niveles de Acceso y Permisos

1. **Usuario Final**: Reporte de incidentes y seguimiento de tickets.
2. **Guardia de Seguridad**: Inspección inicial, validación en terreno y derivación.
3. **Mantenedor**: Ejecución de trabajos, registro de insumos y evidencia fotográfica.
4. **Gestor**: Gestión global de usuarios, reportes y métricas del sistema.

---

## Flujo de Estados del Ticket

`Creado` ➔ `Enviado` ➔ `Validado` ➔ `En Mantenimiento` ➔ `Reparado` ➔ `Cerrado`
