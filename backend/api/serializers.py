from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Rol, Escuela, Departamento, Carrera, Usuario,
    EstadoCatalogo, TransicionEstado, Sede, Edificio, Piso, TipoUbicacion, Ubicacion,
    Especialidad, CategoriaTicket, CategoriaMaterial, Material, Ticket,
    ValidacionGuardia, SesionTrabajo, MaterialUtilizado, EvidenciaFotografica, LogAuditoria, Inasistencia
)

# ═══════════════════════════════════════════════════════════════
# 1. AUTENTICACIÓN JWT PERSONALIZADA
# ═══════════════════════════════════════════════════════════════

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Personaliza la respuesta del Login JWT para adjuntar los datos del usuario en la respuesta.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.correo_institucional or self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'rut': self.user.rut,
            'rol_codigo': self.user.rol.codigo if self.user.rol else 'usuario',
            'rol_nombre': self.user.rol.nombre if self.user.rol else 'Usuario Base',
            'estado_cuenta': self.user.estado_cuenta,
        }
        return data


# ═══════════════════════════════════════════════════════════════
# 2. SERIALIZADORES DE ORGANIZACIÓN Y USUARIO
# ═══════════════════════════════════════════════════════════════

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id', 'nombre', 'codigo']


class EscuelaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escuela
        fields = ['id', 'nombre', 'codigo']


class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = ['id', 'nombre', 'codigo']


class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['id', 'nombre', 'activa']


class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = ['id', 'nombre', 'descripcion']


class UsuarioSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)
    escuela = EscuelaSerializer(read_only=True)
    carrera = CarreraSerializer(read_only=True)
    departamento = DepartamentoSerializer(read_only=True)
    especialidades = EspecialidadSerializer(many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'correo_institucional', 'first_name', 'last_name',
            'rut', 'telefono', 'rol', 'escuela', 'carrera', 'departamento',
            'estado_cuenta', 'auth0_sub', 'especialidades', 'is_active'
        ]


class UsuarioCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Usado por el Gestor para la provisión directa de personal o edición de cuentas.
    """
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'correo_institucional', 'first_name', 'last_name',
            'password', 'rut', 'telefono', 'rol', 'escuela', 'carrera', 'departamento',
            'estado_cuenta', 'especialidades'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        especialidades = validated_data.pop('especialidades', [])
        user = Usuario.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        if especialidades:
            user.especialidades.set(especialidades)
        return user


# ═══════════════════════════════════════════════════════════════
# 3. SERIALIZADORES DE INFRAESTRUCTURA (UBICACIONES)
# ═══════════════════════════════════════════════════════════════

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre', 'direccion']


class EdificioSerializer(serializers.ModelSerializer):
    sede_nombre = serializers.ReadOnlyField(source='sede.nombre')

    class Meta:
        model = Edificio
        fields = ['id', 'sede', 'sede_nombre', 'nombre']


class PisoSerializer(serializers.ModelSerializer):
    edificio_nombre = serializers.ReadOnlyField(source='edificio.nombre')

    class Meta:
        model = Piso
        fields = ['id', 'edificio', 'edificio_nombre', 'numero']


class TipoUbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoUbicacion
        fields = ['id', 'codigo', 'nombre_display']


class UbicacionSerializer(serializers.ModelSerializer):
    piso_numero = serializers.ReadOnlyField(source='piso.numero')
    edificio_nombre = serializers.ReadOnlyField(source='piso.edificio.nombre')
    sede_nombre = serializers.ReadOnlyField(source='piso.edificio.sede.nombre')
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre_display')

    class Meta:
        model = Ubicacion
        fields = [
            'id', 'piso', 'piso_numero', 'edificio_nombre', 'sede_nombre',
            'tipo', 'tipo_nombre', 'nombre', 'descripcion'
        ]


# ═══════════════════════════════════════════════════════════════
# 4. SERIALIZADORES DE CATÁLOGOS Y MATERIALES
# ═══════════════════════════════════════════════════════════════

class EstadoCatalogoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoCatalogo
        fields = ['id', 'entidad', 'codigo', 'nombre_display', 'orden', 'color_hex']


class CategoriaTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaTicket
        fields = ['id', 'codigo', 'nombre_display', 'descripcion']


class CategoriaMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaMaterial
        fields = ['id', 'codigo', 'nombre_display', 'descripcion']


class MaterialSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre_display')

    class Meta:
        model = Material
        fields = ['id', 'nombre', 'categoria', 'categoria_nombre', 'unidad_defecto', 'stock_disponible', 'activo']


class EvidenciaFotograficaSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.ReadOnlyField(source='creado_por.get_full_name')

    class Meta:
        model = EvidenciaFotografica
        fields = ['id', 'ticket', 'fase', 'imagen_url', 'creado_por', 'creado_por_nombre', 'created_at']


class ValidacionGuardiaSerializer(serializers.ModelSerializer):
    guardia_nombre = serializers.ReadOnlyField(source='guardia.get_full_name')

    class Meta:
        model = ValidacionGuardia
        fields = [
            'id', 'ticket', 'guardia', 'guardia_nombre', 'observacion',
            'checklist_electrico', 'checklist_estructural', 'checklist_accesibilidad',
            'valido', 'created_at'
        ]


class MaterialUtilizadoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre_display')

    class Meta:
        model = MaterialUtilizado
        fields = ['id', 'ticket', 'nombre_material', 'categoria', 'categoria_nombre', 'cantidad', 'unidad']


class SesionTrabajoSerializer(serializers.ModelSerializer):
    mantenedor_nombre = serializers.ReadOnlyField(source='mantenedor.get_full_name')
    materiales = MaterialUtilizadoSerializer(many=True, read_only=True)
    evidencias = EvidenciaFotograficaSerializer(many=True, read_only=True)

    class Meta:
        model = SesionTrabajo
        fields = ['id', 'ticket', 'mantenedor', 'mantenedor_nombre', 'inicio', 'fin', 'observaciones', 'tipo', 'es_final', 'materiales', 'evidencias']


class LogAuditoriaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.get_full_name')

    class Meta:
        model = LogAuditoria
        fields = ['id', 'ticket', 'usuario', 'usuario_nombre', 'accion', 'estado_anterior', 'estado_nuevo', 'ip_address', 'detalle', 'created_at']


# ═══════════════════════════════════════════════════════════════
# 5. SERIALIZADORES DE TICKET (LECTURA Y ESCRITURA)
# ═══════════════════════════════════════════════════════════════

class TicketCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para crear o editar tickets.
    """
    imagen_url = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'folio', 'titulo', 'descripcion', 'categoria', 'especialidad_requerida',
            'ubicacion', 'urgencia', 'afecta_clase', 'riesgo_electrico',
            'riesgo_estructural', 'riesgo_accesibilidad', 'imagen_url'
        ]
        read_only_fields = ['folio']



class TicketDetailSerializer(serializers.ModelSerializer):
    """
    Serializador de lectura completa con todas las relaciones anidadas.
    """
    ubicacion = UbicacionSerializer(read_only=True)
    estado = EstadoCatalogoSerializer(read_only=True)
    categoria = CategoriaTicketSerializer(read_only=True)
    especialidad_requerida = EspecialidadSerializer(read_only=True)
    creado_por = UsuarioSerializer(read_only=True)
    validado_por = UsuarioSerializer(read_only=True)
    asignado_a = UsuarioSerializer(read_only=True)
    validacion_guardia = ValidacionGuardiaSerializer(read_only=True)
    evidencias = EvidenciaFotograficaSerializer(many=True, read_only=True)
    materiales_utilizados = MaterialUtilizadoSerializer(many=True, read_only=True)
    sesiones_trabajo = SesionTrabajoSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'folio', 'titulo', 'descripcion', 'categoria', 'especialidad_requerida',
            'ubicacion', 'urgencia', 'estado', 'creado_por', 'validado_por', 'asignado_a',
            'afecta_clase', 'riesgo_electrico', 'riesgo_estructural', 'riesgo_accesibilidad',
            'created_at', 'updated_at', 'cerrado_at', 'validacion_guardia',
            'evidencias', 'materiales_utilizados', 'sesiones_trabajo'
        ]


class InasistenciaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.get_full_name')
    usuario_rol = serializers.ReadOnlyField(source='usuario.rol.nombre')

    class Meta:
        model = Inasistencia
        fields = [
            'id', 'usuario', 'usuario_nombre', 'usuario_rol',
            'motivo', 'fecha_desde', 'fecha_hasta', 'estado',
            'observacion_gestor', 'created_at'
        ]
