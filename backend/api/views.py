from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Endpoint de prueba de conexión entre Backend Django REST y Frontend Angular (pnpm).
    """
    return Response({
        'status': 'ok',
        'message': 'API de Campus-Seguro (Django REST Framework) conectada correctamente',
        'system': 'Campus-Seguro Backend (Python + Django 5)',
        'version': '1.0.0'
    })
