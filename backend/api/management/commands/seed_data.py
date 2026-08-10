from django.core.management.base import BaseCommand
from api.models import (
    Rol, EstadoCatalogo, Especialidad, TipoUbicacion, 
    CategoriaTicket, CategoriaMaterial, Sede, Edificio, Piso, Ubicacion
)

class Command(BaseCommand):
    help = 'Puebla la base de datos con datos semilla iniciales para Campus-Seguro (incluyendo Sedes, Edificios, Pisos y Salas)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando carga de datos semilla completos...'))

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
        self.stdout.write(self.style.SUCCESS('[OK] Catálogo de Estados cargado'))

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
        tipos_obj = {}
        for codigo, nombre in tipos_ub:
            tipo_obj, _ = TipoUbicacion.objects.get_or_create(codigo=codigo, defaults={'nombre_display': nombre})
            tipos_obj[codigo] = tipo_obj
        self.stdout.write(self.style.SUCCESS('[OK] Tipos de Ubicación cargados'))

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
        self.stdout.write(self.style.SUCCESS('[OK] Categorías de Tickets cargadas'))

        # 6. INFRAESTRUCTURA (Sedes, Edificios, Pisos, Salas)
        sedes_data = [
            {
                'nombre': 'Sede Antonio Varas',
                'direccion': 'Antonio Varas 666, Providencia, Santiago',
                'edificios': [
                    {
                        'nombre': 'Edificio A - Aulas Teoría',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Sala A-101 (Teoría)', 'aula'),
                                    ('Sala A-102 (Computación)', 'laboratorio'),
                                    ('Baño Varones Piso 1', 'bano'),
                                    ('Baño Damas Piso 1', 'bano')
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Sala A-201 (Cisco)', 'laboratorio'),
                                    ('Sala A-202 (Mac Lab)', 'laboratorio'),
                                    ('Pasillo Principal Nivel 2', 'pasillo')
                                ]
                            }
                        ]
                    },
                    {
                        'nombre': 'Edificio B - Laboratorios y Talleres',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Laboratorio Redes B-101', 'laboratorio'),
                                    ('Taller Mecánica B-102', 'laboratorio'),
                                    ('Oficina Coordinación B-103', 'oficina')
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                'nombre': 'Sede San Joaquín',
                'direccion': 'Vicuña Mackenna 4901, San Joaquín, Santiago',
                'edificios': [
                    {
                        'nombre': 'Edificio Central San Joaquín',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Auditorio Principal', 'aula'),
                                    ('Baño Accesible Central', 'bano'),
                                    ('Patio de Honor', 'exterior')
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                'nombre': 'Sede Viña del Mar',
                'direccion': 'Álvarez 2366, Viña del Mar',
                'edificios': [
                    {
                        'nombre': 'Edificio Mar',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Sala VM-101', 'aula'),
                                    ('Laboratorio Robótica VM-102', 'laboratorio')
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                'nombre': 'Sede San Andrés de Concepción',
                'direccion': 'Paicaví 3280, Concepción, Región del Biobío',
                'edificios': [
                    {
                        'nombre': 'Edificio A - Ingeniería y Tecnología',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Sala CC-101 (Teoría)', 'aula'),
                                    ('Laboratorio Redes & Telecomunicaciones CC-102', 'laboratorio'),
                                    ('Baño Varones Piso 1', 'bano'),
                                    ('Baño Damas Piso 1', 'bano')
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Sala CC-201 (Cisco)', 'laboratorio'),
                                    ('Oficina Coordinación Carrera', 'oficina')
                                ]
                            }
                        ]
                    },
                    {
                        'nombre': 'Edificio B - Administración y Salud',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Auditorio Sede Concepción', 'aula'),
                                    ('Baño Accesible Piso 1', 'bano')
                                ]
                            }
                        ]
                    }
                ]
            }
        ]

        for s_data in sedes_data:
            sede, _ = Sede.objects.get_or_create(
                nombre=s_data['nombre'],
                defaults={'direccion': s_data['direccion']}
            )
            for e_data in s_data['edificios']:
                edificio, _ = Edificio.objects.get_or_create(
                    sede=sede,
                    nombre=e_data['nombre']
                )
                for p_data in e_data['pisos']:
                    piso, _ = Piso.objects.get_or_create(
                        edificio=edificio,
                        numero=p_data['numero']
                    )
                    for sala_nombre, tipo_cod in p_data['salas']:
                        t_obj = tipos_obj.get(tipo_cod)
                        Ubicacion.objects.get_or_create(
                            piso=piso,
                            nombre=sala_nombre,
                            defaults={'tipo': t_obj}
                        )

        self.stdout.write(self.style.SUCCESS('[OK] Infraestructura completa cargada (Sedes, Edificios, Pisos y Ubicaciones)'))
        self.stdout.write(self.style.SUCCESS('[EXITO] Base de datos poblada completamente.'))
