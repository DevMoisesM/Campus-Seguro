from django.core.management.base import BaseCommand
from api.models import Usuario, Rol, Especialidad, Carrera

class Command(BaseCommand):
    help = 'Crea o actualiza usuarios de prueba oficiales con roles y credenciales para cada perfil'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Creando/actualizando usuarios de prueba oficiales...'))

        rol_gestor = Rol.objects.filter(codigo='gestor').first()
        rol_guardia = Rol.objects.filter(codigo='guardia').first()
        rol_mantencion = Rol.objects.filter(codigo='mantencion').first()
        rol_usuario = Rol.objects.filter(codigo='usuario').first()

        carrera_info = Carrera.objects.filter(nombre='Ingeniería en Informática').first()

        users_data = [
            ('gestor1', 'gestor@campus-seguro.cl', 'Gestor2026!', 'Martín', 'González', rol_gestor, True, True, [], None),
            ('guardia1', 'guardia@campus-seguro.cl', 'Guardia2026!', 'Roberto', 'Pérez', rol_guardia, False, False, [], None),
            ('mantencion1', 'mantencion1@campus-seguro.cl', 'Mantencion2026!', 'Pedro', 'Morales', rol_mantencion, False, False, ['Electricidad', 'Climatización'], None),
            ('mantencion2', 'mantencion2@campus-seguro.cl', 'Mantencion2026!', 'Luis', 'Tapia', rol_mantencion, False, False, ['Gasfitería / Plomería', 'Cerrajería / Estructura'], None),
            ('estudiante1', 'estudiante@campus-seguro.cl', 'Estudiante2026!', 'Ana', 'Silva', rol_usuario, False, False, [], carrera_info),
        ]

        for username, email, pwd, fname, lname, rol, is_staff, is_admin, esps, carrera in users_data:
            user, created = Usuario.objects.get_or_create(
                username=username,
                defaults={
                    'correo_institucional': email,
                    'email': email,
                    'first_name': fname,
                    'last_name': lname,
                    'rol': rol,
                    'estado_cuenta': 'activa',
                    'is_staff': is_staff,
                    'is_superuser': is_admin,
                    'carrera': carrera,
                    'escuela': carrera.escuela if carrera else None
                }
            )
            user.first_name = fname
            user.last_name = lname
            user.rol = rol
            user.estado_cuenta = 'activa'
            user.is_staff = is_staff
            user.is_superuser = is_admin
            if carrera:
                user.carrera = carrera
                user.escuela = carrera.escuela
            user.set_password(pwd)
            user.save()

            if esps:
                esp_objs = Especialidad.objects.filter(nombre__in=esps)
                user.especialidades.set(esp_objs)

            msg = f"[OK] Usuario {username} ({rol.nombre if rol else 'Sin Rol'}) {'creado' if created else 'actualizado'}"
            self.stdout.write(self.style.SUCCESS(msg))

        self.stdout.write(self.style.SUCCESS('[EXITO] Usuarios de prueba configurados correctamente.'))

