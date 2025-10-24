# Backend - Documentación de despliegue y uso (Redis + Docker + Celery)

Este README explica cómo poner en marcha el backend Django de este proyecto usando Redis mediante Docker y ejecutando Celery (workers y beat). Incluye las principales funciones del backend y comandos útiles para desarrollo y producción ligera.

## Resumen

El backend es un proyecto Django que incluye las siguientes aplicaciones principales:

- `authentication`: Manejo de usuarios, login/registro (autenticación por email).
- `destinations`: CRUD y lógica relacionada con destinos.
- `flights`: Gestión de vuelos.
- `airlines`: Información de aerolíneas.
- `flight_requests`: Solicitudes de vuelo (posible flujo de aprobación/consulta).
- `reservations` y `reservation_passengers`: Gestión de reservas y pasajeros asociados.
- `notifications`: Tareas/asíncronas relacionadas con notificaciones (a través de Celery).

El proyecto utiliza Redis para:
- Backend y broker de Celery (broker + resultados).
- Caché de Django (sessions y cache API).

Celery se usa para ejecutar tareas asíncronas y programadas. En `settings.py` hay una tarea programada (Celery Beat) que ejecuta el management command `send_flight_reminders` diariamente.


## Requisitos locales

- Python 3.10+ (u otra versión compatible con las dependencias del `requirements.txt`).
- pip (instalación de dependencias).
- Docker / Docker Desktop (para ejecutar Redis fácilmente).
- Redis disponible (usaremos Docker en las instrucciones).


## Variables de entorno (ejemplo `.env`)

Coloca un archivo `.env` en la raíz del proyecto (donde está `manage.py`). Ejemplo mínimo:

SECRET_KEY=supersecreto
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DB_NAME=postgres_db
DB_USER=postgres_user
DB_PASSWORD=postgres_password
DB_HOST=127.0.0.1
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=your-email-password

Ajusta según tu entorno (si usas Docker Compose, DB_HOST puede ser `db` y REDIS_HOST `redis`).


## Iniciar Redis con Docker (opciones)

Opción A — `docker run` (rápida, local):

```powershell
# Descargar y ejecutar Redis en background (puerto 6379)
docker run -d --name redis -p 6379:6379 redis:7
```

Opción B — `docker-compose` (recomendado si quieres también Postgres):

Ejemplo mínimo de `docker-compose.yml` (opcional):

```yaml
version: '3.8'
services:
  redis:
    image: redis:7
    ports:
      - '6379:6379'
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - db-data:/var/lib/postgresql/data
volumes:
  db-data:
```

Si arrancas con `docker-compose up -d`, en las variables de entorno dentro de Django pon `DB_HOST=db` y `REDIS_HOST=redis`.


## Instalar dependencias (entorno virtual recomendado)

```powershell
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```


## Migraciones y datos iniciales

```powershell
cd backend
python manage.py migrate
python manage.py createsuperuser
```


## Ejecutar el servidor Django (desarrollo)

```powershell
cd backend
python manage.py runserver 0.0.0.0:8000
```


## Ejecutar Celery

En desarrollo normalmente ejecutas dos procesos separados: el worker y el beat (scheduler).

Desde la carpeta `backend` (donde está `manage.py`):

Worker:
```powershell
# Inicia un worker de Celery
celery -A config worker -l info
```

Beat (scheduler):
```powershell
# Inicia Celery Beat (scheduler de tareas periódicas)
celery -A config beat -l info
```

Nota: `-A config` asume que el módulo de configuración de Celery está en `backend/config/celery.py` y que el proyecto referencia `config` como paquete de settings (ver `manage.py`/`wsgi`).

Alternativa (no recomendada en producción): ejecutar worker y beat juntos:
```powershell
celery -A config worker -B -l info
```


## Qué hace Celery en este proyecto

- Broker/result backend: Redis (definido en `settings.py` vía `CELERY_BROKER_URL` y `CELERY_RESULT_BACKEND`).
- Tareas periódicas: configuradas en `CELERY_BEAT_SCHEDULE`; ejemplo: la tarea programada `send-flight-reminders-daily` ejecuta el management command `send_flight_reminders` una vez al día.
- Las tareas async (por ejemplo notificaciones) están en la app `notifications` (archivo `notifications/tasks.py`).


## Comandos útiles / troubleshooting

- Ver que Redis responde:
```powershell
# en host
redis-cli PING
# debería responder PONG (si tienes redis-cli instalado)
```

- Si Django no conecta a Redis cuando Redis está en Docker y Django corre en host: asegúrate de mapear puertos (usando `-p 6379:6379`) y que `REDIS_HOST` apunte a `127.0.0.1` o `localhost`.

- Si ejecutas Django dentro de Docker y tienes un servicio `redis` en el mismo `docker-compose`, usa `REDIS_HOST=redis`.

- Error en importación `celery.schedules`: asegúrate de tener `celery` instalado en el entorno (ver `requirements.txt`).


## Servicios/Funciones principales del backend (resumen funcional)

- Registro e inicio de sesión de usuarios por email (JWT configurado con `rest_framework_simplejwt`).
- Gestión de destinos, aerolíneas y vuelos con endpoints tipo CRUD (API REST con Django REST Framework).
- Solicitudes y reservaciones de vuelos (creación/lectura/actualización/estado).
- Reservas con pasajeros asociados.
- Notificaciones y tareas asíncronas (envío de correos o recordatorios), gestionadas vía Celery.
- Caché y sesiones almacenadas en Redis para mejorar rendimiento.


## Consejos para producción

- No uses `EMAIL_BACKEND = console` en producción: configura SMTP seguro o un servicio de correo (SendGrid, Mailgun, etc.).
- Ejecuta Celery worker y beat como servicios gestionados (systemd, supervisord, o contenedores separados).
- Monitoriza Redis y Celery (flower, prometheus/metrics, logs).
- Asegura las variables sensibles en un vault o mediante variables de entorno administradas.


## Resumen rápido de comandos (PowerShell)

```powershell
# Levantar Redis (docker)
docker run -d --name redis -p 6379:6379 redis:7

# Activar virtualenv e instalar deps
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000

# Terminal separada: iniciar celery worker
celery -A config worker -l info
# Terminal separada: iniciar celery beat
celery -A config beat -l info
```


