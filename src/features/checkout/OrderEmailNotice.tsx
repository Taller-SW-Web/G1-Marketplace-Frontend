export function OrderEmailNotice({ fixture }: { fixture: boolean }) {
  return <p className="checkout-muted" role="status" aria-live="polite">
    {fixture
      ? "No se envió un correo en esta fixture local."
      : "El envío del correo no está habilitado en este entorno; esta pantalla no confirma su entrega."}
  </p>;
}
