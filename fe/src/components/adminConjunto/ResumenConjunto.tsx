import type { ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import { CoberturaConjunto } from "@/components/adminConjunto/CoberturaConjunto";
import { CodigoAccesoConjunto } from "@/components/adminConjunto/CodigoAccesoConjunto";
import { DesvinculacionConjunto } from "@/components/adminConjunto/DesvinculacionConjunto";

/**
 * ¿Qué? Pestaña "Resumen" de UN conjunto: la cobertura (a la izquierda, más ancha: es la cifra que se mira), el código
 *       de acceso (a la derecha, angosto: lo que se reparte) y, al final y apartado, "Dejar de administrar este conjunto".
 * ¿Para qué? Issue #595: lo que antes eran cinco bloques apilados con fondos distintos ahora son tres pestañas; esta
 *           reúne lo que se mira primero y lo que casi no se usa.
 * ¿Impacto? En un espacio angosto (celular, o con el menú lateral abierto) cobertura y código se apilan, con la cobertura
 *           primero. El corte depende del ancho de la tarjeta del conjunto (contenedor), no del de la ventana.
 */
export function ResumenConjunto({
  conjunto,
  onActualizado,
}: {
  conjunto: ConjuntoAdministrado;
  onActualizado: () => void;
}) {
  return (
    <div>
      <div className="grid gap-4 @2xl:grid-cols-5">
        <div className="flex @2xl:col-span-3">
          <CoberturaConjunto conjunto={conjunto} />
        </div>
        <div className="flex @2xl:col-span-2">
          <CodigoAccesoConjunto
            idConjunto={conjunto.id_conjunto_residencial}
            codigoAcceso={conjunto.codigo_acceso}
            onRegenerado={onActualizado}
          />
        </div>
      </div>

      <DesvinculacionConjunto
        idConjunto={conjunto.id_conjunto_residencial}
        tieneSolicitudPendiente={conjunto.tiene_solicitud_pendiente}
        onSolicitudEnviada={onActualizado}
      />
    </div>
  );
}
