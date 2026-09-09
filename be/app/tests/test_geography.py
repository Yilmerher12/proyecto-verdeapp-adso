"""
Módulo: tests/test_geography.py
Descripción: Pruebas del router de geografía (localidades y conjuntos para formularios).
¿Para qué? Este router es público (sin login) porque lo usa el formulario de registro
           antes de que la persona tenga cuenta. Lo importante a probar es que solo
           muestre conjuntos ya verificados por un Administrador del Sistema — si un
           conjunto sin verificar apareciera aquí, cualquiera podría registrarse en un
           conjunto que todavía no es real.
"""

from fastapi.testclient import TestClient

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.localidad import Localidad


class TestLocalidades:
    def test_listar_localidades_no_requiere_login(self, client: TestClient, localidad_test):
        response = client.get("/api/v1/geography/localidades")
        assert response.status_code == 200
        nombres = [loc["nombre_localidad"] for loc in response.json()]
        assert "Usaquén" in nombres


class TestConjuntosTodos:
    def test_solo_muestra_conjuntos_verificados(
        self, client: TestClient, conjunto_verificado, conjunto_no_verificado
    ):
        response = client.get("/api/v1/geography/conjuntos/todos")
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado.nombre_conjunto in nombres
        assert conjunto_no_verificado.nombre_conjunto not in nombres

    def test_busqueda_filtra_por_nombre(
        self, client: TestClient, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        """conjunto_verificado = 'TORRES DE PRUEBA', conjunto_verificado_sin_admin = 'RESERVA DE PRUEBA'."""
        response = client.get("/api/v1/geography/conjuntos/todos", params={"search": "TORRES"})
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado.nombre_conjunto in nombres
        assert conjunto_verificado_sin_admin.nombre_conjunto not in nombres

    def test_limit_acota_resultados(
        self, client: TestClient, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        response = client.get("/api/v1/geography/conjuntos/todos", params={"limit": 1})
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_filtra_por_localidad_antes_de_buscar_por_nombre(
        self, client: TestClient, db, conjunto_verificado, localidad_test
    ):
        """conjunto_verificado vive en localidad_test (Usaquén). Se crea un
        segundo conjunto verificado en OTRA localidad para probar que el
        filtro de verdad distingue entre las dos, no solo que existe."""
        otra_localidad = Localidad(nombre_localidad="Chapinero")
        db.add(otra_localidad)
        db.commit()
        db.refresh(otra_localidad)

        conjunto_en_otra_localidad = ConjuntoResidencial(
            id_localidad=otra_localidad.id_localidad,
            nombre_conjunto="CONJUNTO EN CHAPINERO",
            nit="900000000-2",
            direccion="Calle 63 # 5-5",
            verificado=True,
        )
        db.add(conjunto_en_otra_localidad)
        db.commit()

        response = client.get(
            "/api/v1/geography/conjuntos/todos",
            params={"id_localidad": localidad_test.id_localidad},
        )
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado.nombre_conjunto in nombres
        assert conjunto_en_otra_localidad.nombre_conjunto not in nombres


class TestConjuntosPorLocalidad:
    def test_filtra_por_localidad_y_solo_verificados(
        self, client: TestClient, localidad_test, conjunto_verificado, conjunto_no_verificado
    ):
        response = client.get(f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}")
        assert response.status_code == 200
        ids = [c["id_conjunto_residencial"] for c in response.json()]
        assert str(conjunto_verificado.id_conjunto_residencial) in ids
        assert str(conjunto_no_verificado.id_conjunto_residencial) not in ids

    def test_localidad_sin_conjuntos_devuelve_lista_vacia(self, client: TestClient):
        response = client.get("/api/v1/geography/conjuntos/999999")
        assert response.status_code == 200
        assert response.json() == []

    def test_busqueda_filtra_por_nombre(
        self, client: TestClient, localidad_test, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        response = client.get(
            f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}", params={"search": "RESERVA"}
        )
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado_sin_admin.nombre_conjunto in nombres
        assert conjunto_verificado.nombre_conjunto not in nombres

    def test_limit_acota_resultados(
        self, client: TestClient, localidad_test, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        response = client.get(
            f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}", params={"limit": 1}
        )
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestConjuntosGlobal:
    def test_lista_global_solo_verificados(
        self, client: TestClient, conjunto_verificado, conjunto_no_verificado
    ):
        response = client.get("/api/v1/geography/conjuntos")
        assert response.status_code == 200
        ids = [c["id_conjunto_residencial"] for c in response.json()]
        assert str(conjunto_verificado.id_conjunto_residencial) in ids
        assert str(conjunto_no_verificado.id_conjunto_residencial) not in ids


class TestUnidades:
    def test_siempre_devuelve_lista_vacia(self, client: TestClient, conjunto_verificado):
        """Este endpoint es un placeholder: las unidades ahora se crean en el registro."""
        response = client.get(f"/api/v1/geography/unidades/{conjunto_verificado.id_conjunto_residencial}")
        assert response.status_code == 200
        assert response.json() == []
