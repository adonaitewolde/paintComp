# 🎨 RefBoard – Reference & Moodboard Tool for Artists

RefBoard is a small prototype for a **reference companion app** for artists.

It helps you import reference images, simplify them (posterize, grayscale), flip/rotate them, and organize everything into boards – so drawing from reference becomes easier and more structured.

> ⚠️ Work in progress – this is an early prototype (v0).  
> The goal is to validate the core UX and image processing pipeline before adding more features.

---

## ✨ Features (Prototype)

### Core

- 🧱 **Boards**

  - Create boards (projects) and attach multiple reference images.
  - Simple board overview page with thumbnails of all images.

- 🖼️ **Image Upload**

  - Upload images into a board via the web UI.
  - Images are stored on the server file system, metadata in the database.

- 🎚️ **Image Operations (OpenCV, server-side)**

  - **Posterize** with adjustable levels (e.g. 2–8 steps)  
    → helps to see big shapes and value blocks.
  - **Grayscale toggle**  
    → focus on values without color noise.
  - **Flip Horizontal**  
    → detect drawing mistakes and check composition.
  - **Rotate in 90° steps**  
    → fresh view on composition and shapes.

- 🧮 **Settings per image**
  - Each image can store its own settings: posterize level, grayscale on/off, flip, rotation, etc.
  - Settings are stored in the database and used when rendering the image.

---

## 🧱 Planned / Roadmap

Not all of these exist yet – they are planned features:

- 🎯 Custom grids (rows/cols, opacity, presets like rule-of-thirds)
- 🎨 Color clustering / palette extraction from references
- 📝 Notes pinned to positions on the image
- 🧩 Multiple boards, tags, and filters (moodboard-style workflow)
- 👤 User accounts & authentication
- 🖥️ Desktop app using Tauri (later), reusing the same core logic

---

## 🏗️ Tech Stack

**Frontend**

- [Expo](https://expo.dev/) with [Expo Router](https://expo.github.io/router/) (React Native)
- TypeScript
- Styling handled with React Native style objects and Expo primitives
- Communicates with the backend via REST API calls

**Backend**

- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenCV](https://opencv.org/) for image operations
- [SQLModel](https://sqlmodel.tiangolo.com/) (ORM built on SQLAlchemy)
- [Alembic](https://alembic.sqlalchemy.org/) for database migrations
- [uv](https://github.com/astral-sh/uv) for Python package management

**Database**

- Prototype: **SQLite** (simple `app.db` file)
- Later: **PostgreSQL** (drop-in replacement with minimal changes)

**Storage**

- Local filesystem for images, for example:
  - `media/boards/{board_id}/{image_id}.jpg`

---

## 🧬 High-Level Architecture

```text
[ Expo (React Native) frontend ]  <--->  [ FastAPI backend + OpenCV ]  <--->  [ SQLite/Postgres + media storage ]

        |
        |  HTTP (JSON, images)
        v
   Boards, Images, Settings, Rendered Image

	•	Frontend calls REST endpoints to:
	•	list boards
	•	create boards
	•	upload images
	•	get image metadata
	•	update image settings
	•	fetch rendered image (with transformations applied)
	•	Backend:
	•	accepts image uploads
	•	stores originals (resized/optimized) on disk
	•	stores metadata + settings in the DB
	•	renders transformed images on-the-fly via OpenCV
```

⸻

🚀 Getting Started

1. Requirements
   • Node.js (LTS)
   • Python 3.13+
   • [uv](https://github.com/astral-sh/uv) (Python package manager)
   • (Prototype) no external DB needed – SQLite is enough.

⸻

2. Backend Setup (FastAPI + OpenCV)

```bash
cd backend

# Install dependencies using uv
uv sync

# Or if you prefer to use a virtual environment:
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -e .
```

**Project Structure:**

```
backend/
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── endpoints/       # API route handlers
│   ├── models/          # SQLModel database models
│   └── services/        # Business logic (image processing, etc.)
├── pyproject.toml       # Project dependencies
└── uv.lock              # Locked dependency versions
```

**Database Setup:**

Initialize the database and run migrations:

```bash
# Create initial migration (if not exists)
alembic init alembic

# Create a new migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

Or, for the simplest setup, create tables on startup (see `app/main.py`).

**Environment Variables:**

Create `backend/.env` (optional for prototype):

```env
DATABASE_URL=sqlite:///./app.db
MEDIA_ROOT=./media
CORS_ORIGINS=http://localhost:3000
```

**Start Backend:**

```bash
# Using uv
uv run uvicorn app.main:app --reload

# Or if virtual env is activated
uvicorn app.main:app --reload
```

Backend runs at: **http://localhost:8000**

**Note:** Make sure CORS is configured in FastAPI to allow requests from the Expo dev server origins (Metro runs on `http://localhost:8081` by default; on-device testing may use your local IP).

⸻

3. Frontend Setup (Expo)

```bash
cd frontend

npm install
npm run start   # or: npx expo start

# Optional shortcuts
npm run android
npm run ios
npm run web
```

**Environment Variables:**

Create `frontend/.env.local`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

The Expo dev server runs via Metro bundler and serves native clients (iOS/Android simulators, Expo Go) or the web target.

**Project Structure:**

```
frontend/
├── app/                 # Expo Router routes (stacks, tabs, etc.)
│   ├── _layout.tsx
│   └── index.tsx
├── app-example/         # Previous scaffold moved here by reset script
├── assets/              # Images and icons used by Expo
├── package.json
├── scripts/             # Utility scripts (e.g., reset-project)
└── tsconfig.json
```

⸻

🔗 API Overview (Prototype)

Boards
• GET /boards
List boards.
• POST /boards
Create board.
Body: { "name": "Portrait Studies" }
• GET /boards/{board_id}
Get board + images.

Images
• POST /boards/{board_id}/images
Upload image (multipart form).
• GET /images/{image_id}
Get metadata.
• PATCH /images/{image_id}/settings
Update posterize, grayscale, flip, rotation.
• GET /images/{image_id}/render?...
Transform image with OpenCV and return PNG/JPEG.

Example:

GET /images/abcd/render?posterize=4&grayscale=true&flipX=true&rotation=90

⸻

🧪 Development Notes

**Database:**
• Prototype uses SQLite (`app.db` in backend directory)
• Use SQLiteStudio, DB Browser for SQLite, or TablePlus to inspect.
• Database migrations managed via Alembic

**Media Storage:**
• Images stored in `backend/media/boards/{board_id}/{image_id}.jpg`
• Create `backend/media/` directory if it doesn't exist (gitignored)
• Images should be resized on upload (e.g. max 4000px) to keep storage small.
• JPEG/WebP recommended for photos.

**Development Tools:**
• **Testing:** `pytest` (backend) - run with `uv run pytest`
• **Linting:** `ruff` (backend) - run with `uv run ruff check .`
• **Linting:** `eslint` (frontend) - run with `npm run lint`
• **Type checking:** TypeScript in frontend, Pydantic in backend

⸻

🗺️ Roadmap

Short-term:
• Custom grids (rows/cols, opacity, rule-of-thirds)
• Color palette extraction
• Notes on images
• Better viewer UI (keyboard shortcuts)

Long-term:
• User accounts
• Tags & filters
• Project import/export
• Desktop app with Tauri
• Advanced image analysis

⸻

📝 License

TBD (MIT recommended).

⸻

🤝 Contributing

This is an experimental personal project.
Issues, suggestions and PRs welcome.

⸻

💡 Vision

A modern reference and moodboard tool for artists that blends:
• the flexibility of PureRef-style boards
• with intelligent analysis tools (posterize, values, palettes, grids, notes)
• and eventually a desktop app for a seamless workflow next to any drawing software.
