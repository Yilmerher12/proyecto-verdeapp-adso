"""
Módulo: utils/codigo_acceso.py
Descripción: Generador del código de acceso por conjunto residencial
             (issue #168) — lo que el Admin de Conjunto reparte fuera de la
             app (cartelera, grupo del conjunto) para que un Residente
             pueda demostrar que de verdad vive ahí al registrarse.
"""
import secrets

# ¿Qué? 31 símbolos — mayúsculas y dígitos, SIN los que se confunden al
#       leerlos o transcribirlos a mano: "0"/"O", "1"/"I"/"L".
# ¿Para qué? Este código lo lee alguien desde una cartelera o un grupo de
#           chat y lo escribe a mano en el formulario de registro — un
#           carácter ambiguo aquí es un motivo real de que el registro
#           falle sin que la persona entienda por qué.
ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
LONGITUD = 6


def generar_codigo_acceso() -> str:
    """
    ¿Qué? Genera un código de 6 caracteres, cada uno elegido de forma
          independiente con el módulo `secrets` (no `random`).
    ¿Para qué? `random` usa un generador determinístico (Mersenne
              Twister) — visto suficientes valores, su estado interno se
              puede reconstruir y predecir los siguientes. `secrets` saca
              la aleatoriedad de la fuente criptográfica del sistema
              operativo, la misma clase de fuente que se usa para
              contraseñas o tokens: no hay secuencia ni patrón que
              alguien pueda deducir mirando códigos ya generados.
    ¿Impacto? 31^6 ≈ 887 millones de combinaciones — con los ~14,515
             conjuntos reales del proyecto, la probabilidad de que dos
             conjuntos distintos reciban el mismo código por azar es de
             apenas ~0.01%. Aun así, quien llama a esta función debe
             tratar el resultado como "probablemente único, no
             garantizado" y reintentar si choca contra la restricción
             UNIQUE de la base de datos (ver migración y seed.py).
    """
    return "".join(secrets.choice(ALFABETO) for _ in range(LONGITUD))
