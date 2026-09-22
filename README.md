# 🛒 Canal Marketplace Multicanal

> **Taller de Software Web — Grupo 1 (G1)**  
> Plataforma e-commerce multicanal orientada a microservicios desarrollada bajo la metodología **Spec-Driven Development (SDD)**.

---

## 👥 Integrantes del Equipo

A continuación se detalla el equipo de desarrollo, roles y responsabilidades técnicas asignadas en el proyecto:

| # | Integrante | Rol Principal | Módulo / SPEC Asignado |
| :-: | :--- | :--- | :--- |
| 1 | **Espinoza Picón, Diego Steven Martin** | 🧭 Jefe de Proyecto / QA | [`SPEC-06`: Seguimiento e Historial de Pedidos](./SPECS/SPEC-06-EP-SHP-Seguimiento-y-Pedidos.md) |
| 2 | **Garcia Lescano, Leonidas** | 🏛️ Arquitecto de Software | [`SPEC-02`: Vitrina y Exploración del Catálogo](./SPECS/SPEC-02-EP-VEC-Vitrina-y-Exploracion-Catalogo.md) |
| 3 | **Luque Mestanza, Jorge Alonso** | ⚙️ Backend Developer | [`SPEC-08`: Gestión de Favoritos y Lista de Deseos](./SPECS/SPEC-08-EP-FAV-Gestion-de-Favoritos.md) |
| 4 | **Macchiavelo Perez, Giuliano** | 🎨 Diseñador UX/UI & Frontend | [`SPEC-05`: Transacción y Realización de Checkout](./SPECS/SPEC-05-EP-TRX-Checkout-y-Pago.md) |
| 5 | **Malca Agüero, Sebastían Matías** | 📝 Documentador & Frontend | [`SPEC-04`: Carrito de Compras](./SPECS/SPEC-04-EP-ITC-Carrito-y-Favoritos.md) |
| 6 | **Morales Usca, Andres Fernando** | 🔒 DevOps & Seguridad | [`SPEC-01`: Gestión de Accesos del Cliente](./SPECS/SPEC-01-EP-GAC-Gestion-de-Accesos.md) |
| 7 | **Saire Tello, Fernando Jose** | ☁️ QA & Cloud Specialist | [`SPEC-07`: Sistema de Notificaciones](./SPECS/SPEC-07-EP-SNT-Sistema-de-Notificaciones.md) |
| 8 | **Segovia Valencia, Jim Bryan Jordan** | 📋 Product Owner | [`SPEC-03`: Detalle y Disponibilidad de Producto](./SPECS/SPEC-03-EP-DDP-Detalle-y-Disponibilidad-Producto.md) |

---

## 📖 Descripción del Proyecto

El **Canal Marketplace Multicanal** es la interfaz digital y capa de orquestación de comercio electrónico que conecta a clientes finales con el ecosistema de microservicios de la organización (Seguridad, Catálogo de Productos, Ventas, Despacho y Notificaciones).

### Objetivos Clave
- **Experiencia de Usuario Fluida:** Vitrina de productos reactiva, navegación ágil, checkout intuitivo y gestión de lista de deseos.
- **Arquitectura Desacoplada:** Comunicación con servicios externos a través de contratos REST estrictamente tipados y adaptadores de integración (Capa D).
- **Persistencia Aislada:** Cero acceso cruzado a bases de datos ajenas; persistencia local autónoma para sesiones efímeras (carrito y deseos).
- **Garantía de Calidad:** Especificaciones técnicas rigurosas (SDD) acompañadas de escenarios de prueba BDD en formato Gherkin.

---
