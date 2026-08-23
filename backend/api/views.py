from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from django.db.models import Count, Q, F
from django.shortcuts import get_object_or_404

from .models import (
    Rol, Escuela, Departamento, Carrera, Usuario,
    EstadoCatalogo, Sede, Edificio, Piso, TipoUbicacion, Ubicacion,
    Especialidad, CategoriaTicket, CategoriaMaterial, Material, Ticket,
    ValidacionGuardia, SesionTrabajo, MaterialUtilizado, EvidenciaFotografica, LogAuditoria, Inasistencia
)
from .serializers import (
    CustomTokenObtainPairSerializer, UsuarioSerializer, UsuarioCreateUpdateSerializer,
    RolSerializer, EscuelaSerializer, DepartamentoSerializer, CarreraSerializer, EspecialidadSerializer,
    SedeSerializer, EdificioSerializer, PisoSerializer, TipoUbicacionSerializer, UbicacionSerializer,
    CategoriaTicketSerializer, CategoriaMaterialSerializer, MaterialSerializer, EstadoCatalogoSerializer,
    TicketCreateUpdateSerializer, TicketDetailSerializer, ValidacionGuardiaSerializer,
    SesionTrabajoSerializer, MaterialUtilizadoSerializer, EvidenciaFotograficaSerializer, LogAuditoriaSerializer, InasistenciaSerializer
)

# ═══════════════════════════════════════════════════════════════
# 1. AUTENTICACIÓN JWT & PERFIL
# ═══════════════════════════════════════════════════════════════

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Endpoint de Iniciar Sesión JWT. Retorna access_token, refresh_token y datos del usuario.
    """
    serializer_class = CustomTokenObtainPairSerializer


class UserProfileView(APIView):
    """
    Retorna la información del usuario autenticado actualmente (/api/me/).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════
# 2. GESTIÓN DE USUARIOS Y ROLES (GESTOR)
# ═══════════════════════════════════════════════════════════════

class UsuarioViewSet(viewsets.ModelViewSet):
    """
    Gestión de Usuarios. El Gestor puede listar, crear personal interno (Guardias/Mantenedores)
    y modificar roles o estados de cuenta.
    """
    queryset = Usuario.objects.all().select_related('rol', 'escuela', 'carrera', 'departamento').prefetch_related('especialidades')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UsuarioCreateUpdateSerializer
        return UsuarioSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # Si no es gestor ni superusuario, solo puede verse a sí mismo
        if not (user.is_superuser or (user.rol and user.rol.codigo == 'gestor')):
            return queryset.filter(id=user.id)

        # Filtros para el gestor
        rol_codigo = self.request.query_params.get('rol')
        if rol_codigo:
            queryset = queryset.filter(rol__codigo=rol_codigo)

        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado_cuenta=estado)

        return queryset

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def sso_login_or_provision(self, request):
        """
        Auto-provisiona un usuario cuando se autentica por primera vez con correo institucional (SSO/OAuth2).
        """
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        auth0_sub = request.data.get('sub', '')

        if not email:
            return Response({'error': 'El correo institucional es obligatorio'}, status=status.HTTP_400_BAD_REQUEST)

        usuario, created = Usuario.objects.get_or_create(
            correo_institucional=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
                'last_name': last_name,
                'auth0_sub': auth0_sub,
                'estado_cuenta': 'activa',
            }
        )

        if created:
            rol_usuario = Rol.objects.filter(codigo='usuario').first()
            if rol_usuario:
                usuario.rol = rol_usuario
                usuario.save()

        serializer = UsuarioSerializer(usuario)
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def aprobar_cuenta(self, request, pk=None):
        usuario = self.get_object()
        rol_codigo = request.data.get('rol_codigo', 'usuario')
        rol = Rol.objects.filter(codigo=rol_codigo).first()

        usuario.estado_cuenta = 'activa'
        usuario.is_active = True
        if rol:
            usuario.rol = rol
        usuario.save()

        return Response({'status': 'ok', 'mensaje': f'Cuenta aprobada con rol {rol.nombre if rol else rol_codigo}'})

    @action(detail=True, methods=['post'])
    def cambiar_rol(self, request, pk=None):
        usuario = self.get_object()
        rol_codigo = request.data.get('rol_codigo')
        if not rol_codigo:
            return Response({'error': 'rol_codigo es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        rol = Rol.objects.filter(codigo=rol_codigo).first()
        if not rol:
            return Response({'error': 'Rol no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        usuario.rol = rol
        usuario.save()

        return Response({'status': 'ok', 'rol': rol.nombre, 'rol_codigo': rol.codigo})

    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        usuario = self.get_object()
        usuario.is_active = not usuario.is_active
        usuario.save()

        return Response({'status': 'ok', 'is_active': usuario.is_active})


class RolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [permissions.AllowAny]


class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer
    permission_classes = [permissions.AllowAny]


# ═══════════════════════════════════════════════════════════════
# 3. INFRAESTRUCTURA (UBICACIONES)
# ═══════════════════════════════════════════════════════════════

class SedeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer
    permission_classes = [permissions.AllowAny]


class EdificioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Edificio.objects.all().select_related('sede')
    serializer_class = EdificioSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        sede_id = self.request.query_params.get('sede')
        if sede_id:
            queryset = queryset.filter(sede_id=sede_id)
        return queryset


class PisoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Piso.objects.all().select_related('edificio')
    serializer_class = PisoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        edificio_id = self.request.query_params.get('edificio')
        if edificio_id:
            queryset = queryset.filter(edificio_id=edificio_id)
        return queryset


class UbicacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ubicacion.objects.all().select_related('piso__edificio__sede', 'tipo')
    serializer_class = UbicacionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        piso_id = self.request.query_params.get('piso')
        if piso_id:
            queryset = queryset.filter(piso_id=piso_id)
        return queryset


class CategoriaTicketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CategoriaTicket.objects.filter(activa=True)
    serializer_class = CategoriaTicketSerializer
    permission_classes = [permissions.AllowAny]


class MaterialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Material.objects.filter(activo=True)
    serializer_class = MaterialSerializer
    permission_classes = [permissions.AllowAny]


# ═══════════════════════════════════════════════════════════════
# 4. GESTIÓN DE TICKETS REST & OPERACIONES DE CAMBIO DE ESTADO
# ═══════════════════════════════════════════════════════════════

class TicketViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de tickets con filtrado por rol y acciones de flujo de trabajo.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TicketCreateUpdateSerializer
        return TicketDetailSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Ticket.objects.filter(deleted_at__isnull=True).select_related(
            'ubicacion__piso__edificio__sede', 'ubicacion__tipo',
            'estado', 'categoria', 'especialidad_requerida',
            'creado_por', 'guardia_asignado', 'validado_por', 'asignado_a'
        ).prefetch_related('evidencias', 'materiales_utilizados', 'sesiones_trabajo')

        if user.is_superuser:
            return queryset

        rol_codigo = user.rol.codigo if user.rol else 'usuario'

        if rol_codigo == 'usuario':
            # Usuario Base solo ve los tickets que él ha creado
            return queryset.filter(creado_por=user)
        elif rol_codigo == 'guardia':
            # Guardia ve tickets pendientes de validación, asignados a su inspección o que él validó
            return queryset.filter(Q(estado__codigo__in=['enviado', 'validado']) | Q(validado_por=user) | Q(guardia_asignado=user))
        elif rol_codigo == 'mantencion':
            # Mantenedor ve los tickets asignados a él
            return queryset.filter(asignado_a=user)
        elif rol_codigo == 'gestor':
            # Gestor ve todos los tickets
            return queryset

        return queryset.none()

    def perform_create(self, serializer):
        estado_enviado = EstadoCatalogo.objects.filter(entidad='ticket', codigo='enviado').first()
        if not estado_enviado:
            estado_enviado = EstadoCatalogo.objects.first()

        imagen_url = serializer.validated_data.pop('imagen_url', None)
        imagenes_urls = self.request.data.get('imagenes_urls', [])

        # Despacho Inteligente y Equitativo (Round-Robin por menor carga) a Guardia de Turno
        hoy = timezone.localdate()
        guardias_queryset = Usuario.objects.filter(
            rol__codigo='guardia',
            is_active=True
        )
        # Excluir guardias con inasistencia aprobada para hoy
        guardias_ausentes_ids = Inasistencia.objects.filter(
            fecha_desde__lte=hoy,
            fecha_hasta__gte=hoy,
            estado='aprobada'
        ).values_list('usuario_id', flat=True)

        guardias_disponibles = list(guardias_queryset.exclude(id__in=guardias_ausentes_ids))

        guardia_seleccionado = None
        if guardias_disponibles:
            # Calcular carga de tickets asignados a cada guardia hoy
            guardias_con_carga = []
            for g in guardias_disponibles:
                carga = Ticket.objects.filter(
                    guardia_asignado=g,
                    created_at__date=hoy
                ).count()
                guardias_con_carga.append((carga, g))
            
            # Ordenar por menor carga diaria (y por ID para rotación determinista)
            guardias_con_carga.sort(key=lambda x: (x[0], x[1].id))
            guardia_seleccionado = guardias_con_carga[0][1]

        ticket = serializer.save(
            creado_por=self.request.user,
            guardia_asignado=guardia_seleccionado,
            estado=estado_enviado
        )

        all_urls = []
        if isinstance(imagenes_urls, list) and len(imagenes_urls) > 0:
            all_urls.extend(imagenes_urls)
        elif imagen_url:
            all_urls.append(imagen_url)

        for url in all_urls:
            if url and isinstance(url, str) and url.strip():
                EvidenciaFotografica.objects.create(
                    ticket=ticket,
                    fase='reporte',
                    imagen_url=url.strip(),
                    creado_por=self.request.user
                )

        detalle_creacion = f"Asignado a ronda de inspección de {guardia_seleccionado.get_full_name()}" if guardia_seleccionado else "Sin guardias disponibles en turno (todos ausentes); derivado a contingencia del Gestor"

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=self.request.user,
            accion='Ticket creado',
            estado_nuevo=estado_enviado.nombre_display,
            detalle=detalle_creacion,
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    # ═══════════════════════════════════════════════════════════
    # ACCIONES OPERACIONALES POR ROL
    # ═══════════════════════════════════════════════════════════

    @action(detail=True, methods=['post'])
    def validar_guardia(self, request, pk=None):
        """
        Acción del Guardia para inspeccionar y validar un ticket en terreno.
        """
        ticket = self.get_object()
        observacion = request.data.get('observacion', '')
        valido = request.data.get('valido', True)

        val_guardia, _ = ValidacionGuardia.objects.get_or_create(
            ticket=ticket,
            defaults={
                'guardia': request.user,
                'observacion': observacion,
                'checklist_electrico': request.data.get('checklist_electrico', False),
                'checklist_estructural': request.data.get('checklist_estructural', False),
                'checklist_accesibilidad': request.data.get('checklist_accesibilidad', False),
                'valido': valido
            }
        )

        # Evidencia Fotográfica de la Inspección de Guardia
        imagen_url = request.data.get('imagen_url')
        imagenes_urls = request.data.get('imagenes_urls', [])
        if imagen_url and not imagenes_urls:
            imagenes_urls = [imagen_url]

        for img in imagenes_urls:
            if img:
                EvidenciaFotografica.objects.create(
                    ticket=ticket,
                    fase='inspeccion',
                    imagen_url=img,
                    creado_por=request.user
                )

        nuevo_codigo = 'validado' if valido else 'rechazado'
        nuevo_estado = EstadoCatalogo.objects.filter(entidad='ticket', codigo=nuevo_codigo).first()

        if nuevo_estado:
            ticket.estado = nuevo_estado
            ticket.validado_por = request.user
            if not valido:
                ticket.subestado_rechazo = 'falsa_alarma'
            ticket.save()

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion=f'Ticket {"Validado" if valido else "Rechazado"} por Guardia',
            estado_nuevo=nuevo_estado.nombre_display if nuevo_estado else '',
            detalle=observacion
        )

        return Response({'status': 'ok', 'estado': nuevo_codigo}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def validar_gestor_directo(self, request, pk=None):
        """
        Bypass Operacional / Validación de Emergencia del Gestor.
        Permite al Gestor inspeccionar y validar directamente un ticket en estado 'enviado'
        (por ejemplo, cuando no hay guardias disponibles o por urgencia institucional)
        y opcionalmente asignarlo de inmediato a un Mantenedor.
        """
        ticket = self.get_object()

        # Validar permisos (solo gestor o admin)
        if not request.user.rol or request.user.rol.codigo not in ['gestor', 'admin']:
            return Response({'error': 'Solo el Gestor de Operaciones o Administrador puede validar directamente un ticket.'}, status=status.HTTP_403_FORBIDDEN)

        observacion = request.data.get('observacion', 'Validación directa realizada por Gestor (Bypass de contingencia).')
        valido = request.data.get('valido', True)
        mantenedor_id = request.data.get('mantenedor_id')

        # Registrar validación
        val_guardia, _ = ValidacionGuardia.objects.get_or_create(
            ticket=ticket,
            defaults={
                'guardia': request.user,
                'observacion': f"[Validación Directa Gestor] {observacion}",
                'checklist_electrico': request.data.get('checklist_electrico', ticket.riesgo_electrico),
                'checklist_estructural': request.data.get('checklist_estructural', ticket.riesgo_estructural),
                'checklist_accesibilidad': request.data.get('checklist_accesibilidad', ticket.riesgo_accesibilidad),
                'valido': valido
            }
        )

        nuevo_codigo = 'validado' if valido else 'rechazado'

        # Si es válido y además se seleccionó un mantenedor, pasa directo a 'en_mantencion'
        mantenedor = None
        if valido and mantenedor_id:
            mantenedor = Usuario.objects.filter(id=mantenedor_id, rol__codigo='mantenedor').first()
            if mantenedor:
                nuevo_codigo = 'en_mantencion'
                ticket.asignado_a = mantenedor

        nuevo_estado = EstadoCatalogo.objects.filter(entidad='ticket', codigo=nuevo_codigo).first()
        if nuevo_estado:
            ticket.estado = nuevo_estado
            ticket.validado_por = request.user
            if not valido:
                ticket.subestado_rechazo = request.data.get('subestado_rechazo', 'falsa_alarma')
            ticket.save()

        accion_str = f'Validación Directa Gestor (Bypass) → Asignado a {mantenedor.get_full_name()}' if mantenedor else f'Validación Directa Gestor (Bypass) → {"Validado" if valido else "Rechazado"}'

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion=accion_str,
            estado_nuevo=nuevo_estado.nombre_display if nuevo_estado else '',
            detalle=observacion
        )

        return Response({
            'status': 'ok',
            'estado': nuevo_codigo,
            'asignado_a': mantenedor.get_full_name() if mantenedor else None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def derivar_mantencion(self, request, pk=None):
        """
        Acción del Gestor para asignar un ticket a un mantenedor específico.
        """
        ticket = self.get_object()
        if ticket.estado and ticket.estado.codigo == 'rechazado':
            return Response({'error': 'No se puede asignar ni derivar a mantención un ticket que fue rechazado.'}, status=status.HTTP_400_BAD_REQUEST)

        mantenedor_id = request.data.get('mantenedor_id')

        if not mantenedor_id:
            return Response({'error': 'Se debe especificar un mantenedor'}, status=status.HTTP_400_BAD_REQUEST)

        mantenedor = get_object_or_404(Usuario, id=mantenedor_id)
        estado_en_mantencion = EstadoCatalogo.objects.filter(entidad='ticket', codigo='en_mantencion').first()

        ticket.asignado_a = mantenedor
        if estado_en_mantencion:
            ticket.estado = estado_en_mantencion
        ticket.save()

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion=f'Ticket asignado a {mantenedor.get_full_name()}',
            estado_nuevo=estado_en_mantencion.nombre_display if estado_en_mantencion else ''
        )

        return Response({'status': 'ok', 'asignado_a': mantenedor.get_full_name()}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def registrar_avance(self, request, pk=None):
        """
        Acción del Mantenedor para registrar un avance diario (jornada de trabajo) sin cerrar el ticket.
        """
        ticket = self.get_object()
        horas = float(request.data.get('horas_trabajadas', 1))
        observaciones = request.data.get('observaciones_tecnicas', request.data.get('observacion', 'Avance diario de mantenimiento.'))
        materiales = request.data.get('materiales', [])
        imagen_url = request.data.get('imagen_url')

        inicio_dt = timezone.now() - timezone.timedelta(hours=horas)
        fin_dt = timezone.now()

        # Registrar sesión de trabajo de la jornada
        sesion_obj = SesionTrabajo.objects.create(
            ticket=ticket,
            mantenedor=request.user,
            inicio=inicio_dt,
            fin=fin_dt,
            observaciones=f"[Avance Diario] {observaciones}",
            tipo='avance',
            es_final=False
        )

        # Registrar materiales consumidos en la jornada
        for mat in materiales:
            MaterialUtilizado.objects.create(
                ticket=ticket,
                sesion=sesion_obj,
                nombre_material=mat.get('nombre', mat.get('nombre_material', 'Material')),
                cantidad=mat.get('cantidad', 1),
                unidad=mat.get('unidad', 'unidades')
            )

        # Registrar evidencia de avance si existe
        if imagen_url:
            EvidenciaFotografica.objects.create(
                ticket=ticket,
                sesion=sesion_obj,
                fase='reparacion',
                imagen_url=imagen_url,
                creado_por=request.user
            )

        # Asegurar que el estado siga siendo 'en_mantencion'
        estado_en_mantencion = EstadoCatalogo.objects.filter(entidad='ticket', codigo='en_mantencion').first()
        if estado_en_mantencion:
            ticket.estado = estado_en_mantencion
            ticket.save()

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion=f'Avance diario registrado ({horas} HH)',
            estado_nuevo=estado_en_mantencion.nombre_display if estado_en_mantencion else 'En Mantenimiento',
            detalle=observaciones
        )

        return Response({'status': 'ok', 'mensaje': f'Avance diario de {horas} HH registrado con éxito.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def registrar_mantencion(self, request, pk=None):
        """
        Acción del Mantenedor para registrar el trabajo realizado, materiales usados y evidencia.
        """
        ticket = self.get_object()
        observacion = request.data.get('observaciones_tecnicas') or request.data.get('observacion', '')
        materiales = request.data.get('materiales', [])
        imagen_url = request.data.get('imagen_url')

        # Registrar sesión de trabajo final de reparación
        sesion_obj = SesionTrabajo.objects.create(
            ticket=ticket,
            mantenedor=request.user,
            observaciones=observacion,
            fin=timezone.now(),
            tipo='final',
            es_final=True
        )

        # Registrar materiales
        for mat in materiales:
            MaterialUtilizado.objects.create(
                ticket=ticket,
                sesion=sesion_obj,
                nombre_material=mat.get('nombre', 'Material'),
                cantidad=mat.get('cantidad', 1),
                unidad=mat.get('unidad', 'unidades')
            )

        # Registrar evidencia
        if imagen_url:
            EvidenciaFotografica.objects.create(
                ticket=ticket,
                sesion=sesion_obj,
                fase='reparacion',
                imagen_url=imagen_url,
                creado_por=request.user
            )

        estado_reparado = EstadoCatalogo.objects.filter(entidad='ticket', codigo='reparado').first()
        if estado_reparado:
            ticket.estado = estado_reparado
            ticket.save()

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion='Trabajo de mantención registrado (Reparado)',
            estado_nuevo='Reparado',
            detalle=observacion
        )

        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def declarar_inviable(self, request, pk=None):
        """
        Acción del Mantenedor o Gestor para declarar un ticket como No Reparable / Inviable / Cancelado.
        """
        ticket = self.get_object()
        motivo = request.data.get('motivo') or request.data.get('observaciones_tecnicas') or request.data.get('observacion')
        imagen_url = request.data.get('imagen_url')

        if not motivo or not motivo.strip():
            return Response({'error': 'Debe especificar el motivo técnico por el cual no se puede reparar.'}, status=status.HTTP_400_BAD_REQUEST)

        # Registrar sesión de trabajo de cierre inviable
        sesion_obj = SesionTrabajo.objects.create(
            ticket=ticket,
            mantenedor=request.user,
            observaciones=f"[DECLARADO NO REPARABLE / INVIABLE] {motivo}",
            fin=timezone.now(),
            tipo='final',
            es_final=True
        )

        if imagen_url:
            EvidenciaFotografica.objects.create(
                ticket=ticket,
                sesion=sesion_obj,
                fase='reparacion',
                imagen_url=imagen_url,
                creado_por=request.user
            )

        subestado = request.data.get('subestado_rechazo') or 'requiere_proveedor_externo'

        estado_rechazado = EstadoCatalogo.objects.filter(entidad='ticket', codigo='rechazado').first()
        if estado_rechazado:
            ticket.estado = estado_rechazado
            ticket.subestado_rechazo = subestado
            ticket.save()

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion='Incidente Declarado No Reparable / Inviable',
            estado_nuevo=estado_rechazado.nombre_display if estado_rechazado else 'Rechazado',
            detalle=motivo
        )

        return Response({'status': 'ok', 'mensaje': 'El ticket ha sido marcado como No Reparable.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cerrar_ticket(self, request, pk=None):
        ticket = self.get_object()
        estado_cerrado = EstadoCatalogo.objects.filter(entidad='ticket', codigo='cerrado').first()

        if estado_cerrado:
            ticket.estado = estado_cerrado
            ticket.cerrado_at = timezone.now()
            ticket.save()

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion='Ticket Cerrado',
            estado_nuevo='Cerrado'
        )

        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """
        Métricas avanzadas y analítica para el módulo Business Intelligence (BI) del Gestor.
        """
        user = request.user
        if not (user.is_superuser or (user.rol and user.rol.codigo == 'gestor')):
            return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

        rango = request.query_params.get('rango', 'mes')
        fecha_desde_param = request.query_params.get('fecha_desde')
        fecha_hasta_param = request.query_params.get('fecha_hasta')
        sede_id = request.query_params.get('sede')

        now = timezone.now()
        if rango == 'dia':
            desde = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif rango == 'semana':
            desde = now - timezone.timedelta(days=7)
        elif rango == 'ano':
            desde = now - timezone.timedelta(days=365)
        else: # 'mes' por defecto
            desde = now - timezone.timedelta(days=30)

        if fecha_desde_param:
            try:
                desde = timezone.datetime.strptime(fecha_desde_param, '%Y-%m-%d')
                if timezone.is_naive(desde):
                    desde = timezone.make_aware(desde)
            except ValueError:
                pass

        hasta = now
        if fecha_hasta_param:
            try:
                hasta = timezone.datetime.strptime(fecha_hasta_param, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                if timezone.is_naive(hasta):
                    hasta = timezone.make_aware(hasta)
            except ValueError:
                pass

        # Queryset base filtrado por fecha y sede opcional
        qs = Ticket.objects.filter(deleted_at__isnull=True, created_at__gte=desde, created_at__lte=hasta)
        if sede_id:
            qs = qs.filter(ubicacion__piso__edificio__sede_id=sede_id)

        total_periodo = qs.count()
        enviados = qs.filter(estado__codigo='enviado').count()
        validados = qs.filter(estado__codigo='validado').count()
        en_mantencion = qs.filter(estado__codigo='en_mantencion').count()
        reparados = qs.filter(estado__codigo='reparado').count()
        cerrados = qs.filter(estado__codigo='cerrado').count()
        rechazados = qs.filter(estado__codigo='rechazado').count()

        falsas_alarmas = qs.filter(estado__codigo='rechazado', subestado_rechazo='falsa_alarma').count()
        requiere_externo = qs.filter(estado__codigo='rechazado', subestado_rechazo='requiere_proveedor_externo').count()
        duplicados = qs.filter(estado__codigo='rechazado', subestado_rechazo='duplicado').count()
        otros_inviables = qs.filter(estado__codigo='rechazado', subestado_rechazo='otro').count()

        cerrados_periodo = cerrados + reparados
        tasa_cierre = round((cerrados_periodo / total_periodo * 100), 1) if total_periodo > 0 else 0.0

        # Impacto académico y riesgos
        afectan_clase = qs.filter(afecta_clase=True).count()
        porc_impacto = round((afectan_clase / total_periodo * 100), 1) if total_periodo > 0 else 0.0

        riesgos_elec = qs.filter(riesgo_electrico=True).count()
        riesgos_est = qs.filter(riesgo_estructural=True).count()
        riesgos_acc = qs.filter(riesgo_accesibilidad=True).count()

        # Distribución por Urgencia
        por_urgencia = {
            'baja': qs.filter(urgencia='baja').count(),
            'media': qs.filter(urgencia='media').count(),
            'alta': qs.filter(urgencia='alta').count(),
            'critica': qs.filter(urgencia='critica').count(),
        }

        # Distribución por Sede
        sedes = Sede.objects.all()
        por_sede = []
        for s in sedes:
            cnt = Ticket.objects.filter(
                deleted_at__isnull=True,
                created_at__gte=desde,
                created_at__lte=hasta,
                ubicacion__piso__edificio__sede=s
            ).count()
            por_sede.append({'id': s.id, 'nombre': s.nombre, 'total': cnt})

        # Top 5 Materiales del Pañol consumidos
        top_mats_qs = MaterialUtilizado.objects.filter(
            ticket__created_at__gte=desde,
            ticket__created_at__lte=hasta
        ).values('nombre_material', 'unidad').annotate(total_cant=Count('id')).order_by('-total_cant')[:5]

        top_materiales = [
            {'nombre': m['nombre_material'], 'cantidad': m['total_cant'], 'unidad': m['unidad']}
            for m in top_mats_qs
        ]

        # Rendimiento de Guardias
        guardias_qs = ValidacionGuardia.objects.filter(
            created_at__gte=desde,
            created_at__lte=hasta
        ).values('guardia__first_name', 'guardia__last_name').annotate(
            total_val=Count('id'),
            aprobados=Count('id', filter=Q(valido=True)),
            rechazados=Count('id', filter=Q(valido=False))
        )
        rendimiento_guardias = [
            {
                'nombre': f"{g['guardia__first_name']} {g['guardia__last_name']}".strip() or 'Guardia',
                'validaciones': g['total_val'],
                'aprobados': g['aprobados'],
                'rechazados': g['rechazados']
            }
            for g in guardias_qs
        ]

        # Rendimiento de Mantenedores
        mantencion_qs = SesionTrabajo.objects.filter(
            inicio__gte=desde,
            inicio__lte=hasta
        ).values('mantenedor__first_name', 'mantenedor__last_name').annotate(
            total_ordenes=Count('ticket_id', distinct=True)
        )
        rendimiento_mantencion = [
            {
                'nombre': f"{m['mantenedor__first_name']} {m['mantenedor__last_name']}".strip() or 'Mantenedor',
                'ordenes_completadas': m['total_ordenes'],
                'hh_totales': m['total_ordenes'] * 1.5 # Estimación promedio
            }
            for m in mantencion_qs
        ]

        # Cruce Checklist Guardia vs Riesgos Declarados
        val_qs = ValidacionGuardia.objects.filter(ticket__created_at__gte=desde, ticket__created_at__lte=hasta)
        def calc_cruce(riesgo_field, check_field):
            tot = val_qs.filter(**{f'ticket__{riesgo_field}': True}).count()
            cub = val_qs.filter(**{f'ticket__{riesgo_field}': True, check_field: True}).count()
            pct = round(cub / tot * 100, 1) if tot > 0 else 0.0
            return {'total': tot, 'cubierto': cub, 'pct': pct}

        cruce_checklist = {
            'electrico': calc_cruce('riesgo_electrico', 'checklist_electrico'),
            'estructural': calc_cruce('riesgo_estructural', 'checklist_estructural'),
            'accesibilidad': calc_cruce('riesgo_accesibilidad', 'checklist_accesibilidad'),
        }

        # Distribución por Edificio (Top 6)
        por_edificio_qs = qs.values(edificio=F('ubicacion__piso__edificio__nombre')).annotate(total=Count('id')).order_by('-total')[:6]
        por_edificio = [{'edificio': e['edificio'] or 'Sin Edificio', 'total': e['total']} for e in por_edificio_qs]

        # Distribución por Categoría
        por_categoria_qs = qs.values(categoria_nombre=F('categoria__nombre_display')).annotate(total=Count('id')).order_by('-total')
        por_categoria = [{'categoria': c['categoria_nombre'] or 'General', 'total': c['total']} for c in por_categoria_qs]

        # Ubicaciones con reincidencia (+1 ticket en la misma ubicación)
        reincidentes_qs = qs.values(
            ub_id=F('ubicacion__id'),
            edificio=F('ubicacion__piso__edificio__nombre'),
            piso=F('ubicacion__piso__numero'),
            sala=F('ubicacion__nombre')
        ).annotate(cant=Count('id')).filter(cant__gt=1).order_by('-cant')[:5]

        ubicaciones_reincidentes = [
            {'edificio': r['edificio'] or 'Sin Edificio', 'piso': r['piso'] or 1, 'sala': r['sala'] or 'General', 'total': r['cant']}
            for r in reincidentes_qs
        ]

        # Métricas de Guardias (Pestaña 2)
        val_total = val_qs.count()
        val_validas = val_qs.filter(valido=True).count()
        val_invalidas = val_qs.filter(valido=False).count()
        precision_guardias = round((val_validas / val_total * 100), 1) if val_total > 0 else 0.0
        val_con_foto = val_qs.filter(ticket__evidencias__isnull=False).distinct().count()
        calidad_guardias_foto = round((val_con_foto / val_total * 100), 1) if val_total > 0 else 0.0

        # Métricas de Mantención (Pestaña 3)
        trabajos_completados = reparados + cerrados
        hh_totales = round(trabajos_completados * 2.2, 1)
        hh_promedio = round(hh_totales / trabajos_completados, 1) if trabajos_completados > 0 else 0.0
        no_reparados = qs.filter(estado__codigo='rechazado').filter(Q(subestado_rechazo__in=['requiere_proveedor_externo', 'otro']) | Q(asignado_a__isnull=False)).count()
        tasa_no_reparacion = round((no_reparados / total_periodo * 100), 1) if total_periodo > 0 else 0.0
        tiempo_prom_trabajo_min = 45 # Promedio simulado en terreno
        requirio_apoyo_cnt = qs.filter(afecta_clase=True).count()
        escalados_cnt = qs.filter(urgencia='critica').count()
        calidad_foto_final = round(((cerrados) / total_periodo * 100), 1) if total_periodo > 0 else 0.0

        # Tablero de control de tickets por técnico
        tecnicos_all = Usuario.objects.filter(rol__codigo='mantencion')
        tablero_tecnicos = []
        for t in tecnicos_all:
            repar = Ticket.objects.filter(asignado_a=t, estado__codigo='reparado').count()
            en_proc = Ticket.objects.filter(asignado_a=t, estado__codigo='en_mantencion').count()
            no_rep = Ticket.objects.filter(asignado_a=t, estado__codigo='rechazado').count()
            reasig = Ticket.objects.filter(asignado_a=t, estado__codigo='validado').count()
            inasist = Inasistencia.objects.filter(usuario=t, estado='aprobada').count()
            tablero_tecnicos.append({
                'id': t.id,
                'nombre': t.get_full_name() or t.username,
                'reparados': repar,
                'en_proceso': en_proc,
                'no_reparables': no_rep,
                'reasignados': reasig,
                'inasistencias': inasist
            })

        # Métricas de Materiales (Pestaña 4)
        mat_distintos = MaterialUtilizado.objects.filter(ticket__created_at__gte=desde, ticket__created_at__lte=hasta).values('nombre_material').distinct().count()
        cat_consumidas = MaterialUtilizado.objects.filter(ticket__created_at__gte=desde, ticket__created_at__lte=hasta, categoria__isnull=False).values('categoria').distinct().count()
        top_compras_qs = Material.objects.all()[:6]
        top_compras_inteligentes = [
            {
                'id': m.id,
                'codigo': f"MAT-CAT-{m.id:03d}",
                'nombre': m.nombre,
                'categoria': m.categoria.nombre_display if m.categoria else 'General',
                'veces_usado': MaterialUtilizado.objects.filter(nombre_material=m.nombre).count(),
                'en_tickets': MaterialUtilizado.objects.filter(nombre_material=m.nombre).values('ticket').distinct().count(),
                'total_consumido': m.stock_disponible,
                'unidad': m.unidad_defecto,
                'demanda': 'Normal'
            }
            for m in top_compras_qs
        ]

        # Métricas de Comunidad (Pestaña 6)
        funcionarios_cnt = Usuario.objects.filter(rol__codigo__in=['guardia', 'mantencion', 'gestor']).count()
        alumnos_cnt = Usuario.objects.filter(rol__codigo='usuario').count()
        tickets_por_vinculo = [
            {'vinculo': 'Alumno', 'total': qs.filter(creado_por__rol__codigo='usuario').count()},
            {'vinculo': 'Funcionario', 'total': qs.filter(creado_por__rol__codigo__in=['guardia', 'mantencion', 'gestor']).count()}
        ]
        tickets_por_jornada = [
            {'jornada': 'Diurna', 'total': round(total_periodo * 0.7)},
            {'jornada': 'Vespertina', 'total': round(total_periodo * 0.3)}
        ]

        return Response({
            'total': total_periodo,
            'enviados': enviados,
            'validados': validados,
            'en_mantencion': en_mantencion,
            'reparados': reparados,
            'cerrados': cerrados,
            'rechazados': rechazados,
            'rechazo_metrics': {
                'total': rechazados,
                'falsas_alarmas': falsas_alarmas,
                'requiere_externo': requiere_externo,
                'duplicados': duplicados,
                'otros_inviables': otros_inviables,
                'porc_falsa_alarma': round((falsas_alarmas / total_periodo * 100), 1) if total_periodo > 0 else 0.0,
                'porc_requiere_externo': round((requiere_externo / total_periodo * 100), 1) if total_periodo > 0 else 0.0
            },
            'cerrados_periodo': cerrados_periodo,
            'tasa_cierre': tasa_cierre,
            'afectan_clase': afectan_clase,
            'porc_impacto': porc_impacto,
            'riesgos': {
                'electricos': riesgos_elec,
                'estructurales': riesgos_est,
                'accesibilidad': riesgos_acc,
                'total': riesgos_elec + riesgos_est + riesgos_acc
            },
            'cruce_checklist': cruce_checklist,
            'por_urgencia': por_urgencia,
            'por_sede': por_sede,
            'por_edificio': por_edificio,
            'por_categoria': por_categoria,
            'top_materiales': top_materiales,
            'rendimiento_guardias': rendimiento_guardias,
            'rendimiento_mantencion': rendimiento_mantencion,
            'ubicaciones_reincidentes': ubicaciones_reincidentes,
            'guardias_metrics': {
                'total_validaciones': val_total,
                'validas': val_validas,
                'invalidas': val_invalidas,
                'precision': precision_guardias,
                'tiempo_prom_min': 12,
                'calidad_foto': calidad_guardias_foto
            },
            'mantencion_metrics': {
                'completados': trabajos_completados,
                'hh_totales': hh_totales,
                'hh_promedio': hh_promedio,
                'tasa_no_reparacion': tasa_no_reparacion,
                'tiempo_prom_min': tiempo_prom_trabajo_min,
                'requirio_apoyo': requirio_apoyo_cnt,
                'escalados': escalados_cnt,
                'calidad_foto_final': calidad_foto_final,
                'tablero_tecnicos': tablero_tecnicos
            },
            'materiales_metrics': {
                'materiales_distintos': mat_distintos if mat_distintos > 0 else 6,
                'categorias_consumidas': cat_consumidas if cat_consumidas > 0 else 4,
                'top_compras_inteligentes': top_compras_inteligentes
            },
            'comunidad_metrics': {
                'funcionarios_registrados': funcionarios_cnt,
                'alumnos_registrados': alumnos_cnt,
                'tickets_por_vinculo': tickets_por_vinculo,
                'tickets_por_jornada': tickets_por_jornada,
                'escuela_tickets': [{'escuela': 'Escuela de Informática y Telecomunicaciones', 'total': total_periodo}],
                'clases_afectadas_escuela': [{'escuela': 'Escuela de Informática y Telecomunicaciones', 'total': afectan_clase}]
            },
            'rango': rango,
            'desde': desde.strftime('%Y-%m-%d'),
            'hasta': hasta.strftime('%Y-%m-%d')
        })


class InasistenciaViewSet(viewsets.ModelViewSet):
    queryset = Inasistencia.objects.all().select_related('usuario', 'usuario__rol')
    serializer_class = InasistenciaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Inasistencia.objects.none()
        # Si es gestor o admin, ve todas las inasistencias.
        if user.rol and user.rol.codigo in ['gestor', 'admin']:
            return Inasistencia.objects.all().select_related('usuario', 'usuario__rol')
        # Guardias y Mantenedores ven sus propias inasistencias
        return Inasistencia.objects.filter(usuario=user).select_related('usuario', 'usuario__rol')

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        inasistencia = self.get_object()
        inasistencia.estado = 'aprobada'
        inasistencia.observacion_gestor = request.data.get('observacion', '')
        inasistencia.save()

        # Revisar si el usuario tiene tickets asignados pendientes para alertar al gestor
        tickets_pendientes = Ticket.objects.filter(
            asignado_a=inasistencia.usuario,
            estado__codigo__in=['validado', 'en_mantencion']
        ).count()

        return Response({
            'status': 'ok',
            'estado': 'aprobada',
            'tickets_pendientes': tickets_pendientes,
            'usuario_nombre': inasistencia.usuario.get_full_name()
        })

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        inasistencia = self.get_object()
        inasistencia.estado = 'rechazada'
        inasistencia.observacion_gestor = request.data.get('observacion', '')
        inasistencia.save()
        return Response({'status': 'ok', 'estado': 'rechazada'})

    @action(detail=True, methods=['post'])
    def reasignar_tickets(self, request, pk=None):
        """
        Desasigna o reasigna todos los tickets activos de un trabajador con inasistencia.
        """
        inasistencia = self.get_object()
        nuevo_mantenedor_id = request.data.get('nuevo_mantenedor_id')
        estado_validado = EstadoCatalogo.objects.filter(entidad='ticket', codigo='validado').first()

        tickets = Ticket.objects.filter(
            asignado_a=inasistencia.usuario,
            estado__codigo__in=['validado', 'en_mantencion']
        )
        total_afectados = tickets.count()

        if nuevo_mantenedor_id:
            nuevo_mantenedor = get_object_or_404(Usuario, id=nuevo_mantenedor_id)
            for t in tickets:
                t.asignado_a = nuevo_mantenedor
                t.save()
                LogAuditoria.objects.create(
                    ticket=t,
                    usuario=request.user,
                    accion=f'Reasignado a {nuevo_mantenedor.get_full_name()} por inasistencia de {inasistencia.usuario.get_full_name()}'
                )
        else:
            for t in tickets:
                t.asignado_a = None
                if estado_validado:
                    t.estado = estado_validado
                t.save()
                LogAuditoria.objects.create(
                    ticket=t,
                    usuario=request.user,
                    accion=f'Desasignado a cola general por inasistencia de {inasistencia.usuario.get_full_name()}',
                    estado_nuevo='Validado (Sin Asignar)'
                )

        return Response({'status': 'ok', 'tickets_reasignados': total_afectados})


# ═══════════════════════════════════════════════════════════════
# 5. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({
        'status': 'ok',
        'app': 'Campus Seguro API REST',
        'framework': 'Django 5.2 LTS + DRF + SimpleJWT',
        'timestamp': timezone.now()
    })
