# 🎵 Trackify

> Separate audio sources from your music for your ideal backing track.

![Status](https://img.shields.io/badge/status-in%20progress-yellow)
![Deployment](https://img.shields.io/badge/deployed-not%20yet-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

Trackify lets you upload a song and split it into its individual audio sources (such as vocals, drums, bass, and other instruments), so you can mute what you don't need and keep what you do, perfect for practicing along with a custom backing track.

---

## Project Status

**Trackify is a work in progress and has not been deployed yet.**

- Features are incomplete and may change or break without notice.
- There is no live demo or hosted version at this time.
- For now, the only way to try it is to run it locally by following the instructions below.

---

## Features

- [x] Separate a song into individual audio sources
- [x] Choose which sources to keep or remove
- [x] Preview the result in the browser
- [x] Download the final backing track
- [ ] Public deployment

---

## Project Structure

```
Trackify/
├── backend/     # API and audio separation logic
├── frontend/    # Web user interface
├── LICENSE
└── README.md
```

---

## Prerequisites

Make sure you have the following installed:

- [Git](https://git-scm.com/)
- [Python 3.10+](https://www.python.org/downloads/) (backend)
- [Node.js 18+](https://nodejs.org/) and npm (frontend)
- [FFmpeg](https://ffmpeg.org/download.html) (required for reading and writing audio files)

> **Note:** Audio separation is resource-intensive. A machine with at least 8 GB of RAM is recommended, and a GPU will make processing significantly faster.

---

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/coqeks/Trackify.git
cd Trackify
```

### 2. Start the backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# macOS / Linux
source venv/bin/activate
# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

The backend should now be running at `http://localhost:8000`.

### 3. Start the frontend

Open a **second terminal** and run:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend should now be running at `http://localhost:5173`. Open it in your browser.

### 4. Use it

1. Make sure both the backend and frontend are running.
2. Open the frontend URL in your browser.
3. Upload a song and choose which sources to separate.

---

## Configuration

If the app needs environment variables, create a `.env` file inside the relevant folder (`backend/` or `frontend/`). Never commit `.env` files to the repository.

| Variable | Where | Description | Example |
| --- | --- | --- | --- |
| `VITE_API_URL` | frontend | URL of the backend API | `http://localhost:8000` |

---

## Troubleshooting

- **`ffmpeg` not found:** install FFmpeg and make sure it is on your system `PATH`.
- **Frontend can't reach the backend:** confirm the backend is running and that the API URL and CORS settings allow requests from the frontend's address.
- **Processing is very slow:** separation runs on CPU by default. Use a machine with a supported GPU, or try shorter audio files.

---

## Roadmap

- [x] Finish core separation workflow
- [ ] Improve the user interface
- [ ] Deploy publicly

---

## Contributing

This project is still in early development. Suggestions and issues are welcome; please open an issue before submitting a pull request.

---

## License

This project is licensed under the [MIT License](LICENSE).
