from django.core.management.base import BaseCommand
from api.models import Rol, EstadoCatalogo, Especialidad, TipoUbicacion, CategoriaTicket, CategoriaMaterial

class Command(BaseCommand):
    help = 'Puebla la base de datos con datos semilla iniciales para Campus-Seguro'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando carga de datos semilla...'))

        # 1. ROLES
        roles = [
            ('Usuario Base', 'usuario'),
            ('Guardia de Seguridad', 'guardia'),
            ('Mantenedor', 'mantencion'),
            ('Gestor', 'gestor'),
        ]
        for nombre, codigo in roles:
            Rol.objects.get_or_create(codigo=codigo, defaults={'nombre': nombre})
        self.stdout.write(self.style.SUCCESS('[OK] Roles cargados'))

        # 2. ESTADOS
        estados = [
            ('ticket', 'creado', 'Creado', 1, '#64748b'),
            ('ticket', 'enviado', 'Enviado', 2, '#3b82f6'),
            ('ticket', 'validado', 'Validado por Guardia', 3, '#f59e0b'),
            ('ticket', 'en_mantencion', 'En Mantenimiento', 4, '#6366f1'),
            ('ticket', 'reparado', 'Reparado', 5, '#10b981'),
            ('ticket', 'cerrado', 'Cerrado', 6, '#059669'),
            ('ticket', 'pausado', 'Pausado', 7, '#d97706'),
            ('ticket', 'rechazado', 'Rechazado', 8, '#ef4444'),
        ]
        for entidad, codigo, nombre, orden, color in estados:
            EstadoCatalogo.objects.get_or_create(
                entidad=entidad, codigo=codigo,
                defaults={'nombre_display': nombre, 'orden': orden, 'color_hex': color}
            )
        self.stdout.write(self.style.SUCCESS('[OK] Catalogo de Estados cargado'))

        # 3. ESPECIALIDADES
        especialidades = [
            ('Electricidad SEC', 'Instalaciones eléctricas y tableros'),
            ('Cerrajero', 'Chapas, candados y accesos'),
            ('Gasfitería', 'Cañerías, sanitarios y llaves de agua'),
            ('Climatización / HVAC', 'Aire acondicionado y ventilación'),
            ('Pintura y Albañilería', 'Paredes, yeso y retoques estructurales'),
            ('Mobiliario', 'Sillas, mesas, proyectores y soportes'),
        ]
        for nombre, desc in especialidades:
            Especialidad.objects.get_or_create(nombre=nombre, defaults={'descripcion': desc})
        self.stdout.write(self.style.SUCCESS('[OK] Especialidades cargadas'))

        # 4. TIPOS DE UBICACIÓN
        tipos_ub = [
            ('aula', 'Aula / Sala de Clases'),
            ('laboratorio', 'Laboratorio Computacional / Técnico'),
            ('bano', 'Baño Damas / Varones / Accesible'),
            ('pasillo', 'Pasillo / Zonas Comunes'),
            ('oficina', 'Oficina Administrativa'),
            ('exterior', 'Patio / Exterior'),
        ]
        for codigo, nombre in tipos_ub:
            TipoUbicacion.objects.get_or_create(codigo=codigo, defaults={'nombre_display': nombre})
        self.stdout.write(self.style.SUCCESS('[OK] Tipos de Ubicacion cargados'))

        # 5. CATEGORÍAS DE TICKET
        categorias = [
            ('electrica', 'Falla Eléctrica', 'Problemas con enchufes, luces o tableros'),
            ('sanitaria', 'Falla Sanitaria / Plomería', 'Fugas de agua, baños obstruidos'),
            ('infraestructura', 'Falla de Infraestructura', 'Paredes, puertas, ventanas dañadas'),
            ('climatizacion', 'Climatización', 'Aire acondicionado o calefacción'),
            ('equipamiento', 'Equipamiento', 'Proyectores, pantallas, sillería'),
        ]
        for codigo, nombre, desc in categorias:
            CategoriaTicket.objects.get_or_create(codigo=codigo, defaults={'nombre_display': nombre, 'descripcion': desc})
        self.stdout.write(self.style.SUCCESS('[OK] Categorias de Tickets cargadas'))

        self.stdout.write(self.style.SUCCESS('[EXITO] Base de datos poblada exitosamente.'))
