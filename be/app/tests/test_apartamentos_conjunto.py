"""
Módulo: tests/test_apartamentos_conjunto.py
Descripción: Pruebas de "apartamentos registrados por conjunto": el Admin de
             Conjunto define cuántos apartamentos tiene su conjunto y el
             panel cuenta cuántos ya tienen residentes con cuenta activa.
"""
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario

URL = "/api/v1/conjunto-panel/mis-conjuntos"


def _agregar_residente(db: Session, id_unidad, correo: str, activo: bool = True) -> None:
    usuario = Usuario(correo_electronico=correo, id_rol=RolId.RESIDENTE, password="x", is_active=activo)
    db.add(usuario)
    db.flush()
    db.add(Residente(id_usuario=usuario.id_usuario, id_unidad=id_unidad, nombre="N", apellidos="A"))
    db.commit()


def _conjunto(client: TestClient, headers) -> dict:
    return client.get(URL, headers=headers).json()[0]


class TestConteo:
    def test_sin_residentes_todo_en_cero_y_sin_total(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        c = _conjunto(client, admin_conjunto_auth_headers)
        assert c["total_apartamentos"] is None
        assert c["apartamentos_registrados"] == 0
        assert c["residentes_registrados"] == 0

    def test_cuenta_apartamentos_no_cuentas(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado, test_user: Usuario
    ):
        # ¿Qué? test_user ya vive en TORRE 1 / 101. Un segundo residente en el MISMO apartamento no suma uno más.
        _agregar_residente(db, test_user.residente.id_unidad, "mismo.apto@example.com")
        c = _conjunto(client, admin_conjunto_auth_headers)
        assert c["apartamentos_registrados"] == 1
        assert c["residentes_registrados"] == 2

    def test_un_residente_en_otro_apartamento_suma(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado, test_user: Usuario
    ):
        otra = Unidad(id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial, torre="TORRE 2", apto="202")
        db.add(otra)
        db.flush()
        _agregar_residente(db, otra.id_unidad, "otro.apto@example.com")
        assert _conjunto(client, admin_conjunto_auth_headers)["apartamentos_registrados"] == 2

    def test_una_cuenta_inactiva_no_cuenta(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado, test_user: Usuario
    ):
        otra = Unidad(id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial, torre="TORRE 3", apto="303")
        db.add(otra)
        db.flush()
        _agregar_residente(db, otra.id_unidad, "inactivo@example.com", activo=False)
        c = _conjunto(client, admin_conjunto_auth_headers)
        assert c["apartamentos_registrados"] == 1
        assert c["residentes_registrados"] == 1


class TestEditarTotal:
    def _patch(self, client, headers, conjunto: ConjuntoResidencial, body: dict):
        return client.patch(f"{URL}/{conjunto.id_conjunto_residencial}", headers=headers, json=body)

    def test_define_la_cantidad_de_apartamentos(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        r = self._patch(client, admin_conjunto_auth_headers, conjunto_verificado, {"nit": None, "total_apartamentos": 120})
        assert r.status_code == 200
        assert _conjunto(client, admin_conjunto_auth_headers)["total_apartamentos"] == 120

    def test_editar_solo_el_nit_no_borra_la_cantidad(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        self._patch(client, admin_conjunto_auth_headers, conjunto_verificado, {"total_apartamentos": 80})
        self._patch(client, admin_conjunto_auth_headers, conjunto_verificado, {"nit": "900111222-1"})
        assert _conjunto(client, admin_conjunto_auth_headers)["total_apartamentos"] == 80

    def test_null_explicito_la_vuelve_a_dejar_sin_definir(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        self._patch(client, admin_conjunto_auth_headers, conjunto_verificado, {"total_apartamentos": 80})
        self._patch(client, admin_conjunto_auth_headers, conjunto_verificado, {"total_apartamentos": None})
        assert _conjunto(client, admin_conjunto_auth_headers)["total_apartamentos"] is None

    def test_rechaza_cero_negativos_y_exceso(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        for malo in (0, -5, 20001):
            r = self._patch(client, admin_conjunto_auth_headers, conjunto_verificado, {"total_apartamentos": malo})
            assert r.status_code == 422

    def test_conjunto_ajeno_devuelve_403(self, client: TestClient, admin_conjunto_auth_headers):
        r = client.patch(
            f"{URL}/00000000-0000-0000-0000-000000000000",
            headers=admin_conjunto_auth_headers,
            json={"total_apartamentos": 10},
        )
        assert r.status_code == 403
