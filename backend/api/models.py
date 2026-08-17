from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

# ═══════════════════════════════════════════════════════════════
# 1. ESTRUCTURA ORGANIZACIONAL Y ROLES
# ═══════════════════════════════════════════════════════════════

class Rol(models.Model):
    """
    Roles del sistema:
    - 'usuario': Usuario Base (Estudiante / Docente / Colaborador)
    - 'guardia': Guardia de Seguridad (Validación en terreno)
    - 'mantencion': Mantenedor (Ejecución de trabajos)
    - 'gestor': Gestor (Administrador de cuentas y operaciones)
    """
    nombre = models.CharField(max_length=50, verbose_name="Nombre del Rol")
    codigo = models.CharField(max_length=30, unique=True, verbose_name="Código Operacional")

    class Meta:
        verbose_name = "Rol"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.nombre


class Escuela(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre de la Escuela")
    codigo = models.CharField(max_length=50, unique=True, verbose_name="Código de la Escuela")

    class Meta:
        verbose_name = "Escuela"
        verbose_name_plural = "Escuelas"

    def __str__(self):
        return self.nombre


class Departamento(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Departamento")
    codigo = models.CharField(max_length=50, unique=True, verbose_name="Código del Departamento")

    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"

    def __str__(self):
        return self.nombre


class Carrera(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    escuela = models.ForeignKey(Escuela, on_delete=models.SET_NULL, null=True, blank=True, related_name="carreras")
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Usuario(AbstractUser):
    """
    Modelo de Usuario Customizado para Campus-Seguro.
    Soporta autenticación local y sincronización con SSO / OAuth2.
    """
    ESTADO_CUENTA_CHOICES = [
        ('activa', 'Activa'),
        ('pendiente', 'Pendiente de Aprobación'),
        ('suspendida', 'Suspendida'),
        ('rechazada', 'Solicitud Rechazada'),
    ]

    rut = models.CharField(max_length=12, unique=True, null=True, blank=True, verbose_name="RUT")
    correo_institucional = models.EmailField(unique=True, verbose_name="Correo Institucional")
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True, related_name="usuarios")
    escuela = models.ForeignKey(Escuela, on_delete=models.SET_NULL, null=True, blank=True)
    carrera = models.ForeignKey(Carrera, on_delete=models.SET_NULL, null=True, blank=True)
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True)
    estado_cuenta = models.CharField(max_length=20, choices=ESTADO_CUENTA_CHOICES, default='activa')
    telefono = models.CharField(max_length=20, blank=True, null=True)
    auth0_sub = models.CharField(max_length=100, blank=True, null=True, verbose_name="Sub Auth0 / SSO")
    especialidades = models.ManyToManyField('Especialidad', blank=True, related_name="mantenedores")

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.correo_institucional})"

    @property
    def puede_ingresar(self):
        return self.is_active and self.estado_cuenta == 'activa'


# ═══════════════════════════════════════════════════════════════
# 2. CATÁLOGOS Y MÁQUINA DE ESTADOS
# ═══════════════════════════════════════════════════════════════

class EstadoCatalogo(models.Model):
    """
    Catálogo centralizado de estados del sistema para normalizar tickets y solicitudes.
    """
    ENTIDAD_CHOICES = [
        ('ticket', 'Ticket'),
        ('cuenta', 'Cuenta de Usuario'),
        ('asignacion', 'Asignación'),
    ]

    entidad = models.CharField(max_length=20, choices=ENTIDAD_CHOICES)
    codigo = models.CharField(max_length=30)
    nombre_display = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=300, blank=True, null=True)
    orden = models.PositiveIntegerField(default=0)
    color_hex = models.CharField(max_length=7, blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('entidad', 'codigo')
        ordering = ['entidad', 'orden']
        verbose_name = 'Estado del Catálogo'
        verbose_name_plural = 'Catálogo de Estados'

    def __str__(self):
        return f"{self.nombre_display} ({self.entidad})"


class TransicionEstado(models.Model):
    """
    Define qué transiciones de estado son válidas y qué rol las autoriza.
    """
    estado_origen = models.ForeignKey(EstadoCatalogo, on_delete=models.CASCADE, related_name='transiciones_origen')
    estado_destino = models.ForeignKey(EstadoCatalogo, on_delete=models.CASCADE, related_name='transiciones_destino')
    rol_requerido = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True)
    descripcion = models.CharField(max_length=200, blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('estado_origen', 'estado_destino')
        verbose_name = 'Transición de Estado'
        verbose_name_plural = 'Transiciones de Estado'

    def __str__(self):
        return f"{self.estado_origen.nombre_display} → {self.estado_destino.nombre_display}"


# ═══════════════════════════════════════════════════════════════
# 3. INFRAESTRUCTURA FÍSICA DEL CAMPUS
# ═══════════════════════════════════════════════════════════════

class Sede(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    direccion = models.CharField(max_length=250, blank=True, null=True)

    class Meta:
        verbose_name = 'Sede'
        verbose_name_plural = 'Sedes'

    def __str__(self):
        return self.nombre


class Edificio(models.Model):
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE, related_name='edificios')
    nombre = models.CharField(max_length=100)

    class Meta:
        verbose_name = 'Edificio'
        verbose_name_plural = 'Edificios'
        unique_together = ('sede', 'nombre')

    def __str__(self):
        return f"{self.nombre} - {self.sede.nombre}"


class Piso(models.Model):
    edificio = models.ForeignKey(Edificio, on_delete=models.CASCADE, related_name='pisos')
    numero = models.CharField(max_length=20)

    class Meta:
        verbose_name = 'Piso'
        verbose_name_plural = 'Pisos'
        unique_together = ('edificio', 'numero')

    def __str__(self):
        return f"Piso {self.numero} ({self.edificio.nombre})"


class TipoUbicacion(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre_display = models.CharField(max_length=100)

    class Meta:
        verbose_name = 'Tipo de Ubicación'
        verbose_name_plural = 'Tipos de Ubicaciones'

    def __str__(self):
        return self.nombre_display


class Ubicacion(models.Model):
    piso = models.ForeignKey(Piso, on_delete=models.CASCADE, related_name='ubicaciones')
    tipo = models.ForeignKey(TipoUbicacion, on_delete=models.SET_NULL, null=True, blank=True)
    nombre = models.CharField(max_length=100, verbose_name="Nombre / Sala (ej: Sala 204, Baño Damas)")
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Ubicación'
        verbose_name_plural = 'Ubicaciones'

    def __str__(self):
        return f"{self.nombre} - {self.piso}"


# ═══════════════════════════════════════════════════════════════
# 4. ESPECIALIDADES Y CATEGORÍAS
# ═══════════════════════════════════════════════════════════════

class Especialidad(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=250, blank=True, null=True)

    class Meta:
        verbose_name = 'Especialidad'
        verbose_name_plural = 'Especialidades'

    def __str__(self):
        return self.nombre


class CategoriaTicket(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre_display = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=300, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Categoría de Ticket'
        verbose_name_plural = 'Categorías de Tickets'

    def __str__(self):
        return self.nombre_display


class CategoriaMaterial(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre_display = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=300, blank=True, null=True)

    class Meta:
        verbose_name = 'Categoría de Material'
        verbose_name_plural = 'Categorías de Materiales'

    def __str__(self):
        return self.nombre_display


class Material(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    categoria = models.ForeignKey(CategoriaMaterial, on_delete=models.SET_NULL, null=True, blank=True)
    unidad_defecto = models.CharField(max_length=30, default="unidades")
    stock_disponible = models.PositiveIntegerField(default=100)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Material de Pañol'
        verbose_name_plural = 'Materiales de Pañol'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


# ═══════════════════════════════════════════════════════════════
# 5. TICKETS Y PROCESO DE MANTENIMIENTO
# ═══════════════════════════════════════════════════════════════

class Ticket(models.Model):
    URGENCIA_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]

    folio = models.CharField(max_length=20, unique=True, editable=False)
    titulo = models.CharField(max_length=150, verbose_name="Título del Incidente")
    descripcion = models.TextField(verbose_name="Descripción Detallada")
    categoria = models.ForeignKey(CategoriaTicket, on_delete=models.SET_NULL, null=True, blank=True)
    especialidad_requerida = models.ForeignKey(Especialidad, on_delete=models.SET_NULL, null=True, blank=True)
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.PROTECT, related_name="tickets")
    urgencia = models.CharField(max_length=20, choices=URGENCIA_CHOICES, default='media')
    estado = models.ForeignKey(EstadoCatalogo, on_delete=models.PROTECT, related_name="tickets")

    # Personas involucradas
    creado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="tickets_creados")
    validado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets_validados")
    asignado_a = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets_asignados")

    # Flags de evaluación de riesgo
    afecta_clase = models.BooleanField(default=False)
    riesgo_electrico = models.BooleanField(default=False)
    riesgo_estructural = models.BooleanField(default=False)
    riesgo_accesibilidad = models.BooleanField(default=False)

    # Fechas
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cerrado_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.folio}] {self.titulo} ({self.estado.nombre_display})"

    def save(self, *args, **kwargs):
        if not self.folio:
            count = Ticket.objects.count() + 1
            self.folio = f"TICK-{count:06d}"
        super().save(*args, **kwargs)


class ValidacionGuardia(models.Model):
    ticket = models.OneToOneField(Ticket, on_delete=models.CASCADE, related_name="validacion_guardia")
    guardia = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="validaciones_realizadas")
    observacion = models.TextField()
    checklist_electrico = models.BooleanField(default=False)
    checklist_estructural = models.BooleanField(default=False)
    checklist_accesibilidad = models.BooleanField(default=False)
    valido = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Validación de Guardia"
        verbose_name_plural = "Validaciones de Guardias"


class SesionTrabajo(models.Model):
    TIPO_CHOICES = [
        ('avance', 'Avance Diario'),
        ('final', 'Informe Final de Reparación'),
    ]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="sesiones_trabajo")
    mantenedor = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="sesiones_mantenimiento")
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='avance')
    es_final = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Sesión de Trabajo"
        verbose_name_plural = "Sesiones de Trabajo"


class MaterialUtilizado(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="materiales_utilizados")
    nombre_material = models.CharField(max_length=150)
    categoria = models.ForeignKey(CategoriaMaterial, on_delete=models.SET_NULL, null=True, blank=True)
    cantidad = models.PositiveIntegerField(default=1)
    unidad = models.CharField(max_length=30, default="unidades")

    class Meta:
        verbose_name = "Material Utilizado"
        verbose_name_plural = "Materiales Utilizados"


class EvidenciaFotografica(models.Model):
    FASE_CHOICES = [
        ('reporte', 'Reporte Inicial'),
        ('inspeccion', 'Inspección de Guardia'),
        ('reparacion', 'Evidencia de Reparación'),
    ]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="evidencias")
    fase = models.CharField(max_length=20, choices=FASE_CHOICES, default='reporte')
    imagen_url = models.TextField(blank=True, null=True, verbose_name="URL o Data Base64 de Imagen")
    creado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Evidencia Fotográfica"
        verbose_name_plural = "Evidencias Fotográficas"


class LogAuditoria(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name="logs_auditoria")
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    accion = models.CharField(max_length=150)
    estado_anterior = models.CharField(max_length=50, null=True, blank=True)
    estado_nuevo = models.CharField(max_length=50, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    detalle = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de Auditoría"
        verbose_name_plural = "Logs de Auditoría"
        ordering = ["-created_at"]


class Inasistencia(models.Model):
    ESTADO_CHOICES = (
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    )
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='inasistencias')
    motivo = models.TextField()
    fecha_desde = models.DateField()
    fecha_hasta = models.DateField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    observacion_gestor = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Inasistencia"
        verbose_name_plural = "Inasistencias"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.usuario.get_full_name()} ({self.fecha_desde} a {self.fecha_hasta}) - {self.estado}"
