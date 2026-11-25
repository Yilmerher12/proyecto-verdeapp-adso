import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.comunicado import DestinatariosComunicado, TipoComunicado
from app.schemas.comunicado import CrearComunicadoRequest
from app.services.comunicado_service import crear_comunicado



class TestCrearComunicadoDobles:
    def test_should_raise_403_and_not_save_when_admin_does_not_manage_the_complex(self):
        # Arrange
        # db: stub (tiene una respuesta fija: None) y spy (se verifica qué le pidieron)
        db = MagicMock()
        db.execute.return_value.scalar_one_or_none.return_value = None
        # administrador: dummy (solo ocupa el parámetro, su valor no se usa)
        administrador = MagicMock()
        datos = CrearComunicadoRequest(
            id_conjunto_residencial=uuid.uuid4(),
            destinatarios=DestinatariosComunicado.AMBOS,
            tipo=TipoComunicado.INFORMATIVO,
            texto="Aviso de prueba",
        )

        # Act: se invoca la unidad y se guarda en `error` el HTTPException que lanza
        with pytest.raises(HTTPException) as error:
            crear_comunicado(db, administrador, datos)

        # Assert: estado (el error es 403) y comportamiento (db no recibió add ni commit)
        assert error.value.status_code == 403
        db.add.assert_not_called()
        db.commit.assert_not_called()

    def test_should_raise_400_and_not_save_when_convocatoria_has_no_event_date(self):
        # Arrange
        # db: spy (se verifica qué le pidieron); sin configurar, su respuesta por defecto sirve
        db = MagicMock()
        # administrador: dummy (solo ocupa el parámetro, su valor no se usa)
        administrador = MagicMock()
        datos = CrearComunicadoRequest(
            id_conjunto_residencial=uuid.uuid4(),
            destinatarios=DestinatariosComunicado.AMBOS,
            tipo=TipoComunicado.CONVOCATORIA,
            texto="Reunión de copropietarios",
        )

        # Act: se invoca la unidad y se guarda en `error` el HTTPException que lanza
        with pytest.raises(HTTPException) as error:
            crear_comunicado(db, administrador, datos)

        # Assert: estado (el error es 400) y comportamiento (db no recibió add ni commit)
        assert error.value.status_code == 400
        db.add.assert_not_called()
        db.commit.assert_not_called()

    def test_should_save_urgent_comunicado_with_48_hours_expiration_when_data_is_valid(self):
        # Arrange
        # db: stub (respuestas fijas) y spy (se verifica qué le pidieron)
        db = MagicMock()
        # Al guardar, la base real completa el id y la fecha de creación; aquí se simula
        db.add.side_effect = lambda comunicado: (
            setattr(comunicado, "id_comunicado", uuid.uuid4()),
            setattr(comunicado, "created_at", datetime.now(timezone.utc)),
        )
        db.get.return_value.nombre_conjunto = "Torres de Prueba"
        # administrador: dummy con id, para comprobar que queda en el comunicado guardado
        administrador = MagicMock()
        administrador.id_administrador = uuid.uuid4()
        datos = CrearComunicadoRequest(
            id_conjunto_residencial=uuid.uuid4(),
            destinatarios=DestinatariosComunicado.AMBOS,
            tipo=TipoComunicado.URGENTE,
            texto="Corte de agua urgente",
        )

        # Act: se invoca la unidad y se guarda lo que devuelve
        resultado = crear_comunicado(db, administrador, datos)

        # Assert: estado (lo devuelto y lo guardado) y comportamiento (commit una vez)
        guardado = db.add.call_args.args[0]
        esperado = datetime.now(timezone.utc) + timedelta(hours=48)
        assert resultado.texto == "Corte de agua urgente"
        assert guardado.id_administrador == administrador.id_administrador
        assert abs(guardado.fecha_expiracion - esperado) < timedelta(minutes=1)
        db.commit.assert_called_once()