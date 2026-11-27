type OrderEmailNoticeProps = {
  orderConfirmed: boolean;
  preview?: boolean;
};

export function OrderEmailNotice({ orderConfirmed, preview = false }: OrderEmailNoticeProps) {
  if (!orderConfirmed) return null;

  // F-034 exposes no delivery status or authorized recipient in the checkout response.
  return (
    <div className="checkout-email-notice" role="note">
      <div>
        <p className="checkout-email-notice-title">Confirmación por correo</p>
        <p>{preview
          ? "Vista previa: en una compra real, te enviaremos una confirmación al correo registrado."
          : "Te enviaremos una confirmación al correo registrado."}</p>
      </div>
    </div>
  );
}
