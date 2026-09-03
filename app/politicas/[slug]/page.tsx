import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";

const policies = {
  privacidad: {
    title: "Política de Privacidad",
    summary:
      "En KLINIU SAS, entendemos y valoramos la importancia de proteger su información personal. Por ello, estamos comprometidos con mantener la confidencialidad, seguridad y privacidad de los datos que nuestros usuarios, clientes y visitantes nos proporcionan.",
    sections: [
      {
        heading: "Uso de la Información",
        body: "La información personal que usted nos comparte será utilizada exclusivamente para fines de mercadeo y promociones de nuestros productos. KLINIU SAS se compromete a no vender, alquilar, compartir ni divulgar esta información a terceros bajo ninguna circunstancia, salvo que sea requerida por una autoridad judicial competente, en cumplimiento de la ley.",
      },
      {
        heading: "Derecho a la Eliminación de Datos",
        body: "En cualquier momento, usted puede solicitar la eliminación de sus datos de nuestras bases, escribiendo al correo info@kliniu.com e incluyendo su nombre completo y el motivo de su solicitud. Procesaremos su solicitud en el menor tiempo posible.",
      },
      {
        heading: "Protección Legal",
        body: "Según nuestros Términos Legales, su información será tratada bajo estrictas normas de confidencialidad y sólo será divulgada por mandato legal o requerimiento judicial.",
      },
      {
        heading: "Política de Garantías y Derecho de Retracto",
        body: "En KLINIU SAS, nuestro principal compromiso es su total satisfacción. Todos nuestros productos cuentan con garantía, cambio o devolución, siempre que se cumplan las condiciones establecidas a continuación.",
      },
      {
        heading: "Condiciones Generales",
        body: "El cambio o devolución podrá realizarse dentro de los primeros 30 días desde la compra. El producto debe encontrarse en perfecto estado, sin señales de mal uso, con su empaque original, manuales y accesorios completos. No aplica para productos manipulados, deteriorados, usados o sin embalaje original.",
      },
      {
        heading: "Trámites y Contacto",
        body: "Para gestionar cualquier tipo de garantía, cambio o devolución, puede comunicarse con nuestro Centro de Atención al Cliente:\n\nColombia: Tel: +57(1) 3682434 / +57 3226556454 — Dirección: Av. 28 No. 34-43, Barrio La Soledad, Bogotá.\nHonduras: +504 31852275\nRepública Dominicana: +1 (809) 8507005\nNicaragua: +505 82508359\n\nTambién puede escribirnos a: info@kliniu.com",
      },
      {
        heading: "1. Garantía por Defectos de Fabricación",
        body: "Aplica para productos con fallas o defectos no atribuibles al uso. Requiere presentación de factura original dentro de los 5 días hábiles desde la compra.",
      },
      {
        heading: "2. Cambio por el Mismo Producto",
        body: "Válido una sola vez por compra. El producto debe presentarse nuevo, con factura, y dentro del plazo estipulado.",
      },
      {
        heading: "3. Cambio por Otro Producto",
        body: "Puede cambiarse por un producto de igual o mayor valor, pagando la diferencia si aplica. No se aceptan cambios por productos usados o abiertos (especialmente productos de uso personal como cápsulas, cremas, geles, etc.).",
      },
      {
        heading: "4. Devolución de Dinero",
        body: "Se puede solicitar dentro de los 5 días hábiles por insatisfacción. El reembolso se realizará en la misma forma de pago original: tarjeta de crédito hasta 20 días hábiles; efectivo o cheque 10 días hábiles; consignación requiere carta con cuenta y banco receptor.",
      },
      {
        heading: "5. Mantenimiento y Repuestos",
        body: "Para mantenimientos fuera de garantía (por mal uso o desgaste), el costo será asumido por el cliente. Incluye 30 días de garantía sobre el mantenimiento realizado.",
      },
      {
        heading: "Política de Reversión – Pagos Wompi",
        body: "Usted reconoce que las ventas no presenciales pueden estar sujetas a reversión de pagos por parte del titular del medio de pago, conforme a la normativa local vigente. Este proceso será gestionado exclusivamente entre el titular, la entidad emisora y la entidad adquirente. En caso de reversión exitosa, KLINIU SAS podrá descontar el valor correspondiente o emitir una factura por el monto, compensándolo con futuros ingresos o generando intereses por mora si no se realiza el pago.",
      },
      {
        heading: "Acerca de Nosotros",
        body: "KLINIU SAS, con el respaldo de GC International, es una empresa colombiana con presencia en México, Nicaragua, Honduras, Guatemala y República Dominicana. Desde 1984 nos dedicamos al diseño, fabricación y comercialización de productos plásticos para el hogar e industria metalmecánica.\n\nContamos con certificaciones ISO 9001 e ISO 14001, y nuestras materias primas están aprobadas por la FDA, garantizando productos de alta calidad. Nuestra misión es innovar y ofrecer soluciones prácticas que faciliten la vida en el hogar y la industria.",
      },
    ],
  },
  garantia: {
    title: "Garantía de Productos",
    summary:
      "Manual de Garantía de Productos KLINIU S.A.S. — vigente desde julio 2025. Expedido conforme a la Ley 1480 de 2011 (Estatuto del Consumidor) y demás normas concordantes.",
    sections: [
      {
        heading: "1. Marco Legal",
        body: "Este manual se expide conforme a la Ley 1480 de 2011 (Estatuto del Consumidor) y demás normas concordantes. Las garantías ofrecidas por KLINIU S.A.S. respetan los derechos mínimos del consumidor, incluyendo protección al consumidor, derecho a la información, garantía mínima legal y derecho de retracto cuando aplique. También son aplicables a relaciones B2B salvo disposiciones en contrario.",
      },
      {
        heading: "2. Productos Cubiertos",
        body: "Este manual aplica a todos los productos comercializados por KLINIU S.A.S., incluyendo: dispensadores de higiene (incluidos los que contienen componentes electrónicos) y productos plásticos para el hogar y la industria fabricados o importados.",
      },
      {
        heading: "3. Términos de la Garantía",
        body: "Duración: mínima de 3 meses, salvo indicación expresa de mayor plazo. Inicio: fecha de entrega según factura o guía de despacho. Cobertura: defectos de fabricación o materiales, fisuras estructurales no atribuibles al mal uso, fallos en ruedas, tapas, ensamblajes o componentes electrónicos bajo condiciones normales. Responsabilidad: en caso de validarse la garantía, se procederá a reparación, cambio del producto, emisión de nota crédito o cambio total, sin costo adicional.",
      },
      {
        heading: "4. Exclusiones de Garantía",
        body: "Esta garantía no cubre: daños por uso inadecuado, abuso o negligencia; golpes, caídas o arrastre en superficies irregulares; exposición a sustancias químicas corrosivas no compatibles; exposición a climas o ambientes fuertes que deterioren el producto; almacenamiento inadecuado o condiciones extremas (sol intenso, fuego directo, etc.); intervenciones o modificaciones no autorizadas; instalación incorrecta o no realizada por personal calificado.",
      },
      {
        heading: "5. Procedimiento para Hacer Efectiva la Garantía",
        body: "1. Notificar el defecto por correo a ventas@kliniu.com dentro del período de garantía.\n2. Adjuntar: evidencia del daño (fotos/videos), copia de la factura y breve descripción del caso.\n3. Evaluación en máximo 10 días hábiles.\n4. En caso de aprobación, se notificará si el producto será reparado, sustituido o cubierto con nota crédito.\n\nLas reclamaciones deberán hacerse únicamente a través de los canales indicados.",
      },
      {
        heading: "6. Derecho de Retracto (Art. 47 Ley 1480 de 2011)",
        body: "Aplica solo para ventas no presenciales (internet, teléfono, catálogo). Término: 5 días hábiles siguientes a la entrega. Condiciones: producto nuevo, sin uso, con todos sus empaques, etiquetas y accesorios originales. El costo de transporte por devolución será asumido por el consumidor. No aplica para productos personalizados, sanitarios o fabricados a medida. Una vez recibido y verificado el producto, se realizará el reembolso dentro de los 30 días calendario.",
      },
      {
        heading: "7. Canales de Atención",
        body: "Correo: ventas@kliniu.com\nTeléfono: 601 3682434 / 312 5860921\nHorario: lunes a viernes, 8:00 a.m. – 5:00 p.m.\nWeb: www.kliniu.com",
      },
      {
        heading: "8. Tabla de Garantías por Producto",
        body: "Dispensadores plásticos: 6 meses — uso institucional con instalación adecuada.\nDispensadores con sensor o electrónicos: 3 meses — evitar humedad excesiva y uso continuo severo. Uso en interiores o pavimento uniforme.",
      },
      {
        heading: "9. Consideraciones Finales",
        body: "Este manual hace parte integral de la relación comercial entre KLINIU S.A.S. y sus compradores. Las condiciones pueden ser actualizadas; prevalecerá la versión vigente al momento de la compra. En caso de controversias, las partes podrán acudir a la Superintendencia de Industria y Comercio (SIC). KLINIU S.A.S. garantiza procesos transparentes, confiables y sin letra pequeña. Consulte nuestros planes de instalación o mantenimiento preventivo.",
      },
    ],
  },
  devoluciones: {
    title: "Devoluciones",
    summary:
      "Si necesitas revisar una devolución, nuestro equipo comercial te acompaña para validar el caso y darte una respuesta clara.",
    sections: [
      {
        heading: "Solicitud",
        body: "Comunícate con Kliniu indicando número de pedido, producto, motivo de devolución y evidencia fotográfica si aplica.",
      },
      {
        heading: "Estado del producto",
        body: "El producto debe conservar sus partes, accesorios y empaque cuando sea posible. Productos usados, instalados o deteriorados serán revisados antes de aprobar una devolución.",
      },
      {
        heading: "Tiempos y respuesta",
        body: "Una vez recibida la solicitud, el equipo comercial validará la información y te indicará los pasos para cambio, nota crédito o solución aplicable.",
      },
    ],
  },
  "tratamiento-datos": {
    title: "Tratamiento de datos personales",
    summary:
      "Kliniu trata los datos personales de clientes, prospectos y aliados conforme a finalidades comerciales, operativas y de servicio.",
    sections: [
      {
        heading: "Finalidades",
        body: "Los datos pueden ser usados para contacto comercial, gestión de compras, entregas, soporte, garantías, campañas informativas y cumplimiento de obligaciones legales.",
      },
      {
        heading: "Derechos del titular",
        body: "Puedes solicitar consulta, actualización, corrección o eliminación de tus datos cuando corresponda, escribiendo a nuestro canal de atención.",
      },
      {
        heading: "Canal de atención",
        body: "Para solicitudes relacionadas con datos personales, escribe a ventas@kliniu.com o comunícate con el departamento comercial.",
      },
    ],
  },
  "terminos-y-condiciones": {
    title: "Términos y Condiciones",
    summary:
      "Condiciones generales de uso del sitio kliniu.com y de las compras realizadas a través de él. Al navegar, registrarte o comprar aceptas estos términos.",
    sections: [
      {
        heading: "1. Identificación del comerciante",
        body: "Razón social: KLINIU S.A.S.\nDomicilio: Cra. 28 #3443, Bogotá D.C., Colombia.\nCorreo electrónico: info@kliniu.com\nTeléfonos: 601 3682434 / 312 5860921\nHorario de atención: lunes a viernes, 8:00 a.m. – 5:00 p.m.\nKLINIU S.A.S. es una sociedad comercial constituida bajo las leyes de la República de Colombia y responsable de la operación de este sitio.",
      },
      {
        heading: "2. Objeto y aceptación",
        body: "Estos Términos y Condiciones regulan el acceso y uso del sitio web kliniu.com, así como la compra de productos ofrecidos en él. El uso del sitio implica la aceptación plena y sin reservas de estas condiciones en la versión publicada al momento del acceso. Si no estás de acuerdo, debes abstenerte de usar el sitio.",
      },
      {
        heading: "3. Capacidad y registro",
        body: "Para comprar debes ser mayor de edad y tener capacidad legal para contratar. Al crear una cuenta te comprometes a suministrar información veraz, completa y actualizada, y a mantener la confidencialidad de tus credenciales. Eres responsable de toda actividad realizada desde tu cuenta. KLINIU S.A.S. podrá suspender o cancelar cuentas con información falsa o usos indebidos.",
      },
      {
        heading: "4. Productos, precios e impuestos",
        body: "Los precios se expresan en pesos colombianos (COP) e incluyen IVA cuando aplique, salvo indicación expresa. Los precios y promociones pueden cambiar sin previo aviso; el precio aplicable es el vigente al momento de confirmar el pedido. Las imágenes son ilustrativas y pueden presentar diferencias de color o presentación frente al producto físico. La disponibilidad está sujeta a inventario; si un producto no está disponible tras el pago, se ofrecerá reposición o reembolso total.",
      },
      {
        heading: "5. Perfeccionamiento de la compra",
        body: "El pedido se entiende perfeccionado cuando el pago es aprobado por la pasarela y KLINIU S.A.S. confirma la orden por correo electrónico. KLINIU S.A.S. se reserva el derecho de rechazar o anular pedidos por errores evidentes de precio o descripción, sospecha de fraude, o imposibilidad de despacho, con reembolso íntegro del valor pagado.",
      },
      {
        heading: "6. Medios de pago",
        body: "Los pagos en línea se procesan a través de la pasarela Wompi. KLINIU S.A.S. no almacena datos completos de tarjetas de crédito o débito; dicha información es gestionada directamente por la pasarela bajo sus propios estándares de seguridad. También se aceptan medios de pago acordados con el equipo comercial para clientes corporativos.",
      },
      {
        heading: "7. Cotizaciones y ventas corporativas",
        body: "Las cotizaciones generadas en el sitio son informativas, no constituyen oferta mercantil vinculante y tienen la vigencia indicada en el documento. Los pedidos corporativos, personalizaciones y tampografías se rigen adicionalmente por las condiciones acordadas por escrito con el equipo comercial.",
      },
      {
        heading: "8. Propiedad intelectual",
        body: "Las marcas, logotipos, textos, fotografías, videos, diseños y demás contenidos del sitio son propiedad de KLINIU S.A.S. o de sus licenciantes. Queda prohibida su reproducción, distribución, comunicación pública o transformación sin autorización previa y escrita.",
      },
      {
        heading: "9. Uso permitido del sitio",
        body: "Te obligas a no usar el sitio con fines ilícitos, a no intentar vulnerar sus medidas de seguridad, no extraer datos de forma automatizada (scraping), no introducir software malicioso y no suplantar la identidad de terceros.",
      },
      {
        heading: "10. Limitación de responsabilidad",
        body: "KLINIU S.A.S. responde por la conformidad de los productos y por la garantía legal en los términos de la Ley 1480 de 2011. No responde por interrupciones del servicio atribuibles a fallas de conectividad, causas de fuerza mayor o caso fortuito, ni por el contenido de sitios de terceros enlazados desde este sitio.",
      },
      {
        heading: "11. Políticas complementarias",
        body: "Forman parte integral de estos términos la Política de Privacidad, la Política de Tratamiento de Datos Personales, la Política de Cookies, el Manual de Garantía, la Política de Envíos y Entregas, y la Política de Retracto y Reversión del Pago.",
      },
      {
        heading: "12. Modificaciones",
        body: "KLINIU S.A.S. puede actualizar estos Términos y Condiciones en cualquier momento. La versión publicada en el sitio es la vigente. Para compras ya perfeccionadas prevalece la versión vigente al momento de la compra.",
      },
      {
        heading: "13. Ley aplicable y solución de controversias",
        body: "Estos términos se rigen por la ley colombiana. Las controversias podrán ventilarse ante la Superintendencia de Industria y Comercio (SIC) en ejercicio de sus facultades jurisdiccionales, o ante los jueces competentes de Colombia.",
      },
    ],
  },
  cookies: {
    title: "Política de Cookies",
    summary:
      "Explicación de qué cookies y tecnologías similares usa kliniu.com, con qué finalidad, y cómo puedes aceptarlas, rechazarlas o eliminarlas.",
    sections: [
      {
        heading: "1. Qué son las cookies",
        body: "Las cookies son pequeños archivos de texto que un sitio web almacena en tu navegador. Permiten reconocer tu dispositivo, recordar preferencias y medir el uso del sitio. También usamos tecnologías equivalentes como localStorage y sessionStorage.",
      },
      {
        heading: "2. Cookies estrictamente necesarias",
        body: "Indispensables para que el sitio funcione. Incluyen la cookie de sesión que mantiene tu inicio de sesión, el token de protección contra CSRF y el contenido de tu carrito de compras. No requieren consentimiento porque sin ellas el servicio no puede prestarse. Si las bloqueas, no podrás iniciar sesión ni completar una compra.",
      },
      {
        heading: "3. Cookies de preferencias",
        body: "Guardan tu decisión sobre el banner de cookies para no volver a mostrártelo en cada visita, y otras preferencias de navegación.",
      },
      {
        heading: "4. Cookies analíticas y publicitarias",
        body: "Solo se activan si otorgas tu consentimiento en el banner de cookies. Corresponden a Google Analytics 4 y Google Ads, y permiten medir visitas, comportamiento de navegación y efectividad de campañas. Estas herramientas son operadas por Google LLC y pueden implicar transferencia internacional de datos; consulta las políticas de privacidad de Google para más información.",
      },
      {
        heading: "5. Gestión de tu consentimiento",
        body: "Al ingresar por primera vez verás un banner donde puedes aceptar o rechazar las cookies no esenciales. Puedes cambiar tu decisión en cualquier momento borrando las cookies del sitio en tu navegador, con lo cual el banner volverá a mostrarse. Adicionalmente, todos los navegadores permiten bloquear o eliminar cookies desde su configuración de privacidad.",
      },
      {
        heading: "6. Conservación",
        body: "Las cookies de sesión se eliminan al cerrar el navegador. Las cookies persistentes (preferencias, analítica) se conservan por el plazo definido por cada herramienta y en todo caso no más allá de lo necesario para la finalidad informada.",
      },
      {
        heading: "7. Contacto",
        body: "Para dudas sobre esta política escribe a info@kliniu.com. El tratamiento de los datos personales recolectados mediante cookies se rige por nuestra Política de Tratamiento de Datos Personales.",
      },
    ],
  },
  "retracto-y-reversion": {
    title: "Derecho de Retracto y Reversión del Pago",
    summary:
      "Derechos que la Ley 1480 de 2011 (Estatuto del Consumidor) te otorga en compras a distancia: retracto dentro de los 5 días hábiles y reversión del pago en casos determinados.",
    sections: [
      {
        heading: "1. Derecho de retracto (Art. 47, Ley 1480 de 2011)",
        body: "En las ventas realizadas a distancia (internet, teléfono, catálogo) tienes derecho a retractarte dentro de los cinco (5) días hábiles siguientes a la entrega del producto, sin necesidad de justificar tu decisión.",
      },
      {
        heading: "2. Cómo ejercer el retracto",
        body: "Envía tu solicitud a info@kliniu.com indicando número de pedido, nombre completo, documento de identidad y la manifestación expresa de que deseas retractarte. Recibirás las instrucciones de devolución. El producto debe regresar nuevo, sin uso, con empaques, etiquetas, manuales y accesorios originales completos.",
      },
      {
        heading: "3. Costos y reembolso",
        body: "El costo del transporte de devolución es asumido por el consumidor, salvo que el producto presente defecto. Una vez KLINIU S.A.S. reciba y verifique el estado del producto, se devolverá el dinero pagado dentro de los treinta (30) días calendario siguientes, por el mismo medio de pago utilizado en la compra.",
      },
      {
        heading: "4. Excepciones al retracto",
        body: "Conforme a la ley, el retracto no aplica a: productos elaborados conforme a especificaciones del consumidor o claramente personalizados (por ejemplo, tampografía o marcación); productos que por su naturaleza no puedan ser devueltos o se deterioren rápidamente; productos de uso personal o sanitarios cuyo empaque de seguridad haya sido abierto; ni a servicios ya prestados en su totalidad con el consentimiento del consumidor.",
      },
      {
        heading: "5. Reversión del pago (Art. 51, Ley 1480 de 2011)",
        body: "Cuando la compra se realiza mediante medios de pago electrónicos y ocurre alguno de los siguientes eventos, puedes solicitar la reversión del pago: (i) eres objeto de fraude; (ii) la operación corresponde a una compra no solicitada; (iii) el producto adquirido no fue recibido; (iv) el producto entregado no corresponde a lo solicitado o es defectuoso.",
      },
      {
        heading: "6. Cómo solicitar la reversión",
        body: "Dentro de los cinco (5) días hábiles siguientes a que tengas conocimiento del hecho, debes presentar la queja a KLINIU S.A.S. en info@kliniu.com y, simultáneamente, solicitar la reversión ante el emisor de tu medio de pago (banco o entidad emisora de la tarjeta). Debes devolver el producto cuando aplique. Cumplidos los requisitos, la reversión se hará efectiva dentro de los quince (15) días hábiles siguientes.",
      },
      {
        heading: "7. Reversión gestionada por la pasarela",
        body: "Las operaciones pagadas mediante Wompi están sujetas a los procedimientos de contracargo y reversión de la entidad adquirente y del emisor del medio de pago, conforme a la normativa vigente. KLINIU S.A.S. atenderá dichos procesos en los términos legales.",
      },
      {
        heading: "8. Autoridad competente",
        body: "Si consideras que tus derechos como consumidor no fueron atendidos, puedes acudir a la Superintendencia de Industria y Comercio (SIC), entidad competente para conocer estas reclamaciones en Colombia.",
      },
    ],
  },
  pqrs: {
    title: "PQRS — Peticiones, Quejas, Reclamos y Sugerencias",
    summary:
      "Canal oficial de atención al consumidor de KLINIU S.A.S., con los medios habilitados, el procedimiento y los tiempos de respuesta.",
    sections: [
      {
        heading: "1. Canales habilitados",
        body: "Correo electrónico: info@kliniu.com (canal oficial para radicar PQRS).\nTeléfonos: 601 3682434 / 312 5860921\nWhatsApp comercial: disponible desde el sitio web.\nPresencial: Cra. 28 #3443, Bogotá D.C.\nHorario: lunes a viernes, 8:00 a.m. – 5:00 p.m.",
      },
      {
        heading: "2. Información que debes incluir",
        body: "Nombre completo y documento de identidad, datos de contacto (correo y teléfono), tipo de solicitud (petición, queja, reclamo o sugerencia), número de pedido o factura cuando aplique, descripción clara de los hechos y evidencia (fotos, videos, soportes) si la hay.",
      },
      {
        heading: "3. Tiempos de respuesta",
        body: "Radicación: se confirma el recibo de tu solicitud con un número de caso.\nPeticiones de información: hasta quince (15) días hábiles.\nQuejas y reclamos: hasta quince (15) días hábiles; si se requiere práctica de pruebas o evaluación técnica del producto, se informará la prórroga y su motivo.\nSolicitudes sobre datos personales: consulta diez (10) días hábiles y reclamo quince (15) días hábiles, conforme a la Ley 1581 de 2012.",
      },
      {
        heading: "4. Trámite",
        body: "1. Radicas la solicitud por cualquiera de los canales.\n2. Se asigna un número de caso y un responsable.\n3. Se evalúa el caso y, si aplica, se solicita información o evidencia adicional.\n4. Se comunica la respuesta de fondo por el mismo canal en que fue radicada, o por el que hayas indicado.",
      },
      {
        heading: "5. Reclamaciones de garantía",
        body: "Las reclamaciones asociadas a defectos de producto se tramitan conforme al Manual de Garantía de KLINIU S.A.S., que hace parte integral de esta política.",
      },
      {
        heading: "6. Segunda instancia",
        body: "Si no estás conforme con la respuesta recibida, puedes presentar tu reclamación ante la Superintendencia de Industria y Comercio (SIC), a través de sus canales oficiales de atención al consumidor.",
      },
    ],
  },
  envios: {
    title: "Envíos y Entregas",
    summary:
      "Cobertura, costos, tiempos y condiciones de entrega de los pedidos realizados en kliniu.com.",
    sections: [
      {
        heading: "1. Cobertura",
        body: "Realizamos envíos a todo el territorio nacional colombiano a través de transportadoras aliadas. Para envíos a zonas de difícil acceso o destinos internacionales, comunícate previamente con el equipo comercial.",
      },
      {
        heading: "2. Costo del envío",
        body: "Bogotá D.C.: envío gratis.\nResto del país: $12.000 COP por pedido.\nEl costo aplicable se calcula automáticamente en el checkout según la ciudad de destino y se muestra antes de confirmar el pago. Pedidos corporativos de alto volumen pueden tener condiciones de flete acordadas con el equipo comercial.",
      },
      {
        heading: "3. Tiempos de entrega",
        body: "El despacho se realiza una vez el pago es aprobado y el pedido es alistado. Los tiempos estimados de tránsito son de 1 a 3 días hábiles en Bogotá y de 3 a 8 días hábiles en el resto del país, según el destino y la transportadora. Estos plazos son estimados y pueden variar por causas ajenas a KLINIU S.A.S. (clima, orden público, contingencias del operador logístico). Los pedidos personalizados o con tampografía tienen tiempos de producción adicionales que se informan al confirmar la orden.",
      },
      {
        heading: "4. Recepción del pedido",
        body: "El pedido debe ser recibido por el destinatario o por una persona autorizada en la dirección registrada, presentando documento de identidad. Verifica el estado del empaque al momento de la entrega. Si el empaque presenta daños visibles, déjalo consignado en la guía y notifícanos dentro de las 24 horas siguientes.",
      },
      {
        heading: "5. Dirección incorrecta o entregas fallidas",
        body: "Es responsabilidad del comprador suministrar una dirección completa y correcta. Si la entrega falla por dirección errada, ausencia del destinatario o rechazo del pedido, los costos de reenvío serán asumidos por el comprador.",
      },
      {
        heading: "6. Seguimiento",
        body: "Una vez despachado el pedido, se informa por correo electrónico el número de guía y la transportadora asignada. También puedes consultar el estado de tus pedidos desde tu cuenta en el sitio.",
      },
      {
        heading: "7. Faltantes o inconsistencias",
        body: "Si detectas faltantes o productos distintos a los solicitados, notifícalo a info@kliniu.com dentro de los cinco (5) días hábiles siguientes a la entrega, adjuntando fotografías del producto y del empaque. Se dará trámite conforme a la política de PQRS y al Manual de Garantía.",
      },
    ],
  },
  "habeas-data": {
    title: "Habeas Data — Autorización y ejercicio de derechos",
    summary:
      "Procedimiento para que los titulares consulten, actualicen, rectifiquen, supriman sus datos personales o revoquen la autorización otorgada a KLINIU S.A.S., conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015.",
    sections: [
      {
        heading: "1. Responsable del tratamiento",
        body: "KLINIU S.A.S., con domicilio en Cra. 28 #3443, Bogotá D.C., Colombia. Correo para el ejercicio de derechos: info@kliniu.com. Teléfonos: 601 3682434 / 312 5860921.",
      },
      {
        heading: "2. Autorización del titular",
        body: "El tratamiento de tus datos personales requiere tu autorización previa, expresa e informada. Dicha autorización se recolecta al registrarte, al realizar una compra, al solicitar una cotización o al suscribirte a comunicaciones comerciales, mediante casilla de aceptación que remite a esta política y a la Política de Tratamiento de Datos Personales. La autorización se conserva como prueba en nuestros sistemas.",
      },
      {
        heading: "3. Derechos del titular",
        body: "Conocer, actualizar y rectificar tus datos personales.\nSolicitar prueba de la autorización otorgada.\nSer informado sobre el uso que se ha dado a tus datos.\nPresentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.\nRevocar la autorización y/o solicitar la supresión de los datos cuando no exista un deber legal o contractual que lo impida.\nAcceder de forma gratuita a tus datos personales.",
      },
      {
        heading: "4. Procedimiento de consulta",
        body: "Envía tu consulta a info@kliniu.com con el asunto \"Consulta Habeas Data\", indicando nombre completo, documento de identidad, datos de contacto y la descripción de lo que deseas conocer. La consulta se atenderá en un término máximo de diez (10) días hábiles, prorrogable hasta por cinco (5) días hábiles más, informándote los motivos de la prórroga.",
      },
      {
        heading: "5. Procedimiento de reclamo, corrección, supresión o revocatoria",
        body: "Envía tu reclamo a info@kliniu.com con el asunto \"Reclamo Habeas Data\", identificando al titular, describiendo los hechos, indicando la solicitud concreta (corrección, actualización, supresión o revocatoria) y adjuntando los documentos de soporte. Si el reclamo está incompleto, se te requerirá dentro de los cinco (5) días siguientes para subsanarlo; transcurridos dos (2) meses sin respuesta, se entenderá desistido. El reclamo se atenderá en un término máximo de quince (15) días hábiles, prorrogable por ocho (8) días hábiles más.",
      },
      {
        heading: "6. Límites a la supresión y revocatoria",
        body: "La supresión de datos o la revocatoria de la autorización no procede cuando exista un deber legal o contractual que obligue a conservar la información, por ejemplo, obligaciones tributarias, contables, de facturación o de garantía de productos.",
      },
      {
        heading: "7. Datos de menores y datos sensibles",
        body: "KLINIU S.A.S. no recolecta datos personales de menores de edad ni datos sensibles a través del sitio web. Si detectamos que se han suministrado datos de esta naturaleza, procederemos a su supresión.",
      },
      {
        heading: "8. Seguridad y conservación",
        body: "Aplicamos medidas técnicas, humanas y administrativas para proteger los datos: cifrado del tráfico, control de acceso por roles, registro de operaciones y políticas internas de confidencialidad. Los datos se conservan mientras exista la relación comercial y durante los plazos legales de conservación aplicables.",
      },
      {
        heading: "9. Reclamación ante la autoridad",
        body: "Agotado el trámite ante KLINIU S.A.S., puedes presentar queja ante la Superintendencia de Industria y Comercio, autoridad de protección de datos personales en Colombia.",
      },
    ],
  },
} as const;

type PolicySlug = keyof typeof policies;

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies[slug as PolicySlug];
  if (!policy) return {};

  return {
    title: policy.title,
    description: policy.summary,
  };
}

export default async function PoliticaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = policies[slug as PolicySlug];
  if (!policy) notFound();

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <section className="bg-[#061117] px-6 py-16 text-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#27B1B8]">
            Políticas Kliniu
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            {policy.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
            {policy.summary}
          </p>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-[980px] gap-5">
          {policy.sections.map((section) => (
            <article
              key={section.heading}
              className="rounded-2xl border border-black/8 bg-[#f8f8f7] p-6"
            >
              <h2 className="text-lg font-black text-[#0C535B]">{section.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-[#5d6167]">{section.body}</p>
            </article>
          ))}

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#27B1B8]/20 bg-[#e8f5f5] p-6">
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#0C535B]">¿Necesitas ayuda con esta política?</p>
              <p className="mt-1 text-sm text-[#3a7a80]">
                Nuestro equipo comercial puede revisar tu caso y orientarte.
              </p>
            </div>
            <Link
              href="/contacto"
              className="rounded-full bg-[#0C535B] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Contactar a Kliniu
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
