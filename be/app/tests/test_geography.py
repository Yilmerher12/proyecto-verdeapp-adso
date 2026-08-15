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


class TestConjuntosPorLocalidad:
    def test_filtra_por_localidad_y_solo_verificados(
        self, client: TestClient, localidad_test, conjunto_verificado, conjunto_no_verificado
    ):
        response = client.get(f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}")
        assert response.status_code == 200
        ids = [c["id_conjunto_residencial"] for c in response.json()]
        assert conjunto_verificado.id_conjunto_residencial in ids
        assert conjunto_no_verificado.id_conjunto_residencial not in ids

    def test_localidad_sin_conjuntos_devuelve_lista_vacia(self, client: TestClient):
        response = client.get("/api/v1/geography/conjuntos/999999")
        assert response.status_code == 200
        assert response.json() == []


class TestConjuntosGlobal:
    def test_lista_global_solo_verificados(
        self, client: TestClient, conjunto_verificado, conjunto_no_verificado
    ):
        response = client.get("/api/v1/geography/conjuntos")
        assert response.status_code == 200
        ids = [c["id_conjunto_residencial"] for c in response.json()]
        assert conjunto_verificado.id_conjunto_residencial in ids
        assert conjunto_no_verificado.id_conjunto_residencial not in ids


class TestUnidades:
    def test_siempre_devuelve_lista_vacia(self, client: TestClient, conjunto_verificado):
        """Este endpoint es un placeholder: las unidades ahora se crean en el registro."""
        response = client.get(f"/api/v1/geography/unidades/{conjunto_verificado.id_conjunto_residencial}")
        assert response.status_code == 200
        assert response.json() == []
