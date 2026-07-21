# Royal Affair Store - Backend API

FastAPI & PyMongo Backend Service for the **Royal Affair – Designer Suits** E-Commerce platform.

---

## 📁 Project Structure

```
royal-affair-store/
├── frontend/             # Static E-Commerce HTML, CSS, JS & Assets
│   ├── index.html
│   ├── shop.html
│   ├── product.html
│   ├── cart.html
│   ├── css/
│   ├── js/
│   └── assets/
└── backend/              # FastAPI + MongoDB Backend Application
    ├── app/
    │   ├── main.py        # FastAPI Application Entrypoint
    │   ├── config.py      # App & Environment Configuration
    │   ├── database.py    # PyMongo Database Client & Connection Setup
    │   ├── dependencies.py# Shared FastAPI Dependency Injection Helpers
    │   ├── models/        # Database Entities & PyMongo Helpers
    │   ├── schemas/       # Pydantic Request/Response Models
    │   ├── routes/        # API Endpoints (Health Check, API Routers)
    │   ├── services/      # Business Logic Services
    │   └── utils/         # Helper & Utility Functions
    ├── tests/             # Pytest Test Suites
    ├── uploads/           # User Uploaded Files Storage
    ├── requirements.txt   # Python Dependencies
    ├── .env.example       # Sample Environment Variables Configuration
    └── README.md
```

---

## 🛠️ Prerequisites

- Python 3.9+
- MongoDB (Running locally or MongoDB Atlas URI)

---

## 🚀 Getting Started

### 1. Create a Virtual Environment

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 4. Run the Backend API

```bash
uvicorn app.main:app --reload --port 8000
```

The server will start at: `http://127.0.0.1:8000`

- **Interactive API Documentation (Swagger UI):** `http://127.0.0.1:8000/docs`
- **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`
- **Health Check Endpoint:** `http://127.0.0.1:8000/health`
