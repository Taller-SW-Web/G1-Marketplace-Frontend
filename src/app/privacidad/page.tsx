import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Información sobre datos usados en el prototipo académico Inka Athletics.",
};

export default function PrivacyPage() {
  return <LegalPage title="Política de privacidad" introduction="Esta página explica qué datos utiliza el prototipo académico Inka Athletics y para qué se emplean durante las pruebas del Marketplace.">
    <section><h2>1. Responsable y contexto</h2><p>El equipo G1 de Marketplace, dentro del curso Taller de Construcción Web, coordina este prototipo. No se ha designado todavía un correo público operativo ni una dirección para solicitudes de privacidad. <strong>privacidad@inka-athletics.example es solo un ejemplo y no recibe mensajes.</strong> La publicación de un canal real de atención sigue pendiente.</p></section>
    <section><h2>2. Datos que se solicitan</h2><p>Al registrarte se solicitan nombres, apellidos, correo, celular, contraseña y aceptación de los documentos. El módulo de Seguridad gestiona la contraseña, verificación del correo y sesiones. Marketplace no guarda la contraseña en su base de datos propia. Durante las pruebas pueden generarse datos de carrito, favoritos, pedidos simulados y registros técnicos necesarios para diagnosticar errores.</p></section>
    <section><h2>3. Finalidades</h2><p>Los datos se usan para crear y verificar la cuenta, permitir el acceso, mostrar las funciones de Marketplace, simular pedidos y comprobar el funcionamiento y la seguridad del prototipo. No se usan para cobrar pagos reales. Esta versión no solicita consentimiento para campañas comerciales ni para vender datos.</p></section>
    <section><h2>4. Módulos y servicios</h2><p>Marketplace se comunica con el módulo de Seguridad para identidad y acceso, y con los módulos académicos de catálogo, ventas y despacho para las funciones correspondientes. El sitio y sus API se publican mediante servicios de alojamiento web. La ubicación, los encargados concretos y los plazos de conservación de los datos de cada módulo deben ser confirmados por el equipo antes de usar el sitio fuera de pruebas controladas.</p></section>
    <section><h2>5. Datos obligatorios y elección</h2><p>Los campos marcados como obligatorios son necesarios para intentar el registro; si no se proporcionan, no se crea la cuenta. La casilla de aceptación comienza sin marcar. Puedes leer ambos documentos antes de decidir si deseas continuar.</p></section>
    <section><h2>6. Conservación y derechos</h2><p>Las cuentas y los datos de prueba pueden permanecer en los servicios utilizados por los módulos mientras dure el proyecto o hasta que se apliquen sus procedimientos de eliminación. El plazo exacto aún no está documentado. Puedes solicitar información, acceso, corrección o eliminación de datos y retirar tu consentimiento; el equipo G1 debe publicar un canal funcional para tramitar estas solicitudes antes de abrir el registro al público general.</p></section>
    <section><h2>7. Recomendación para las pruebas</h2><p>Este entorno está destinado a pruebas académicas controladas. No incluyas datos de pago ni información personal adicional a la solicitada. Si no participas en las pruebas, espera a que se publique un canal de privacidad operativo y la versión completa de esta política antes de crear una cuenta.</p></section>
  </LegalPage>;
}
