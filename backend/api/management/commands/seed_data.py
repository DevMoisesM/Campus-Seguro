from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (
    Rol, EstadoCatalogo, Especialidad, TipoUbicacion, 
    CategoriaTicket, CategoriaMaterial, Material, MaterialUtilizado,
    Sede, Edificio, Piso, Ubicacion, Escuela, Carrera,
    Usuario, Ticket, ValidacionGuardia, SesionTrabajo, LogAuditoria
)

class Command(BaseCommand):
    help = 'Puebla la base de datos con datos completos y profesionales para el portafolio (Catálogos, Infraestructura, Usuarios y Tickets Demo)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando carga de datos semilla completos para Campus Seguro...'))

        # 1. ROLES
        roles = [
            ('Usuario Base', 'usuario'),
            ('Guardia de Seguridad', 'guardia'),
            ('Mantenedor', 'mantencion'),
            ('Gestor', 'gestor'),
        ]
        roles_obj = {}
        for nombre, codigo in roles:
            r_obj, _ = Rol.objects.get_or_create(codigo=codigo, defaults={'nombre': nombre})
            roles_obj[codigo] = r_obj
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
        estados_obj = {}
        for entidad, codigo, nombre, orden, color in estados:
            e_obj, _ = EstadoCatalogo.objects.get_or_create(
                entidad=entidad, codigo=codigo,
                defaults={'nombre_display': nombre, 'orden': orden, 'color_hex': color}
            )
            estados_obj[codigo] = e_obj
        self.stdout.write(self.style.SUCCESS('[OK] Catálogo de Estados cargado'))

        # 3. ESPECIALIDADES
        especialidades = [
            'Electricidad',
            'Gasfitería / Plomería',
            'Climatización',
            'Cerrajería / Estructura',
            'Pintura y Aseo',
            'Redes y Conectividad',
        ]
        esp_obj = {}
        for nombre in especialidades:
            e_item, _ = Especialidad.objects.get_or_create(nombre=nombre)
            esp_obj[nombre] = e_item
        self.stdout.write(self.style.SUCCESS('[OK] Especialidades cargadas'))

        # 4. ESCUELAS Y CARRERAS
        escuelas_carreras = [
            ('Escuela de Informática y Telecomunicaciones', 'inf', [
                'Ingeniería en Informática',
                'Analista Programador Computacional',
                'Ingeniería en Conectividad y Redes',
            ]),
            ('Escuela de Construcción e Ingeniería', 'con', [
                'Técnico en Electricidad y Automatización',
                'Técnico en Construcción',
                'Técnico en Climatización y Refrigeración',
            ]),
            ('Escuela de Administración y Negocios', 'adm', [
                'Ingeniería en Administración de Empresas',
                'Auditoría y Contabilidad',
            ]),
        ]
        carreras_obj = {}
        for esc_nombre, esc_cod, car_list in escuelas_carreras:
            esc_item, _ = Escuela.objects.get_or_create(codigo=esc_cod, defaults={'nombre': esc_nombre})
            for car_nombre in car_list:
                c_item, _ = Carrera.objects.get_or_create(nombre=car_nombre, defaults={'escuela': esc_item})
                carreras_obj[car_nombre] = c_item
        self.stdout.write(self.style.SUCCESS('[OK] Escuelas y Carreras cargadas'))

        # 5. TIPOS DE UBICACIÓN
        tipos_ub = [
            ('aula', 'Aula / Sala de Clases'),
            ('laboratorio', 'Laboratorio'),
            ('bano', 'Baño / Servicio Higiénico'),
            ('auditorio', 'Auditorio / Eventos'),
            ('oficina', 'Oficina Administrativa'),
            ('pasillo', 'Pasillo / Área Común'),
            ('exterior', 'Patio / Espacio Abierto'),
        ]
        tipos_obj = {}
        for codigo, nombre in tipos_ub:
            tipo_item, _ = TipoUbicacion.objects.get_or_create(codigo=codigo, defaults={'nombre_display': nombre})
            tipos_obj[codigo] = tipo_item
        self.stdout.write(self.style.SUCCESS('[OK] Tipos de Ubicación cargados'))

        # 6. CATEGORÍAS DE TICKET
        categorias = [
            ('electrica', 'Falla Eléctrica', 'Problemas con enchufes, luminarias, breakers o tableros'),
            ('sanitaria', 'Falla Sanitaria / Plomería', 'Fugas de agua, filtraciones, baños y desagües'),
            ('infraestructura', 'Falla de Infraestructura', 'Puertas, cerraduras, ventanas, muros y pisos'),
            ('climatizacion', 'Climatización', 'Equipos de aire acondicionado, calefacción y ventilación'),
            ('equipamiento', 'Equipamiento', 'Proyectores, telones, mobiliario y computadores'),
        ]
        cat_obj = {}
        for codigo, nombre, desc in categorias:
            c_item, _ = CategoriaTicket.objects.get_or_create(codigo=codigo, defaults={'nombre_display': nombre, 'descripcion': desc})
            cat_obj[codigo] = c_item
        self.stdout.write(self.style.SUCCESS('[OK] Categorías de Tickets cargadas'))

        # 7. CATÁLOGO MAESTRO DE MATERIALES DEL PAÑOL
        cat_electrica, _ = CategoriaMaterial.objects.get_or_create(codigo='electrica', defaults={'nombre_display': 'Eléctrico'})
        cat_sanitaria, _ = CategoriaMaterial.objects.get_or_create(codigo='sanitaria', defaults={'nombre_display': 'Gasfitería / Sanitaria'})
        cat_cerrajeria, _ = CategoriaMaterial.objects.get_or_create(codigo='cerrajeria', defaults={'nombre_display': 'Cerrajería / Estructura'})
        cat_pintura, _ = CategoriaMaterial.objects.get_or_create(codigo='pintura', defaults={'nombre_display': 'Pintura y Aseo'})

        materiales_catalogo = [
            ('Enchufe Hembra 16A Embutir', cat_electrica, 'unidades', 150),
            ('Interruptor Simple Blanco', cat_electrica, 'unidades', 120),
            ('Tubo LED 18W T8 120cm', cat_electrica, 'unidades', 200),
            ('Cable Cobre 2.5mm Eva Azul', cat_electrica, 'metros', 500),
            ('Breaker Termomagnético 16A', cat_electrica, 'unidades', 80),
            ('Portalámparas Plástico E27', cat_electrica, 'unidades', 100),

            ('Llave de Paso 1/2" Bronce', cat_sanitaria, 'unidades', 60),
            ('Sifón Flexible Lavamanos 1 1/2"', cat_sanitaria, 'unidades', 90),
            ('Flexible 1/2" x 1/2" 30cm Inox', cat_sanitaria, 'unidades', 150),
            ('Goma de Estanque WC Estándar', cat_sanitaria, 'unidades', 200),
            ('Válvula de Descarga Doble Pulsador', cat_sanitaria, 'unidades', 40),

            ('Cerradura Cilíndrica Pomo Acero', cat_cerrajeria, 'unidades', 50),
            ('Bisagra 3" x 3" Acero Inox', cat_cerrajeria, 'unidades', 120),
            ('Cerradura Embutir Cerrojo Cuadrado', cat_cerrajeria, 'unidades', 35),
            ('Picaporte Inox 4"', cat_cerrajeria, 'unidades', 80),

            ('Pintura Esmalte al Agua Blanco (Galón)', cat_pintura, 'galones', 30),
            ('Lija Madera/Metal N°120', cat_pintura, 'pliegos', 300),
            ('Silicona Neutra Transparente 300ml', cat_pintura, 'tubos', 100),
            ('Cinta Enmascarar Masking 24mm', cat_pintura, 'rollos', 150),
        ]
        mat_instances = {}
        for nombre, c_obj, unidad, stock in materiales_catalogo:
            m_item, _ = Material.objects.get_or_create(
                nombre=nombre,
                defaults={'categoria': c_obj, 'unidad_defecto': unidad, 'stock_disponible': stock}
            )
            mat_instances[nombre] = m_item
        self.stdout.write(self.style.SUCCESS('[OK] Catálogo Maestro de Materiales cargado'))

        # 8. INFRAESTRUCTURA COMPLETA (Sedes, Edificios, Múltiples Pisos y Salas)
        sedes_data = [
            {
                'nombre': 'Sede Antonio Varas (Campus Central)',
                'direccion': 'Antonio Varas 666, Providencia, Santiago',
                'edificios': [
                    {
                        'nombre': 'Edificio A - Torre de Ingeniería y Tecnología',
                        'pisos': [
                            {
                                'numero': -1,
                                'salas': [
                                    ('Pañol Central de Herramientas y Repuestos', 'panol'),
                                    ('Subestación Eléctrica y Tableros Generales', 'oficina'),
                                    ('Estacionamiento Subterráneo Nivel -1', 'exterior'),
                                ]
                            },
                            {
                                'numero': 1,
                                'salas': [
                                    ('Hall de Acceso Principal y Recepción', 'pasillo'),
                                    ('Sala A-101 (Teoría e Innovación)', 'aula'),
                                    ('Sala A-102 (Computación Básica)', 'laboratorio'),
                                    ('Baño Varones Piso 1', 'bano'),
                                    ('Baño Damas Piso 1', 'bano'),
                                    ('Baño Accesible Universal Piso 1', 'bano'),
                                    ('Casino y Cafetería Central', 'pasillo'),
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Laboratorio CC-201 (Redes & Cisco CCNA)', 'laboratorio'),
                                    ('Laboratorio CC-202 (Desarrollo Web & Cloud)', 'laboratorio'),
                                    ('Laboratorio CC-203 (Apple Mac Lab)', 'laboratorio'),
                                    ('Sala A-204 (Ciberseguridad y Servidores)', 'laboratorio'),
                                    ('Baño Varones Piso 2', 'bano'),
                                    ('Baño Damas Piso 2', 'bano'),
                                    ('Pasillo Principal Nivel 2', 'pasillo'),
                                ]
                            },
                            {
                                'numero': 3,
                                'salas': [
                                    ('Sala A-301 (Auditorio Multimedia)', 'auditorio'),
                                    ('Sala A-302 (Taller de Robótica e IoT)', 'laboratorio'),
                                    ('Sala A-303 (Proyectos Capstone)', 'aula'),
                                    ('Sala A-304 (Teoría Avanzada)', 'aula'),
                                    ('Baño Varones Piso 3', 'bano'),
                                    ('Baño Damas Piso 3', 'bano'),
                                    ('Zona de Estudio y Descanso Nivel 3', 'pasillo'),
                                ]
                            },
                            {
                                'numero': 4,
                                'salas': [
                                    ('Oficina Dirección de Escuela Informática', 'oficina'),
                                    ('Oficina Coordinación de Infraestructura & Seguridad', 'oficina'),
                                    ('Sala de Profesores y Docencia Nivel 4', 'oficina'),
                                    ('Sala de Reuniones Ejecutiva A-401', 'oficina'),
                                    ('Baño Mixto Piso 4', 'bano'),
                                ]
                            }
                        ]
                    },
                    {
                        'nombre': 'Edificio B - Administración, Diseño y Salud',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Auditorio Principal Antonio Varas (250 pers.)', 'auditorio'),
                                    ('Punto Limpio y Patio Central B', 'exterior'),
                                    ('Baño Varones Edificio B Piso 1', 'bano'),
                                    ('Baño Damas Edificio B Piso 1', 'bano'),
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Sala B-201 (Simulación Clínica y Enfermería)', 'laboratorio'),
                                    ('Sala B-202 (Diseño Gráfico y Modelado 3D)', 'laboratorio'),
                                    ('Sala B-203 (Administración y Negocios)', 'aula'),
                                    ('Baño Piso 2 Edificio B', 'bano'),
                                ]
                            },
                            {
                                'numero': 3,
                                'salas': [
                                    ('Biblioteca Central y Sala de Estudio Silencioso', 'aula'),
                                    ('Terraza y Patio de Descanso Nivel 3', 'exterior'),
                                    ('Sala B-301 (Taller de Construcción y Maquetas)', 'laboratorio'),
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                'nombre': 'Sede San Joaquín (Campus Sur)',
                'direccion': 'Vicuña Mackenna 4901, San Joaquín, Santiago',
                'edificios': [
                    {
                        'nombre': 'Edificio Central San Joaquín',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Auditorio San Joaquín', 'auditorio'),
                                    ('Patio de Honor y Áreas Verdes', 'exterior'),
                                    ('Baño Accesible Central', 'bano'),
                                    ('Sala SJ-101 (Teoría)', 'aula'),
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Laboratorio SJ-201 (Automatización Industrial)', 'laboratorio'),
                                    ('Laboratorio SJ-202 (Mecánica y Maquinaria)', 'laboratorio'),
                                    ('Sala SJ-203 (Informática Aplicada)', 'laboratorio'),
                                    ('Baños Generales Piso 2', 'bano'),
                                ]
                            },
                            {
                                'numero': 3,
                                'salas': [
                                    ('Centro de Innovación y Coworking Estudiantil', 'aula'),
                                    ('Oficinas de Asuntos Estudiantiles (DAE)', 'oficina'),
                                    ('Sala SJ-301 (Capacitación Docente)', 'aula'),
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                'nombre': 'Sede Viña del Mar (Campus Costa)',
                'direccion': 'Álvarez 2366, Viña del Mar, Región de Valparaíso',
                'edificios': [
                    {
                        'nombre': 'Edificio Mar',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Hall de Entrada y Atención a Alumnos', 'pasillo'),
                                    ('Sala VM-101 (Auditorio Costero)', 'auditorio'),
                                    ('Baño Universal Piso 1', 'bano'),
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Laboratorio Robótica Marina VM-201', 'laboratorio'),
                                    ('Sala VM-202 (Inteligencia Artificial)', 'laboratorio'),
                                    ('Sala VM-203 (Teoría y Gestión)', 'aula'),
                                ]
                            },
                            {
                                'numero': 3,
                                'salas': [
                                    ('Sala de Grados y Titulación VM-301', 'auditorio'),
                                    ('Laboratorio Conectividad Costera VM-302', 'laboratorio'),
                                    ('Terraza Panorámica Nivel 3', 'exterior'),
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                'nombre': 'Sede San Andrés de Concepción (Campus Biobío)',
                'direccion': 'Paicaví 3280, Concepción, Región del Biobío',
                'edificios': [
                    {
                        'nombre': 'Edificio A - Ingeniería, Tecnología y Minería',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Hall Central Concepción y Punto de Informaciones', 'pasillo'),
                                    ('Sala CC-101 (Teoría e Innovación)', 'aula'),
                                    ('Laboratorio Redes & Telecomunicaciones CC-102', 'laboratorio'),
                                    ('Baño Varones Piso 1 Concepción', 'bano'),
                                    ('Baño Damas Piso 1 Concepción', 'bano'),
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Laboratorio CC-201 (Cisco CCNA & Ciberseguridad Sur)', 'laboratorio'),
                                    ('Laboratorio CC-202 (Desarrollo de Software y Base de Datos)', 'laboratorio'),
                                    ('Oficina Coordinación Carrera Informática Concepción', 'oficina'),
                                    ('Baño Mixto Piso 2', 'bano'),
                                ]
                            },
                            {
                                'numero': 3,
                                'salas': [
                                    ('Sala CC-301 (Auditorio Tecnológico Sur)', 'auditorio'),
                                    ('Laboratorio Automatización y Robótica Minera CC-302', 'laboratorio'),
                                    ('Sala CC-303 (Proyectos y Emprendimiento)', 'aula'),
                                ]
                            },
                            {
                                'numero': 4,
                                'salas': [
                                    ('Sala de Profesores y Docencia Regional', 'oficina'),
                                    ('Oficina Dirección de Sede Concepción', 'oficina'),
                                    ('Sala de Reuniones Ejecutiva CC-401', 'oficina'),
                                ]
                            }
                        ]
                    },
                    {
                        'nombre': 'Edificio B - Administración, Salud y Construcción',
                        'pisos': [
                            {
                                'numero': 1,
                                'salas': [
                                    ('Gran Auditorio Sede Concepción (300 personas)', 'auditorio'),
                                    ('Casino y Cafetería Campus Concepción', 'pasillo'),
                                    ('Baño Accesible Universal Piso 1', 'bano'),
                                ]
                            },
                            {
                                'numero': 2,
                                'salas': [
                                    ('Laboratorio Simulación Clínica y Primeros Auxilios CC-B201', 'laboratorio'),
                                    ('Sala CC-B202 (Administración y Finanzas)', 'aula'),
                                    ('Baños Generales Piso 2', 'bano'),
                                ]
                            },
                            {
                                'numero': 3,
                                'salas': [
                                    ('Biblioteca Regional San Andrés y Sala de Estudio', 'aula'),
                                    ('Taller de Topografía y Maquetas de Construcción CC-B301', 'laboratorio'),
                                    ('Terraza y Patio de Descanso Nivel 3', 'exterior'),
                                ]
                            }
                        ]
                    }
                ]
            }
        ]

        ubicaciones_dict = {}
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
                        ub_obj, _ = Ubicacion.objects.get_or_create(
                            piso=piso,
                            nombre=sala_nombre,
                            defaults={'tipo': t_obj}
                        )
                        ubicaciones_dict[sala_nombre] = ub_obj

        self.stdout.write(self.style.SUCCESS('[OK] Infraestructura institucional cargada'))

        # 9. USUARIOS DE PRUEBA OFICIALES
        carrera_info = carreras_obj.get('Ingeniería en Informática')

        test_users_config = [
            ('gestor1', 'gestor@campus-seguro.cl', 'Gestor2026!', 'Martín', 'González', 'gestor', True, True, None, None),
            ('guardia1', 'guardia@campus-seguro.cl', 'Guardia2026!', 'Roberto', 'Pérez', 'guardia', False, False, None, None),
            ('mantencion1', 'mantencion1@campus-seguro.cl', 'Mantencion2026!', 'Pedro', 'Morales', 'mantencion', False, False, ['Electricidad', 'Climatización'], None),
            ('mantencion2', 'mantencion2@campus-seguro.cl', 'Mantencion2026!', 'Luis', 'Tapia', 'mantencion', False, False, ['Gasfitería / Plomería', 'Cerrajería / Estructura'], None),
            ('estudiante1', 'estudiante@campus-seguro.cl', 'Estudiante2026!', 'Ana', 'Silva', 'usuario', False, False, None, carrera_info),
        ]

        users_instances = {}
        for username, email, pwd, fname, lname, rol_code, is_staff, is_admin, esps, carrera in test_users_config:
            rol_item = roles_obj.get(rol_code)
            u_obj, created = Usuario.objects.get_or_create(
                username=username,
                defaults={
                    'correo_institucional': email,
                    'email': email,
                    'first_name': fname,
                    'last_name': lname,
                    'rol': rol_item,
                    'estado_cuenta': 'activa',
                    'is_staff': is_staff,
                    'is_superuser': is_admin,
                    'carrera': carrera,
                    'escuela': carrera.escuela if carrera else None
                }
            )
            u_obj.set_password(pwd)
            u_obj.save()

            if esps:
                u_obj.especialidades.set([esp_obj[e] for e in esps if e in esp_obj])

            users_instances[username] = u_obj

        self.stdout.write(self.style.SUCCESS('[OK] Usuarios de prueba oficiales configurados'))
        self.stdout.write(self.style.SUCCESS('[EXITO] Base de datos y catálogos inicializados al 100% (Listo para registrar incidentes reales).'))

