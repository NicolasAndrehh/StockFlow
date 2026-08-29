# StockFlow 📊

**Centralized Operational Management and Multi-Site Inventory Control System**

## 📌 About The Project
StockFlow is a transactional software architecture designed to optimize order taking, billing, and inventory auditing in multi-location businesses. Developed for the Algorithm Design course at Corporación Universitaria Minuto de Dios, the system abstracts the complexity of a real environment to focus purely on algorithmic concurrency, low latency, and strict operational state control. 

Following the strict non-functional requirements of the project, the application's front-end is developed entirely in English.

## 🚀 Key Features
*   **Centralized Architecture:** Transactional management of three independent locations centralized under a single administration core.
*   **Algorithmic State Machine:** Strict control of the life cycle of tables (Occupied/Free) and orders (Open/Closed).
*   **Role-Based Access Control (RBAC):** Mutually exclusive permissions for Administrator, Cashier, and Waiter roles.
*   **Low Transactional Friction:** Sequential 4-step order-taking flow, algorithmically designed to guarantee response times under 2 seconds.
*   **Auditing and Traceability:** Generation of transactional reports with date filters and Excel export capabilities.

## 🛠️ Tech Stack

**Frontend (UI & Interaction)**
*   **Core Library:** React
*   **Language:** TypeScript (Strict typing for enterprise-level structure)
*   **Bundler:** Vite
*   **Styling:** Material-UI (MUI) / Tailwind CSS

**Backend (Business Logic & Algorithms)**
*   **Framework:** .NET Core (Web API)
*   **Language:** C#
*   **Architecture:** Layered separation (Controllers, Services, Models)

**Database (Storage & Concurrency)**
*   **Engine:** MySQL
*   **ORM:** Entity Framework Core
*   **Driver:** Pomelo.EntityFrameworkCore.MySql

**Security & Performance**
*   **Session Management:** Automatic session timeout after 3 minutes of inactivity.
*   **Standards:** Full compliance with OWASP guidelines.
