#!/bin/bash
# AutoPatch-CI Codespace Bootstrap Script
# Runs automatically after the container is created via postCreateCommand.

set -e

echo ""
echo "=========================================="
echo "  AutoPatch-CI Codespace Setup"
echo "=========================================="
echo ""

# ---- Backend: Python Dependencies ----
echo "📦 [1/4] Installing backend Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet \
  fastapi uvicorn[standard] \
  pydantic pydantic-settings \
  requests httpx \
  python-dotenv \
  pytest pytest-asyncio \
  ruff mypy

echo "✅ Backend dependencies installed."

# ---- Backend: Create .env from example if not present ----
echo ""
echo "⚙️  [2/4] Setting up backend .env..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "   Created backend/.env from .env.example"
  echo "   ⚠️  Edit backend/.env to add your GEMINI_API_KEY if testing real Gemini calls."
else
  echo "   backend/.env already exists — skipping."
fi

# ---- Frontend: Node.js Dependencies ----
echo ""
echo "📦 [3/4] Installing frontend Node.js dependencies..."
cd frontend && npm install --silent
cd ..
echo "✅ Frontend dependencies installed."

# ---- Frontend: Create .env.local from example if not present ----
echo ""
echo "⚙️  [4/4] Setting up frontend .env.local..."
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "   Created frontend/.env.local from .env.example"
else
  echo "   frontend/.env.local already exists — skipping."
fi

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo ""
echo "  To start the backend:"
echo "    PYTHONPATH=backend/src uvicorn autopatch.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "  To start the frontend (in another terminal):"
echo "    cd frontend && npm run dev -- --hostname 0.0.0.0"
echo ""
echo "  To run tests:"
echo "    PYTHONPATH=backend/src python -m pytest backend/tests -v"
echo "=========================================="
