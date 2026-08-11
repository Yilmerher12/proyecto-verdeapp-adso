# Historias de Usuario — VerdeApp

<!--
  ¿Qué? Índice de navegación de todas las Historias de Usuario del proyecto.
  ¿Para qué? Cada HU vive en su propio archivo (formato Identificación + Historia +
            Criterios de aceptación Given/When/Then), siguiendo la misma estructura
            que usa el repositorio de referencia del profesor. Esta tabla es solo
            un mapa para encontrarlas rápido — el contenido real está en cada archivo.
  ¿Impacto? Antes había una sola tabla gigante con criterios resumidos en una línea;
            ahora cada HU tiene su propio detalle completo y trazable a su RF.
-->

| HU     | Título                                                             | RF asociado                                                        |
| ------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| HU-001 | [Inicio de sesión](HU-001_inicio_de_sesion.md)                       | [RQF-001](../RFs/RF-001_validar_usuario.md)                          |
| HU-002 | [Registro de cuenta](HU-002_registro_de_cuenta.md)                    | [RQF-002](../RFs/RF-002_registro_de_usuarios.md)                     |
| HU-003 | [Residente reporta SHUT lleno](HU-003_residente_reporta_shut_lleno.md) | [RQF-003](../RFs/RQF-003_alerta_shut_bidireccional.md)               |
| HU-004 | [Reciclador reporta SHUT vaciado](HU-004_reciclador_reporta_shut_vaciado.md) | [RQF-003](../RFs/RQF-003_alerta_shut_bidireccional.md)         |
| HU-005 | [Residente consulta el catálogo educativo](HU-005_consultar_catalogo_educativo.md) | [RQF-004](../RFs/RQF-004_catalogo_educativo.md)          |
| HU-006 | [Residente consulta el directorio](HU-006_consultar_directorio.md)    | [RQF-005](../RFs/RQF-005_directorio_integral.md)                     |
| HU-007 | [Reciclador notifica su llegada](HU-007_reciclador_notifica_llegada.md) | [RQF-006](../RFs/RQF-006_notificacion_llegada_reciclador.md)       |
| HU-008 | [Cerrar sesión](HU-008_cerrar_sesion.md)                              | [RQF-007](../RFs/RQF-007_cerrar_sesion.md)                           |
| HU-009 | [Actualizar datos del perfil](HU-009_actualizar_perfil.md)           | [RQF-008](../RFs/RQF-008_actualizar_perfil.md)                       |
| HU-010 | [Reciclador califica la gestión (semáforo)](HU-010_reciclador_califica_semaforo.md) | [RQF-009](<../RFs/RQF-009 — Semáforo de Gestión de Residuos.md>) |
| HU-011 | [Residente consulta el historial del semáforo](HU-011_residente_ve_historial_semaforo.md) | [RQF-009](<../RFs/RQF-009 — Semáforo de Gestión de Residuos.md>) |
| HU-012 | [Admin Sistema crea contenido educativo](HU-012_admin_crea_contenido_educativo.md) | [RQF-010](<../RFs/RQF-010 — Gestionar Contenido Educativo.md>) |
| HU-013 | [Admin Sistema edita contenido educativo](HU-013_admin_edita_contenido_educativo.md) | [RQF-010](<../RFs/RQF-010 — Gestionar Contenido Educativo.md>) |
| HU-014 | [Admin Sistema elimina contenido educativo](HU-014_admin_elimina_contenido_educativo.md) | [RQF-010](<../RFs/RQF-010 — Gestionar Contenido Educativo.md>) |
| HU-015 | [Admin Sistema registra un punto de acopio](HU-015_admin_registra_punto_acopio.md) | [RQF-011](<../RFs/RQF-011 — Gestionar Directorio de Acopio.md>) |
| HU-016 | [Admin Sistema actualiza un punto de acopio](HU-016_admin_actualiza_punto_acopio.md) | [RQF-011](<../RFs/RQF-011 — Gestionar Directorio de Acopio.md>) |
| HU-017 | [Admin Sistema da de baja un punto de acopio](HU-017_admin_da_de_baja_punto_acopio.md) | [RQF-011](<../RFs/RQF-011 — Gestionar Directorio de Acopio.md>) |
| HU-018 | [Admin Sistema invita a un nuevo Admin de Conjunto](HU-018_admin_sistema_invita_admin_conjunto.md) | [RQF-012](../RFs/RQF-012_gestion_vinculacion_conjuntos.md) |
| HU-019 | [Persona invitada acepta y crea su cuenta de Admin de Conjunto](HU-019_persona_acepta_invitacion_admin_conjunto.md) | [RQF-012](../RFs/RQF-012_gestion_vinculacion_conjuntos.md) |
| HU-020 | [Admin de Conjunto invita a un reciclador](HU-020_admin_conjunto_invita_reciclador.md) | [RQF-012](../RFs/RQF-012_gestion_vinculacion_conjuntos.md) |
| HU-021 | [Reciclador acepta o rechaza la invitación](HU-021_reciclador_responde_invitacion.md) | [RQF-012](../RFs/RQF-012_gestion_vinculacion_conjuntos.md) |
| HU-022 | [Admin Conjunto solicita desvinculación](HU-022_admin_conjunto_solicita_desvinculacion.md) | [RQF-016](../RFs/RQF-016_desvinculacion_reasignacion_conjuntos.md) |
| HU-023 | [Admin Sistema gestiona solicitudes de desvinculación](HU-023_admin_sistema_gestiona_solicitudes_desvinculacion.md) | [RQF-016](../RFs/RQF-016_desvinculacion_reasignacion_conjuntos.md) |
| HU-024 | [Admin Sistema asigna un conjunto adicional](HU-024_admin_sistema_asigna_conjunto_adicional.md) | [RQF-016](../RFs/RQF-016_desvinculacion_reasignacion_conjuntos.md) |
| HU-025 | [Sistema recomienda contenido según la auditoría](HU-025_sistema_recomienda_contenido_por_auditoria.md) | [RQF-013](../RFs/RQF-013_recomendacion_contenido_educativo.md) |
| HU-026 | [Residente ve el contenido recomendado](HU-026_residente_ve_contenido_recomendado.md) | [RQF-013](../RFs/RQF-013_recomendacion_contenido_educativo.md) |
| HU-027 | [Admin Conjunto crea un comunicado](HU-027_admin_conjunto_crea_comunicado.md) | [RQF-014](../RFs/RQF-014_gestionar_comunicados_conjunto.md)     |
| HU-028 | [Residente/Reciclador ve el feed de comunicados](HU-028_ver_feed_comunicados.md) | [RQF-014](../RFs/RQF-014_gestionar_comunicados_conjunto.md)   |
| HU-029 | [Admin Conjunto edita un comunicado](HU-029_admin_conjunto_edita_comunicado.md) | [RQF-014](../RFs/RQF-014_gestionar_comunicados_conjunto.md)    |
| HU-030 | [Admin Conjunto elimina un comunicado](HU-030_admin_conjunto_elimina_comunicado.md) | [RQF-014](../RFs/RQF-014_gestionar_comunicados_conjunto.md) |
| HU-031 | [Notificación de comunicado nuevo](HU-031_notificacion_comunicado_nuevo.md) | [RQF-014](../RFs/RQF-014_gestionar_comunicados_conjunto.md)    |
| HU-032 | [Admin Sistema publica una novedad general](HU-032_admin_sistema_publica_novedad.md) | [RQF-015](../RFs/RQF-015_publicar_novedades_generales.md)   |
| HU-033 | [Usuario ve las novedades según su rol](HU-033_usuario_ve_novedades.md) | [RQF-015](../RFs/RQF-015_publicar_novedades_generales.md)      |
| HU-034 | [Admin Sistema edita una novedad general](HU-034_admin_sistema_edita_novedad.md) | [RQF-015](../RFs/RQF-015_publicar_novedades_generales.md)  |
| HU-035 | [Admin Sistema archiva una novedad](HU-035_admin_sistema_archiva_novedad.md) | [RQF-015](../RFs/RQF-015_publicar_novedades_generales.md)     |
