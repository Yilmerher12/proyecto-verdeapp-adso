# Lista de verificación: estándar de texto, íconos y botones

<!--
  ¿Qué? Lista de TODAS las pantallas, ventanas y componentes del frontend, para marcar cuáles ya cumplen el estándar de texto,
        íconos y botones (issue #640).
  ¿Para qué? Que no se olvide ninguna: las páginas que más se olvidan (recuperar contraseña, invitación, ventanas de formulario)
             están en la lista igual que el resto. Se genera a partir de los archivos reales de `fe/src/` (excluye las pruebas).
  ¿Impacto? Es solo documentación. La que cuida de verdad que nada se aparte del estándar es la prueba
            `fe/src/__tests__/lib/estandaresVisuales.test.ts`; esta lista sirve para ver el avance por zonas.
-->

**Issue:** #640
**Fecha de la lista:** 2026-11-11
**Cómo se usa:** al terminar una pantalla, se cambia `[ ]` por `[x]`. "(ventana)" marca los archivos que abren un `Modal` o un `ConfirmModal`.

## Qué se revisa en cada archivo

1. Los títulos (`h1` a `h4`) tienen el tamaño de su nivel (escala de `docs/requisitos/restricciones.md`).
2. Los botones primarios, secundarios y de peligro usan el componente `Button`.
3. Los íconos usan `icon-sm`, `icon-md`, `icon-lg` o `icon-xl`, nunca una medida suelta.
4. Nada de `text-3xl` o más, salvo en la portada y en los textos legales.
5. El peso de la letra sigue la regla (títulos gruesos, botones y pastillas semigruesos, nombres de campo medios).
6. La alineación sigue la regla: los formularios y listas de la app a la izquierda; un mensaje de resultado (ícono, frase, botón), centrado; las ventanas de cuenta (ingreso, registro, invitación) conservan su encabezado centrado hasta el issue de diseño (ver `docs/requisitos/restricciones.md`).

## Conteo de la prueba (partida del 2026-11-11 y hoy)

| Regla | Al empezar | Hoy |
| --- | --- | --- |
| Botón primario, secundario o de peligro escrito a mano | 68 | 0 |
| Ícono con medida suelta | 2 | 0 |
| Texto de 3xl o más fuera de la portada y los textos legales | 7 | 0 |
| Título fuera de la escala | 42 | 0 |
| Peso de letra fuera de la regla (títulos bold, nombres de campo medium) | 34 (se midió al sumar la regla) | 0 |

En la etapa 3 (paneles y páginas de `pages/`) el conteo de botones bajó además porque la regla dejó de contar los controles de selección (pestañas, chips de filtro y tarjetas que hacen de botón: su estilo depende de si están elegidos, así que no son acciones ni se reemplazan por `Button`). Con la etapa 4 (componentes, ventanas y `ui/`) todos los números llegaron a 0 y todas las casillas están marcadas.

Cada tanda baja estos números y la constante `BASE` de la prueba. Al cerrar el issue, todos son 0.

## Públicas con formulario (siguen la escala completa) (7)

- [x] `components/layout/AuthLayout.tsx`
- [x] `pages/AceptarInvitacionPage.tsx` (ventana)
- [x] `pages/ForgotPasswordPage.tsx` (ventana)
- [x] `pages/LoginPage.tsx` (ventana)
- [x] `pages/RegisterPage.tsx` (ventana)
- [x] `pages/ResetPasswordPage.tsx`
- [x] `pages/VerifyEmailPage.tsx`

## Públicas con diseño propio (excepción: portada y textos legales) (9)

- [x] `components/layout/LegalLayout.tsx` (ventana)
- [x] `pages/ContactoModalPage.tsx` (ventana)
- [x] `pages/CookiesModalPage.tsx` (ventana)
- [x] `pages/LandingPage.tsx`
- [x] `pages/PoliticaCookiesPage.tsx`
- [x] `pages/PoliticaPrivacidadPage.tsx`
- [x] `pages/PrivacidadModalPage.tsx` (ventana)
- [x] `pages/TerminosDeUsoPage.tsx`
- [x] `pages/TerminosModalPage.tsx` (ventana)

## Residente y Reciclador (paneles) (2)

- [x] `pages/dashboards/RecicladorDashboard.tsx` (ventana)
- [x] `pages/dashboards/ResidenteDashboard.tsx` (ventana)

## Administrador de Conjunto (panel y páginas) (4)

- [x] `pages/AdminConjuntoAgendaPage.tsx` (ventana)
- [x] `pages/AdminConjuntoComunicadosPage.tsx` (ventana)
- [x] `pages/AdminConjuntoDesempenoPage.tsx`
- [x] `pages/dashboards/AdminConjuntoDashboard.tsx` (ventana)

## Administrador del Sistema (panel y páginas) (5)

- [x] `pages/AdminContenidoEducativoPage.tsx` (ventana)
- [x] `pages/AdminNovedadesPage.tsx` (ventana)
- [x] `pages/AdminPuntosAcopioPage.tsx` (ventana)
- [x] `pages/AdminSolicitudesPage.tsx`
- [x] `pages/dashboards/AdminDashboard.tsx` (ventana)

## Páginas compartidas (Perfil, Contraseña, Soporte técnico, Directorio, Comunicados, Aprende a reciclar…) (7)

- [x] `pages/CatalogoEducativoPage.tsx`
- [x] `pages/CategoriaEducativaPage.tsx`
- [x] `pages/ChangePasswordPage.tsx`
- [x] `pages/ComunicadosFeedPage.tsx`
- [x] `pages/DirectorioPage.tsx`
- [x] `pages/NovedadesFeedPage.tsx`
- [x] `pages/ProfilePage.tsx`

## Componentes compartidos de `ui/` (29)

- [x] `components/ui/Alert.tsx`
- [x] `components/ui/BackToTopButton.tsx`
- [x] `components/ui/BrandLogo.tsx`
- [x] `components/ui/Button.tsx`
- [x] `components/ui/ConfirmModal.tsx` (ventana)
- [x] `components/ui/ConjuntoCombobox.tsx`
- [x] `components/ui/ConjuntoComboboxMultiple.tsx`
- [x] `components/ui/ContadorCaracteres.tsx`
- [x] `components/ui/ContenidoRecargable.tsx`
- [x] `components/ui/EmptyState.tsx`
- [x] `components/ui/FechaEnPalabras.tsx`
- [x] `components/ui/GuiaApoyoField.tsx`
- [x] `components/ui/ImagenAdjuntaField.tsx`
- [x] `components/ui/InputField.tsx`
- [x] `components/ui/InsigniaAccionImagen.tsx`
- [x] `components/ui/LanguageSwitcher.tsx`
- [x] `components/ui/LoadingState.tsx`
- [x] `components/ui/MenuAcciones.tsx`
- [x] `components/ui/Modal.tsx` (ventana)
- [x] `components/ui/Paginacion.tsx`
- [x] `components/ui/PasswordRequirementsChecklist.tsx`
- [x] `components/ui/PasswordStrengthIndicator.tsx`
- [x] `components/ui/Pestanas.tsx`
- [x] `components/ui/ProgressBar.tsx`
- [x] `components/ui/ServerErrorBanner.tsx`
- [x] `components/ui/Spinner.tsx`
- [x] `components/ui/TextoRecortable.tsx`
- [x] `components/ui/ThemeToggle.tsx`
- [x] `components/ui/YoutubeEmbed.tsx`

## Componentes de `layout/` (2)

- [x] `components/layout/AppShell.tsx` (ventana)
- [x] `components/layout/NotificationBell.tsx`

## Componentes del panel del Administrador de Conjunto (`adminConjunto/`) (9)

- [x] `components/adminConjunto/AvisosConjunto.tsx`
- [x] `components/adminConjunto/CoberturaConjunto.tsx`
- [x] `components/adminConjunto/CodigoAccesoConjunto.tsx` (ventana)
- [x] `components/adminConjunto/DesvinculacionConjunto.tsx` (ventana)
- [x] `components/adminConjunto/EditarConjuntoModal.tsx` (ventana)
- [x] `components/adminConjunto/InvitarRecicladorModal.tsx` (ventana)
- [x] `components/adminConjunto/RecicladoresConjunto.tsx` (ventana)
- [x] `components/adminConjunto/ResumenConjunto.tsx`
- [x] `components/adminConjunto/TarjetaConjunto.tsx`

## Componentes de desempeño (`desempeno/`) (7)

- [x] `components/desempeno/GraficaDesempenoSemanal.tsx`
- [x] `components/desempeno/LeyendaNiveles.tsx`
- [x] `components/desempeno/ListaAuditoriasSemana.tsx`
- [x] `components/desempeno/PanelDesempeno.tsx`
- [x] `components/desempeno/RankingTemas.tsx`
- [x] `components/desempeno/ResumenDesempeno.tsx`
- [x] `components/desempeno/TablaDesempenoSemanal.tsx`

## Componentes de contenido educativo (`educativo/`) (10)

- [x] `components/educativo/CalificacionesPorConjunto.tsx`
- [x] `components/educativo/CategoriaField.tsx`
- [x] `components/educativo/ContenidoRecomendadoCalificacion.tsx`
- [x] `components/educativo/EnviarAConjuntosModal.tsx` (ventana)
- [x] `components/educativo/IlustracionCategoria.tsx`
- [x] `components/educativo/ModuloEducativoModal.tsx` (ventana)
- [x] `components/educativo/MuroLeccion.tsx`
- [x] `components/educativo/ResumenMuro.tsx`
- [x] `components/educativo/TuSemana.tsx`
- [x] `components/educativo/VistaPreviaModulo.tsx`

## Componentes de los paneles (`dashboard/`) (5)

- [x] `components/dashboard/AuditoriaResultadoBanner.tsx`
- [x] `components/dashboard/AuditoriaResultadoModal.tsx` (ventana)
- [x] `components/dashboard/DesvinculacionAprobadaBanner.tsx`
- [x] `components/dashboard/HistorialAuditorias.tsx`
- [x] `components/dashboard/NotificationFeed.tsx`

## Otros componentes (17)

- [x] `components/AsignarConjuntoAdicionalForm.tsx` (ventana)
- [x] `components/AuditoriaConjuntoForm.tsx` (ventana)
- [x] `components/AyudaMotivo.tsx`
- [x] `components/ComentariosPunto.tsx`
- [x] `components/ErrorBoundary.tsx`
- [x] `components/ErrorFallback.tsx`
- [x] `components/FichaPuntoAcopio.tsx` (ventana)
- [x] `components/InvitarAdminConjuntoForm.tsx` (ventana)
- [x] `components/NovedadesEnviadas.tsx`
- [x] `components/PerfilUsuarioDetalle.tsx`
- [x] `components/ProtectedRoute.tsx`
- [x] `components/PuntoAcopioForm.tsx`
- [x] `components/RoleGuard.tsx`
- [x] `components/SolicitudAdminConjuntoInfo.tsx`
- [x] `components/SolicitudesDesvinculacion.tsx`
- [x] `components/SoporteTecnico.tsx`
- [x] `components/TablaPuntosAcopio.tsx`

## Configuración con JSX (4)

- [x] `App.tsx`
- [x] `config/contenidoEducativoMarkdown.tsx`
- [x] `context/AuthContext.tsx`
- [x] `main.tsx`

## Total

117 archivos. Con ventana: 33.
