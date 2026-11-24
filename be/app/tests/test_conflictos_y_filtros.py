"""
Módulo: tests/test_conflictos_y_filtros.py
Descripción: Pruebas de API que dependen de los datos guardados: el 409 al invitar
             Administradores de Conjunto y los filtros combinados de la bandeja de soporte.
¿Para qué? Semana 4 del bootcamp de testing (ángulo BD: duplicados, relaciones y filtros).
           Los casos simples (un conjunto ocupado, un solo filtro) ya tienen prueba en
           test_admin_conjunto.py y test_novedad_enviada.py; aquí van los bordes: mezclar un
           conjunto ocupado con uno libre, comprobar que un rechazo no deja datos a medias, y
           combinar filtros sin que uno anule al otro.
¿Impacto? Si el aviso de conflicto empieza a nombrar conjuntos que no chocan, si un 409
          deja una invitación guardada, o si un filtro de la bandeja se ignora al combinarlo
          con otro, una de estas pruebas falla.
"""
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto

INVITAR = "/api/v1/admin-conjunto/invitar"
NOVEDADES = "/api/v1/novedades-enviadas"
SOPORTE = f"{NOVEDADES}/soporte"
CORREO_INVITADO = "nuevo@verdeapp.com"


class TestConflictoAlInvitar:
    """RN-003: un conjunto, un solo administrador activo a la vez (issue #402)."""

    def test_el_409_nombra_solo_el_conjunto_ocupado_y_responde_json(
        self,
        client: TestClient,
        admin_sistema_auth_headers,
        admin_conjunto_test,
        conjunto_verificado,
        conjunto_verificado_sin_admin,
    ):
        # Arrange: "TORRES DE PRUEBA" ya tiene administrador activo; "RESERVA DE PRUEBA" está libre.
        ids = [
            str(conjunto_verificado.id_conjunto_residencial),
            str(conjunto_verificado_sin_admin.id_conjunto_residencial),
        ]

        # Act: invitar a una persona a los dos conjuntos a la vez.
        respuesta = client.post(
            INVITAR,
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": CORREO_INVITADO, "ids_conjuntos": ids},
        )

        # Assert: 409 en JSON, y el aviso nombra solo al conjunto que choca. Si nombrara también
        #         al libre, el Admin del Sistema creería que tiene que arreglar algo que no existe.
        assert respuesta.status_code == 409
        assert respuesta.headers["content-type"].startswith("application/json")
        detalle = respuesta.json()["detail"]
        assert isinstance(detalle, str)
        assert conjunto_verificado.nombre_conjunto in detalle
        assert conjunto_verificado_sin_admin.nombre_conjunto not in detalle

    def test_el_409_no_deja_ninguna_invitacion_guardada(
        self,
        client: TestClient,
        db: Session,
        admin_sistema_auth_headers,
        admin_conjunto_test,
        conjunto_verificado,
        conjunto_verificado_sin_admin,
    ):
        # Arrange: el mismo caso mixto (un conjunto ocupado y uno libre).
        ids = [
            str(conjunto_verificado.id_conjunto_residencial),
            str(conjunto_verificado_sin_admin.id_conjunto_residencial),
        ]

        # Act
        respuesta = client.post(
            INVITAR,
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": CORREO_INVITADO, "ids_conjuntos": ids},
        )

        # Assert: la petición se rechazó completa. No se guardó una invitación "parcial" solo
        #         para el conjunto libre, que luego fallaría al aceptarla (el problema del #402).
        assert respuesta.status_code == 409
        guardadas = db.query(InvitacionAdminConjunto).filter_by(correo_electronico=CORREO_INVITADO).count()
        assert guardadas == 0


class TestFiltrosCombinadosDelSoporte:
    """Issue #512: la bandeja "Soporte técnico" filtra por `estado` y por `prioridad`."""

    def _enviar(self, client: TestClient, headers, texto: str, motivo: str) -> str:
        """Envía una consulta y devuelve su id, leído del historial del propio autor."""
        assert client.post(NOVEDADES, headers=headers, json={"texto": texto, "motivo": motivo}).status_code == 201
        historial = client.get(f"{NOVEDADES}/mias", headers=headers).json()["items"]
        return next(fila["id"] for fila in historial if fila["texto"] == texto)

    def _resolver(self, client: TestClient, admin_headers, id_novedad: str) -> None:
        respuesta = client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_headers, json={"estado": "RESUELTA"})
        assert respuesta.status_code == 200

    def _textos(self, client: TestClient, admin_headers, **filtros) -> list[str]:
        respuesta = client.get(SOPORTE, headers=admin_headers, params=filtros)
        assert respuesta.status_code == 200
        return sorted(fila["texto"] for fila in respuesta.json()["items"])

    def test_estado_y_prioridad_juntos_devuelven_solo_lo_que_cumple_los_dos(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers
    ):
        # Arrange: tres consultas. El motivo "sugerencia" da prioridad BAJA y "login" da ALTA.
        baja_resuelta = self._enviar(client, auth_headers, "baja-resuelta", "sugerencia")
        self._enviar(client, auth_headers, "baja-pendiente", "sugerencia")
        alta_resuelta = self._enviar(client, auth_headers, "alta-resuelta", "login")
        self._resolver(client, admin_sistema_auth_headers, baja_resuelta)
        self._resolver(client, admin_sistema_auth_headers, alta_resuelta)

        # Act y Assert: cada filtro solo, y después los dos juntos.
        # Sin `estado`, la bandeja trae solo lo pendiente: la resuelta de prioridad BAJA no sale.
        assert self._textos(client, admin_sistema_auth_headers, prioridad="BAJA") == ["baja-pendiente"]
        # Con `estado=RESUELTA`, salen las dos resueltas sin importar su prioridad.
        assert self._textos(client, admin_sistema_auth_headers, estado="RESUELTA") == [
            "alta-resuelta",
            "baja-resuelta",
        ]
        # Los dos filtros juntos: solo la que es resuelta Y de prioridad BAJA.
        assert self._textos(client, admin_sistema_auth_headers, estado="RESUELTA", prioridad="BAJA") == [
            "baja-resuelta"
        ]

    def test_el_total_cuenta_todo_lo_filtrado_aunque_la_pagina_traiga_una_sola_fila(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers
    ):
        # Arrange: tres consultas de prioridad BAJA y una ALTA, todas pendientes.
        for numero in range(3):
            self._enviar(client, auth_headers, f"baja-{numero}", "sugerencia")
        self._enviar(client, auth_headers, "alta-0", "login")

        # Act: pedir las de prioridad BAJA de a una por página.
        primera = client.get(SOPORTE, headers=admin_sistema_auth_headers, params={"prioridad": "BAJA", "limit": 1})
        ultima = client.get(
            SOPORTE, headers=admin_sistema_auth_headers, params={"prioridad": "BAJA", "limit": 1, "offset": 2}
        )
        fuera = client.get(
            SOPORTE, headers=admin_sistema_auth_headers, params={"prioridad": "BAJA", "limit": 1, "offset": 3}
        )

        # Assert: `total` es lo que cumple el filtro (3), no lo que hay en la página (1) ni lo que
        #         hay en toda la bandeja (4). Pasado el final, la página sale vacía pero `total` no cambia.
        assert primera.status_code == 200
        assert len(primera.json()["items"]) == 1
        assert primera.json()["total"] == 3
        assert len(ultima.json()["items"]) == 1
        assert ultima.json()["total"] == 3
        assert fuera.json()["items"] == []
        assert fuera.json()["total"] == 3
