#!/bin/bash
# AutoPatch-CI Codespace Bootstrap Script

echo ""
echo "=========================================="
echo "  🚀 AutoPatch-CI Codespace Setup"
echo "=========================================="
echo ""

# ---- Backend: Python Dependencies ----
echo "📦 [1/4] Installing backend Python dependencies..."
python3 -m pip install --upgrade pip || true
python3 -m pip install \
  fastapi "uvicorn[standard]" \
  pydantic pydantic-settings \
  requests httpx \
  python-dotenv \
  pytest pytest-asyncio \
  ruff mypy || pip install fastapi "uvicorn[standard]" pydantic pydantic-settings requests httpx python-dotenv pytest pytest-asyncio ruff mypy

echo "✅ Backend dependencies installed."

# ---- Backend: Create .env from example if not present ----
echo ""
echo "⚙️  [2/4] Setting up backend .env..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "   Created backend/.env from .env.example"
else
  echo "   backend/.env already exists — skipping."
fi

# ---- Frontend: Node.js Dependencies ----
echo ""
echo "📦 [3/4] Installing frontend Node.js dependencies..."
if [ -d "frontend" ]; then
  cd frontend
  npm install
  cd ..
  echo "✅ Frontend dependencies installed."
fi

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
echo "=========================================="
