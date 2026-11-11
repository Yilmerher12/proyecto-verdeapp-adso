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
| Botón primario, secundario o de peligro escrito a mano | 68 | 68 |
| Ícono con medida suelta | 2 | 2 |
| Texto de 3xl o más fuera de la portada y los textos legales | 7 | 5 |
| Título fuera de la escala | 42 | 35 |
| Peso de letra fuera de la regla (títulos bold, nombres de campo medium) | 34 (se midió al sumar la regla) | 34 |

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

- [ ] `components/layout/LegalLayout.tsx` (ventana)
- [ ] `pages/ContactoModalPage.tsx` (ventana)
- [ ] `pages/CookiesModalPage.tsx` (ventana)
- [ ] `pages/LandingPage.tsx`
- [ ] `pages/PoliticaCookiesPage.tsx`
- [ ] `pages/PoliticaPrivacidadPage.tsx`
- [ ] `pages/PrivacidadModalPage.tsx` (ventana)
- [ ] `pages/TerminosDeUsoPage.tsx`
- [ ] `pages/TerminosModalPage.tsx` (ventana)

## Residente y Reciclador (paneles) (2)

- [ ] `pages/dashboards/RecicladorDashboard.tsx` (ventana)
- [ ] `pages/dashboards/ResidenteDashboard.tsx` (ventana)

## Administrador de Conjunto (panel y páginas) (4)

- [ ] `pages/AdminConjuntoAgendaPage.tsx` (ventana)
- [ ] `pages/AdminConjuntoComunicadosPage.tsx` (ventana)
- [ ] `pages/AdminConjuntoDesempenoPage.tsx`
- [ ] `pages/dashboards/AdminConjuntoDashboard.tsx` (ventana)

## Administrador del Sistema (panel y páginas) (5)

- [ ] `pages/AdminContenidoEducativoPage.tsx` (ventana)
- [ ] `pages/AdminNovedadesPage.tsx` (ventana)
- [ ] `pages/AdminPuntosAcopioPage.tsx` (ventana)
- [ ] `pages/AdminSolicitudesPage.tsx`
- [ ] `pages/dashboards/AdminDashboard.tsx` (ventana)

## Páginas compartidas (Perfil, Contraseña, Soporte técnico, Directorio, Comunicados, Aprende a reciclar…) (7)

- [ ] `pages/CatalogoEducativoPage.tsx`
- [ ] `pages/CategoriaEducativaPage.tsx`
- [ ] `pages/ChangePasswordPage.tsx`
- [ ] `pages/ComunicadosFeedPage.tsx`
- [ ] `pages/DirectorioPage.tsx`
- [ ] `pages/NovedadesFeedPage.tsx`
- [ ] `pages/ProfilePage.tsx`

## Componentes compartidos de `ui/` (29)

- [ ] `components/ui/Alert.tsx`
- [ ] `components/ui/BackToTopButton.tsx`
- [ ] `components/ui/BrandLogo.tsx`
- [ ] `components/ui/Button.tsx`
- [ ] `components/ui/ConfirmModal.tsx` (ventana)
- [ ] `components/ui/ConjuntoCombobox.tsx`
- [ ] `components/ui/ConjuntoComboboxMultiple.tsx`
- [ ] `components/ui/ContadorCaracteres.tsx`
- [ ] `components/ui/ContenidoRecargable.tsx`
- [ ] `components/ui/EmptyState.tsx`
- [ ] `components/ui/FechaEnPalabras.tsx`
- [ ] `components/ui/GuiaApoyoField.tsx`
- [ ] `components/ui/ImagenAdjuntaField.tsx`
- [ ] `components/ui/InputField.tsx`
- [ ] `components/ui/InsigniaAccionImagen.tsx`
- [ ] `components/ui/LanguageSwitcher.tsx`
- [ ] `components/ui/LoadingState.tsx`
- [ ] `components/ui/MenuAcciones.tsx`
- [ ] `components/ui/Modal.tsx` (ventana)
- [ ] `components/ui/Paginacion.tsx`
- [ ] `components/ui/PasswordRequirementsChecklist.tsx`
- [ ] `components/ui/PasswordStrengthIndicator.tsx`
- [ ] `components/ui/Pestanas.tsx`
- [ ] `components/ui/ProgressBar.tsx`
- [ ] `components/ui/ServerErrorBanner.tsx`
- [ ] `components/ui/Spinner.tsx`
- [ ] `components/ui/TextoRecortable.tsx`
- [ ] `components/ui/ThemeToggle.tsx`
- [ ] `components/ui/YoutubeEmbed.tsx`

## Componentes de `layout/` (2)

- [ ] `components/layout/AppShell.tsx` (ventana)
- [ ] `components/layout/NotificationBell.tsx`

## Componentes del panel del Administrador de Conjunto (`adminConjunto/`) (9)

- [ ] `components/adminConjunto/AvisosConjunto.tsx`
- [ ] `components/adminConjunto/CoberturaConjunto.tsx`
- [ ] `components/adminConjunto/CodigoAccesoConjunto.tsx` (ventana)
- [ ] `components/adminConjunto/DesvinculacionConjunto.tsx` (ventana)
- [ ] `components/adminConjunto/EditarConjuntoModal.tsx` (ventana)
- [ ] `components/adminConjunto/InvitarRecicladorModal.tsx` (ventana)
- [ ] `components/adminConjunto/RecicladoresConjunto.tsx` (ventana)
- [ ] `components/adminConjunto/ResumenConjunto.tsx`
- [ ] `components/adminConjunto/TarjetaConjunto.tsx`

## Componentes de desempeño (`desempeno/`) (7)

- [ ] `components/desempeno/GraficaDesempenoSemanal.tsx`
- [ ] `components/desempeno/LeyendaNiveles.tsx`
- [ ] `components/desempeno/ListaAuditoriasSemana.tsx`
- [ ] `components/desempeno/PanelDesempeno.tsx`
- [ ] `components/desempeno/RankingTemas.tsx`
- [ ] `components/desempeno/ResumenDesempeno.tsx`
- [ ] `components/desempeno/TablaDesempenoSemanal.tsx`

## Componentes de contenido educativo (`educativo/`) (10)

- [ ] `components/educativo/CalificacionesPorConjunto.tsx`
- [ ] `components/educativo/CategoriaField.tsx`
- [ ] `components/educativo/ContenidoRecomendadoCalificacion.tsx`
- [ ] `components/educativo/EnviarAConjuntosModal.tsx` (ventana)
- [ ] `components/educativo/IlustracionCategoria.tsx`
- [ ] `components/educativo/ModuloEducativoModal.tsx` (ventana)
- [ ] `components/educativo/MuroLeccion.tsx`
- [ ] `components/educativo/ResumenMuro.tsx`
- [ ] `components/educativo/TuSemana.tsx`
- [ ] `components/educativo/VistaPreviaModulo.tsx`

## Componentes de los paneles (`dashboard/`) (5)

- [ ] `components/dashboard/AuditoriaResultadoBanner.tsx`
- [ ] `components/dashboard/AuditoriaResultadoModal.tsx` (ventana)
- [ ] `components/dashboard/DesvinculacionAprobadaBanner.tsx`
- [ ] `components/dashboard/HistorialAuditorias.tsx`
- [ ] `components/dashboard/NotificationFeed.tsx`

## Otros componentes (17)

- [ ] `components/AsignarConjuntoAdicionalForm.tsx` (ventana)
- [ ] `components/AuditoriaConjuntoForm.tsx` (ventana)
- [ ] `components/AyudaMotivo.tsx`
- [ ] `components/ComentariosPunto.tsx`
- [ ] `components/ErrorBoundary.tsx`
- [ ] `components/ErrorFallback.tsx`
- [ ] `components/FichaPuntoAcopio.tsx` (ventana)
- [ ] `components/InvitarAdminConjuntoForm.tsx` (ventana)
- [ ] `components/NovedadesEnviadas.tsx`
- [ ] `components/PerfilUsuarioDetalle.tsx`
- [ ] `components/ProtectedRoute.tsx`
- [ ] `components/PuntoAcopioForm.tsx`
- [ ] `components/RoleGuard.tsx`
- [ ] `components/SolicitudAdminConjuntoInfo.tsx`
- [ ] `components/SolicitudesDesvinculacion.tsx`
- [ ] `components/SoporteTecnico.tsx`
- [ ] `components/TablaPuntosAcopio.tsx`

## Configuración con JSX (4)

- [ ] `App.tsx`
- [ ] `config/contenidoEducativoMarkdown.tsx`
- [ ] `context/AuthContext.tsx`
- [ ] `main.tsx`

## Total

117 archivos. Con ventana: 33.
