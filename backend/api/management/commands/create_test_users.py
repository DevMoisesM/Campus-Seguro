from django.core.management.base import BaseCommand
from api.models import Usuario, Rol

class Command(BaseCommand):
    help = 'Crea usuarios de prueba para cada uno de los 4 roles'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Creando usuarios de prueba...'))

        rol_gestor = Rol.objects.filter(codigo='gestor').first()
        rol_guardia = Rol.objects.filter(codigo='guardia').first()
        rol_mantencion = Rol.objects.filter(codigo='mantencion').first()
        rol_usuario = Rol.objects.filter(codigo='usuario').first()

        users_data = [
            ('gestor1', 'gestor@duoc.cl', 'Gestor2026!', 'Carlos', 'Gestor', rol_gestor, True),
            ('guardia1', 'guardia@duoc.cl', 'Guardia2026!', 'Roberto', 'Guardia', rol_guardia, False),
            ('mantencion1', 'mantencion@duoc.cl', 'Mantencion2026!', 'Mario', 'Mantenedor', rol_mantencion, False),
            ('estudiante1', 'estudiante@alumnos.duoc.cl', 'Estudiante2026!', 'Juan', 'Perez', rol_usuario, False),
        ]

        for username, email, pwd, fname, lname, rol, is_admin in users_data:
            user, created = Usuario.objects.get_or_create(
                username=username,
                defaults={
                    'correo_institucional': email,
                    'email': email,
                    'first_name': fname,
                    'last_name': lname,
                    'rol': rol,
                    'estado_cuenta': 'activa',
                    'is_staff': is_admin,
                    'is_superuser': is_admin
                }
            )
            user.set_password(pwd)
            user.save()
            msg = f"[OK] Usuario {username} ({rol.nombre if rol else 'Sin Rol'}) {'creado' if created else 'actualizado'}"
            self.stdout.write(self.style.SUCCESS(msg))

        self.stdout.write(self.style.SUCCESS('[EXITO] Usuarios de prueba creados correctamente.'))
