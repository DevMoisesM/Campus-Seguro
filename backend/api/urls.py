from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    health_check, CustomTokenObtainPairView, UserProfileView,
    UsuarioViewSet, RolViewSet, EspecialidadViewSet,
    SedeViewSet, EdificioViewSet, PisoViewSet, UbicacionViewSet,
    CategoriaTicketViewSet, MaterialViewSet, TicketViewSet, InasistenciaViewSet
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'especialidades', EspecialidadViewSet, basename='especialidad')
router.register(r'sedes', SedeViewSet, basename='sede')
router.register(r'edificios', EdificioViewSet, basename='edificio')
router.register(r'pisos', PisoViewSet, basename='piso')
router.register(r'ubicaciones', UbicacionViewSet, basename='ubicacion')
router.register(r'categorias-ticket', CategoriaTicketViewSet, basename='categoriaticket')
router.register(r'materiales', MaterialViewSet, basename='material')
router.register(r'inasistencias', InasistenciaViewSet, basename='inasistencia')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    # Health Check
    path('health/', health_check, name='health_check'),

    # Autenticación JWT y Perfil
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='user_profile'),

    # Endpoints Router REST
    path('', include(router.urls)),
]
