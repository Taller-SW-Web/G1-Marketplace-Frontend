import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Condiciones de uso del Marketplace académico Inka Athletics.",
};

export default function TermsPage() {
  return <LegalPage title="Términos de uso" introduction="Estas condiciones explican el uso del prototipo académico Inka Athletics, desarrollado por el equipo G1 de Marketplace para el curso Taller de Construcción Web.">
    <section><h2>1. Alcance del proyecto</h2><p>El sitio permite explorar productos, crear una cuenta de prueba y recorrer funciones de carrito, pedidos y otras vistas de Marketplace. Es una demostración académica: las compras y los pagos son simulados. El sitio no cobra dinero, no procesa tarjetas y no genera una entrega comercial real.</p></section>
    <section><h2>2. Cuenta y acceso</h2><p>Para usar las funciones que requieren cuenta, debes proporcionar datos de registro válidos y verificar tu correo mediante el módulo de Seguridad. La cuenta no se activa ni se inicia una sesión solo por enviar el formulario. Mantén tus credenciales en privado y no utilices la cuenta de otra persona.</p></section>
    <section><h2>3. Uso permitido</h2><p>Usa el sitio para las pruebas del proyecto y evita cargar información de terceros sin autorización, realizar solicitudes automatizadas abusivas o intentar acceder a cuentas y datos ajenos. Los datos de catálogo, precios, disponibilidad y estados de pedidos pueden ser demostrativos y cambiar durante las pruebas.</p></section>
    <section><h2>4. Pedidos y pagos</h2><p>Agregar productos al carrito o confirmar un pedido en este entorno no constituye una compra real. No introduzcas datos de tarjeta ni información financiera. Las pantallas de checkout y confirmación representan un flujo de prueba.</p></section>
    <section><h2>5. Datos personales</h2><p>El registro solicita datos de contacto y acceso para probar el recorrido de cuenta. Antes de registrarte, lee la <a href="/privacidad">política de privacidad</a>. Utiliza una cuenta de prueba y evita incluir información personal innecesaria en campos libres.</p></section>
    <section><h2>6. Cambios del prototipo</h2><p>El equipo G1 puede actualizar, interrumpir o reiniciar el entorno de pruebas. Si cambia de forma material el tratamiento de datos o el alcance del servicio, se publicará una nueva versión de estos documentos antes de solicitar una nueva aceptación.</p></section>
    <section><h2>7. Responsable del proyecto</h2><p>El responsable operativo de este prototipo es el equipo G1 de Marketplace del curso Taller de Construcción Web. Esta versión describe un entorno académico y no identifica a una empresa comercial constituida.</p></section>
  </LegalPage>;
}
