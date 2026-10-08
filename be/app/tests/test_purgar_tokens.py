"""
Módulo: tests/test_purgar_tokens.py
Descripción: Pruebas del comando que borra los tokens vencidos
             (issue #403, CN-061).
"""
import uuid
from datetime import datetime, timedelta, timezone

from app import purgar_tokens
from app.models.email_verification_token import EmailVerificationToken
from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto
from app.models.invitacion_reciclador_conjunto import InvitacionRecicladorConjunto
from app.models.password_reset_token import PasswordResetToken
from app.models.token_revocado import TokenRevocado
from app.purgar_tokens import purgar


def _vence_en(**tiempo) -> datetime:
    return datetime.now(timezone.utc) + timedelta(**tiempo)


def _verificacion(test_user, expires_at: datetime, used: bool = False) -> EmailVerificationToken:
    return EmailVerificationToken(id_usuario=test_user.id_usuario, token=uuid.uuid4().hex, expires_at=expires_at, used=used)


def _recuperacion(test_user, expires_at: datetime, used: bool = False) -> PasswordResetToken:
    return PasswordResetToken(id_usuario=test_user.id_usuario, token=uuid.uuid4().hex, expires_at=expires_at, used=used)


def _invitacion(test_user, expires_at: datetime, used: bool = False) -> InvitacionAdminConjunto:
    return InvitacionAdminConjunto(
        correo_electronico="invitado@verdeapp.com",
        token=uuid.uuid4().hex,
        conjuntos_asignados="x",
        invitado_por_id=test_user.id_usuario,
        expires_at=expires_at,
        used=used,
    )


class TestTokensRevocados:
    def test_borra_el_vencido_y_conserva_el_vigente(self, db):
        db.add_all([TokenRevocado(jti=uuid.uuid4(), expira_en=_vence_en(minutes=-1)), TokenRevocado(jti=uuid.uuid4(), expira_en=_vence_en(minutes=10))])
        db.commit()

        assert purgar(db)["tokens_revocados"] == 1
        assert db.query(TokenRevocado).count() == 1

    def test_el_vencido_se_borra_sin_dias_de_gracia(self, db):
        """Un token vencido ya se rechaza por vencido: no hace falta conservarlo en la lista negra."""
        db.add(TokenRevocado(jti=uuid.uuid4(), expira_en=_vence_en(seconds=-5)))
        db.commit()
        purgar(db)
        assert db.query(TokenRevocado).count() == 0


class TestEnlaces:
    """Verificación de correo, recuperación de contraseña e invitación de Admin de Conjunto."""

    def test_borra_solo_lo_vencido_hace_mas_de_7_dias(self, db, test_user):
        for fabrica, modelo in [(_verificacion, EmailVerificationToken), (_recuperacion, PasswordResetToken), (_invitacion, InvitacionAdminConjunto)]:
            db.add_all([
                fabrica(test_user, _vence_en(days=-8)),   # vencido hace 8 días → se borra
                fabrica(test_user, _vence_en(days=-2)),   # vencido hace 2 días → se conserva (aún dice "ha expirado")
                fabrica(test_user, _vence_en(hours=1)),   # vigente → se conserva
            ])
            db.commit()

            borradas = purgar(db)

            assert borradas[modelo.__tablename__] == 1
            assert db.query(modelo).count() == 2

    def test_un_enlace_ya_usado_tambien_se_borra_al_pasar_la_gracia(self, db, test_user):
        db.add_all([_verificacion(test_user, _vence_en(days=-8), used=True), _recuperacion(test_user, _vence_en(days=-8), used=True)])
        db.commit()
        purgar(db)
        assert db.query(EmailVerificationToken).count() == 0
        assert db.query(PasswordResetToken).count() == 0

    def test_la_hora_se_puede_fijar_para_probar(self, db, test_user):
        db.add(_verificacion(test_user, _vence_en(days=-2)))
        db.commit()
        assert purgar(db)["email_verification_tokens"] == 0
        assert purgar(db, ahora=_vence_en(days=6))["email_verification_tokens"] == 1


def test_no_toca_las_invitaciones_de_reciclador(db, test_user, reciclador_test, conjunto_verificado):
    """No tienen token y su estado (aceptada/rechazada) es historial que ve el Admin de Conjunto."""
    db.add(
        InvitacionRecicladorConjunto(
            id_reciclador=reciclador_test.reciclador.id_reciclador,
            id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
            invitado_por_id=test_user.id_usuario,
            estado="RECHAZADA",
            expires_at=_vence_en(days=-60),
        )
    )
    db.commit()
    assert "invitaciones_reciclador_conjunto" not in purgar(db)
    assert db.query(InvitacionRecicladorConjunto).count() == 1


def test_main_imprime_cuantas_filas_borro(db, monkeypatch, capsys):
    db.add(TokenRevocado(jti=uuid.uuid4(), expira_en=_vence_en(minutes=-1)))
    db.commit()
    monkeypatch.setattr(purgar_tokens, "SessionLocal", lambda: db)
    purgar_tokens.main()
    assert "tokens_revocados: 1 fila(s) borrada(s)" in capsys.readouterr().out
