import base64
import re
from rest_framework.exceptions import ValidationError

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def validate_evidence_image(image_str: str) -> str:
    """
    Valida y sanitiza una imagen de evidencia fotográfica (Base64 Data URL o URL estática/remota).
    - Bloquea inyecciones de código malicioso (<script>, javascript:, etc.).
    - Comprueba el límite de tamaño máximo (10 MB).
    - Valida formato MIME permitido (JPEG, PNG, WEBP).
    - Verifica Magic Bytes (firmas binarias reales de archivo) para prevenir archivos ejecutables camuflados.
    """
    if not image_str or not isinstance(image_str, str):
        return ""

    image_str = image_str.strip()
    if not image_str:
        return ""

    # 1. Detección de patrones maliciosos / XSS / inyecciones de scripts
    lowered = image_str.lower()
    dangerous_patterns = [
        '<script', 'javascript:', 'data:text/html', 'data:application/',
        '<?php', '<%', 'eval(', 'document.cookie', 'onload=', 'onerror='
    ]
    if any(pattern in lowered for pattern in dangerous_patterns):
        raise ValidationError("El archivo o enlace adjunto contiene contenido no permitido o potencialmente peligroso.")

    # 2. Si es una URL HTTP(S) estándar o ruta estática de servidor
    if image_str.startswith(('http://', 'https://', '/static/', '/media/', 'assets/')):
        valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')
        url_without_params = image_str.split('?')[0].lower()
        if not any(url_without_params.endswith(ext) for ext in valid_extensions) and not image_str.startswith(('http://', 'https://')):
            raise ValidationError("La URL de la evidencia debe apuntar a una extensión de imagen permitida (.jpg, .jpeg, .png, .webp).")
        return image_str

    # 3. Si es un Data URL Base64
    if image_str.startswith('data:'):
        match = re.match(r'^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$', image_str, re.DOTALL)
        if not match:
            raise ValidationError("Formato de imagen no soportado. Formatos válidos permitidos: JPEG, PNG, WEBP.")

        mime_type = match.group(1).lower()
        base64_data = match.group(2).strip()

        # Validar tamaño máximo (longitud Base64 * 3/4 es aprox. el tamaño en bytes)
        if len(base64_data) * 0.75 > MAX_IMAGE_SIZE_BYTES:
            raise ValidationError("La imagen supera el tamaño máximo permitido de 10 MB.")

        try:
            # Decodificar los primeros 64 bytes para inspeccionar Magic Bytes reales
            sample_bytes = base64.b64decode(base64_data[:80])
        except Exception:
            raise ValidationError("La codificación de la imagen en Base64 es inválida o está corrupta.")

        # 4. Verificación de Magic Bytes
        if mime_type in ('image/jpeg', 'image/jpg'):
            if not sample_bytes.startswith(b'\xff\xd8\xff'):
                raise ValidationError("El archivo declarado como JPEG no corresponde a una estructura de imagen válida.")
        elif mime_type == 'image/png':
            if not sample_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
                raise ValidationError("El archivo declarado como PNG no corresponde a una estructura de imagen válida.")
        elif mime_type == 'image/webp':
            if not (sample_bytes.startswith(b'RIFF') and b'WEBP' in sample_bytes[:16]):
                raise ValidationError("El archivo declarado como WEBP no corresponde a una estructura de imagen válida.")

        return image_str

    raise ValidationError("Formato de evidencia inválido. Debe ser un enlace válido o una imagen en formato Data URL Base64.")
