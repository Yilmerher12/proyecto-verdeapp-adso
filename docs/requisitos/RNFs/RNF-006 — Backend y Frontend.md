# RNF-006 — Backend y Frontend

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-006                                                |
| **Nombre** | Backend y Frontend                                     |
| **Categoría** | Arquitectura de Software                               |
| **Prioridad** | Crítica                                                |
| **Estado** | Por implementar                                        |

---

## Requisitos

### RNF-006.1 — Arquitectura Cliente-Servidor
El sistema debe estar construido bajo un modelo de arquitectura distribuida Cliente-Servidor (distribución física y lógica), donde la interfaz de usuario se desacopla completamente de la lógica de negocio y consumo de base de datos, comunicándose a través de una API RESTful.

### RNF-006.2 — Stack de Backend
El servidor (Backend) debe desarrollarse utilizando el lenguaje **Java** junto con el framework **Spring Boot**, encargado de la lógica de negocio, seguridad (JWT), validación de DTOs y exposición de los endpoints de la API.

### RNF-006.3 — Stack de Frontend
El cliente (Frontend) debe desarrollarse utilizando la biblioteca **React**, construida y empaquetada mediante **Vite** para optimizar los tiempos de desarrollo y compilación. Adicionalmente, el código debe estar fuertemente tipado utilizando **TypeScript** para reducir errores de ejecución y mejorar la mantenibilidad.