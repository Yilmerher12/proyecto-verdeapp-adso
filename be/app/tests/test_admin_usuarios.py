"""
Módulo: tests/test_admin_usuarios.py
Descripción: Pruebas del motivo de desactivación, del filtro por estado
             (habilitado) en los 3 listados del panel del Admin del Sistema,
             y del perfil de solo lectura de cualquier usuario.
¿Para qué? Complementan test_admin.py (que ya cubre el listado, la búsqueda,
           el orden y el activar/desactivar básico) sin mezclarse con él.
"""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.models.reciclador import Reciclador
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.rol import RolId


def _desactivar(client: TestClient, headers, correo: str, motivo=None):
    cuerpo: dict = {"habilitado": False}
    if motivo is not None:
        cuerpo["motivo"] = motivo
    return client.patch(f"/api/v1/admin/usuarios/{correo}/habilitado", headers=headers, json=cuerpo)


class TestMotivoDeDesactivacion:
    """¿Por qué? Antes solo se guardaba "habilitado = false": al mirar una
    cuenta desactivada no había forma de saber cuándo ni por qué."""

    def test_desactivar_con_motivo_guarda_motivo_y_fecha(
        self, client: TestClient, admin_sistema_auth_headers, test_user, db
    ):
        response = _desactivar(
            client, admin_sistema_auth_headers, test_user.correo_electronico, "Se mudó de conjunto"
        )
        assert response.status_code == 200
        assert response.json()["motivo_desactivacion"] == "Se mudó de conjunto"
        assert response.json()["fecha_desactivacion"] is not None

        db.refresh(test_user)
        assert test_user.motivo_desactivacion == "Se mudó de conjunto"
        assert test_user.fecha_desactivacion is not None

    def test_desactivar_sin_motivo_guarda_solo_la_fecha(
        self, client: TestClient, admin_sistema_auth_headers, test_user, db
    ):
        response = _desactivar(client, admin_sistema_auth_headers, test_user.correo_electronico)
        assert response.status_code == 200

        db.refresh(test_user)
        assert test_user.motivo_desactivacion is None
        assert test_user.fecha_desactivacion is not None

    def test_motivo_solo_con_espacios_se_guarda_como_sin_motivo(
        self, client: TestClient, admin_sistema_auth_headers, test_user, db
    ):
        response = _desactivar(client, admin_sistema_auth_headers, test_user.correo_electronico, "   ")
        assert response.status_code == 200

        db.refresh(test_user)
        assert test_user.motivo_desactivacion is None

    def test_motivo_de_mas_de_200_caracteres_devuelve_422(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        response = _desactivar(client, admin_sistema_auth_headers, test_user.correo_electronico, "a" * 201)
        assert response.status_code == 422

    def test_reactivar_borra_fecha_y_motivo(
        self, client: TestClient, admin_sistema_auth_headers, test_user, db
    ):
        _desactivar(client, admin_sistema_auth_headers, test_user.correo_electronico, "Cuenta duplicada")

        response = client.patch(
            f"/api/v1/admin/usuarios/{test_user.correo_electronico}/habilitado",
            headers=admin_sistema_auth_headers,
            json={"habilitado": True},
        )
        assert response.status_code == 200

        db.refresh(test_user)
        assert test_user.habilitado is True
        assert test_user.fecha_desactivacion is None
        assert test_user.motivo_desactivacion is None

    def test_el_motivo_se_ignora_al_reactivar(
        self, client: TestClient, admin_sistema_auth_headers, test_user, db
    ):
        response = client.patch(
            f"/api/v1/admin/usuarios/{test_user.correo_electronico}/habilitado",
            headers=admin_sistema_auth_headers,
            json={"habilitado": True, "motivo": "no debería guardarse"},
        )
        assert response.status_code == 200

        db.refresh(test_user)
        assert test_user.motivo_desactivacion is None


class TestFiltroHabilitado:
    """¿Por qué? El botón "Inactivos" del panel necesita que los 3 listados
    (vista SQL, procedimiento almacenado y administradores) filtren por
    estado, y que devuelvan la fecha y el motivo de la desactivación."""

    def test_vista_residentes_filtra_inactivos_y_devuelve_el_motivo(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        _desactivar(client, admin_sistema_auth_headers, test_user.correo_electronico, "Se mudó")

        inactivos = client.get(
            "/api/v1/admin/vista-residentes", headers=admin_sistema_auth_headers, params={"habilitado": False}
        ).json()["items"]
        fila = next(f for f in inactivos if f["Correo"] == test_user.correo_electronico)
        assert fila["Motivo_Desactivacion"] == "Se mudó"
        assert fila["Fecha_Desactivacion"] is not None

        activos = client.get(
            "/api/v1/admin/vista-residentes", headers=admin_sistema_auth_headers, params={"habilitado": True}
        ).json()["items"]
        assert test_user.correo_electronico not in [f["Correo"] for f in activos]

    def test_vista_residentes_sin_filtro_trae_activos_e_inactivos(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        _desactivar(client, admin_sistema_auth_headers, test_user.correo_electronico)
        todos = client.get("/api/v1/admin/vista-residentes", headers=admin_sistema_auth_headers).json()["items"]
        assert test_user.correo_electronico in [f["Correo"] for f in todos]

    def test_sp_recicladores_filtra_inactivos_y_devuelve_el_motivo(
        self, client: TestClient, admin_sistema_auth_headers, reciclador_test
    ):
        _desactivar(client, admin_sistema_auth_headers, reciclador_test.correo_electronico, "Sin actividad")

        inactivos = client.get(
            "/api/v1/admin/sp-recicladores", headers=admin_sistema_auth_headers, params={"habilitado": False}
        ).json()
        fila = next(f for f in inactivos["items"] if f["Correo"] == reciclador_test.correo_electronico)
        assert fila["Motivo_Desactivacion"] == "Sin actividad"
        assert inactivos["total"] >= 1

        activos = client.get(
            "/api/v1/admin/sp-recicladores", headers=admin_sistema_auth_headers, params={"habilitado": True}
        ).json()
        assert reciclador_test.correo_electronico not in [f["Correo"] for f in activos["items"]]

    def test_administradores_filtra_inactivos_y_devuelve_el_motivo(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test
    ):
        correo = admin_conjunto_test.usuario.correo_electronico
        _desactivar(client, admin_sistema_auth_headers, correo, "Contrato terminado")

        inactivos = client.get(
            "/api/v1/admin/administradores-conjunto",
            headers=admin_sistema_auth_headers,
            params={"habilitado": False},
        ).json()
        fila = next(f for f in inactivos["items"] if f["Correo"] == correo)
        assert fila["Motivo_Desactivacion"] == "Contrato terminado"

        activos = client.get(
            "/api/v1/admin/administradores-conjunto",
            headers=admin_sistema_auth_headers,
            params={"habilitado": True},
        ).json()
        assert correo not in [f["Correo"] for f in activos["items"]]


class TestPerfilUsuarioAdmin:
    """¿Por qué? El Admin del Sistema abre el perfil (solo lectura) de
    cualquier usuario desde su tabla, sin importar el rol."""

    def _url(self, correo: str) -> str:
        return f"/api/v1/admin/usuarios/{correo}"

    def test_sin_login_devuelve_401(self, client: TestClient, test_user):
        assert client.get(self._url(test_user.correo_electronico)).status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, test_user):
        response = client.get(self._url(test_user.correo_electronico), headers=auth_headers)
        assert response.status_code == 403

    def test_usuario_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get(self._url("nadie-existe@verdeapp.com"), headers=admin_sistema_auth_headers)
        assert response.status_code == 404

    def test_perfil_de_residente_trae_conjunto_torre_y_apto(
        self, client: TestClient, admin_sistema_auth_headers, test_user, conjunto_verificado
    ):
        response = client.get(self._url(test_user.correo_electronico), headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role_id"] == RolId.RESIDENTE
        assert data["nombre"] and data["apellidos"]
        assert data["detalle"]["conjunto"] == conjunto_verificado.nombre_conjunto
        assert data["detalle"]["torre"] and data["detalle"]["apto"]
        assert data["habilitado"] is True

    def test_perfil_de_reciclador_trae_asociacion_y_conjuntos_autorizados(
        self, client: TestClient, admin_sistema_auth_headers, reciclador_test, conjunto_verificado, db
    ):
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        db.add(
            RecicladorConjunto(
                id_reciclador=reciclador.id_reciclador,
                id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
            )
        )
        db.commit()

        response = client.get(self._url(reciclador_test.correo_electronico), headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role_id"] == RolId.RECICLADOR
        assert conjunto_verificado.nombre_conjunto in data["detalle"]["conjuntos"]
        assert "mostrar_contacto_directorio" in data["detalle"]

    def test_perfil_de_admin_de_conjunto_trae_sus_conjuntos(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        response = client.get(
            self._url(admin_conjunto_test.usuario.correo_electronico), headers=admin_sistema_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role_id"] == RolId.ADMIN_CONJUNTO
        assert conjunto_verificado.nombre_conjunto in data["detalle"]["conjuntos"]

    def test_perfil_del_admin_del_sistema_solo_trae_datos_de_cuenta(
        self, client: TestClient, admin_sistema_auth_headers, admin_sistema_test
    ):
        response = client.get(self._url(admin_sistema_test.correo_electronico), headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role_id"] == RolId.ADMIN_SISTEMA
        assert data["nombre"] is None
        assert data["detalle"] == {}

    def test_perfil_de_cuenta_desactivada_muestra_fecha_y_motivo(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        _desactivar(client, admin_sistema_auth_headers, test_user.correo_electronico, "Cuenta duplicada")
        data = client.get(self._url(test_user.correo_electronico), headers=admin_sistema_auth_headers).json()
        assert data["habilitado"] is False
        assert data["motivo_desactivacion"] == "Cuenta duplicada"
        assert data["fecha_desactivacion"] is not None

    def test_el_perfil_nunca_incluye_la_contrasena(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        data = client.get(self._url(test_user.correo_electronico), headers=admin_sistema_auth_headers).json()
        assert "password" not in data
        assert test_user.password not in str(data)

    def test_bloqueado_hasta_solo_aparece_si_el_bloqueo_sigue_vigente(
        self, client: TestClient, admin_sistema_auth_headers, test_user, db
    ):
        test_user.bloqueado_hasta = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.commit()
        vigente = client.get(self._url(test_user.correo_electronico), headers=admin_sistema_auth_headers).json()
        assert vigente["bloqueado_hasta"] is not None

        test_user.bloqueado_hasta = datetime.now(timezone.utc) - timedelta(minutes=10)
        db.commit()
        vencido = client.get(self._url(test_user.correo_electronico), headers=admin_sistema_auth_headers).json()
        assert vencido["bloqueado_hasta"] is None
