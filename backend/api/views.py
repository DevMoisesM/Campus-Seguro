from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from .models import (
    Rol, Escuela, Departamento, Carrera, Usuario,
    EstadoCatalogo, Sede, Edificio, Piso, TipoUbicacion, Ubicacion,
    Especialidad, CategoriaTicket, CategoriaMaterial, Ticket,
    ValidacionGuardia, SesionTrabajo, MaterialUtilizado, EvidenciaFotografica, LogAuditoria
)
from .serializers import (
    CustomTokenObtainPairSerializer, UsuarioSerializer, UsuarioCreateUpdateSerializer,
    RolSerializer, EscuelaSerializer, DepartamentoSerializer, CarreraSerializer, EspecialidadSerializer,
    SedeSerializer, EdificioSerializer, PisoSerializer, TipoUbicacionSerializer, UbicacionSerializer,
    CategoriaTicketSerializer, CategoriaMaterialSerializer, EstadoCatalogoSerializer,
    TicketCreateUpdateSerializer, TicketDetailSerializer, ValidacionGuardiaSerializer,
    SesionTrabajoSerializer, MaterialUtilizadoSerializer, EvidenciaFotograficaSerializer, LogAuditoriaSerializer
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


class RolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [permissions.IsAuthenticated]


class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer
    permission_classes = [permissions.IsAuthenticated]


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
            'creado_por', 'validado_por', 'asignado_a'
        ).prefetch_related('evidencias', 'materiales_utilizados', 'sesiones_trabajo')

        if user.is_superuser:
            return queryset

        rol_codigo = user.rol.codigo if user.rol else 'usuario'

        if rol_codigo == 'usuario':
            # Usuario Base solo ve los tickets que él ha creado
            return queryset.filter(creado_por=user)
        elif rol_codigo == 'guardia':
            # Guardia ve tickets pendientes de validación o que él validó
            return queryset.filter(Q(estado__codigo__in=['enviado', 'validado']) | Q(validado_por=user))
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

        ticket = serializer.save(
            creado_por=self.request.user,
            estado=estado_enviado
        )

        LogAuditoria.objects.create(
            ticket=ticket,
            usuario=self.request.user,
            accion='Ticket creado',
            estado_nuevo=estado_enviado.nombre_display,
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

        nuevo_codigo = 'validado' if valido else 'rechazado'
        nuevo_estado = EstadoCatalogo.objects.filter(entidad='ticket', codigo=nuevo_codigo).first()

        if nuevo_estado:
            ticket.estado = nuevo_estado
            ticket.validado_por = request.user
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
    def derivar_mantencion(self, request, pk=None):
        """
        Acción del Gestor para asignar un ticket a un mantenedor específico.
        """
        ticket = self.get_object()
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
    def registrar_mantencion(self, request, pk=None):
        """
        Acción del Mantenedor para registrar el trabajo realizado, materiales usados y evidencia.
        """
        ticket = self.get_object()
        observacion = request.data.get('observacion', '')
        materiales = request.data.get('materiales', [])
        imagen_url = request.data.get('imagen_url')

        # Registrar sesión de trabajo
        SesionTrabajo.objects.create(
            ticket=ticket,
            mantenedor=request.user,
            observaciones=observacion,
            fin=timezone.now()
        )

        # Registrar materiales
        for mat in materiales:
            MaterialUtilizado.objects.create(
                ticket=ticket,
                nombre_material=mat.get('nombre', 'Material'),
                cantidad=mat.get('cantidad', 1),
                unidad=mat.get('unidad', 'unidades')
            )

        # Registrar evidencia
        if imagen_url:
            EvidenciaFotografica.objects.create(
                ticket=ticket,
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
        Métricas generales para el Dashboard BI del Gestor.
        """
        user = request.user
        if not (user.is_superuser or (user.rol and user.rol.codigo == 'gestor')):
            return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

        total_tickets = Ticket.objects.filter(deleted_at__isnull=True).count()
        enviados = Ticket.objects.filter(deleted_at__isnull=True, estado__codigo='enviado').count()
        validados = Ticket.objects.filter(deleted_at__isnull=True, estado__codigo='validado').count()
        en_mantencion = Ticket.objects.filter(deleted_at__isnull=True, estado__codigo='en_mantencion').count()
        reparados = Ticket.objects.filter(deleted_at__isnull=True, estado__codigo='reparado').count()
        cerrados = Ticket.objects.filter(deleted_at__isnull=True, estado__codigo='cerrado').count()

        return Response({
            'total': total_tickets,
            'enviados': enviados,
            'validados': validados,
            'en_mantencion': en_mantencion,
            'reparados': reparados,
            'cerrados': cerrados,
        })


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
