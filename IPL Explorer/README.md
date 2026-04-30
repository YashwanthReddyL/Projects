# IPL Explorer

Ball-by-ball IPL cricket analytics platform.

## Stack
- **Backend**: FastAPI + pandas (in-memory data store)
- **Frontend**: React + Vite + Chart.js
- **Pipeline**: Python YAML→CSV converter + index builder
- **Deploy**: EC2 + Nginx + Gunicorn + systemd

## Quick Start

### 1. Get Cricsheet data
Download IPL YAML files from https://cricsheet.org/downloads/ipl.zip  
Extract to `data/raw/`

### 2. Run the pipeline
```bash
./pipeline/run_pipeline.sh
```

### 3. Start the backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # add your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

### 4. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure
```
ipl-explorer/
├── backend/
│   ├── main.py                   # FastAPI app entry point
│   ├── models/schemas.py         # Pydantic models
│   ├── routers/                  # matches, players, deliveries, analytics
│   ├── services/
│   │   ├── data_loader.py        # Singleton DataStore
│   │   └── stats_engine.py       # All stat computation logic
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx               # Root — 3 tabs: Dashboard, Players, Analytics
│       ├── api/client.ts         # All API calls + TypeScript types
│       ├── apps/
│       │   ├── dashboard/        # Match picker, charts, scorecard, phases, partnerships
│       │   ├── players/          # Player search, stats card, season charts
│       │   └── analytics/        # Leaderboard, H2H, venues
│       └── hooks/                # React Query hooks
├── pipeline/
│   ├── ipl_yaml_to_csv.py       # YAML → matches.csv + deliveries.csv
│   ├── build_indexes.py          # Builds player/season/team JSON indexes
│   ├── validate.py               # Sanity checks on processed data
│   ├── team_names.py             # Canonical team name map
│   └── run_pipeline.sh           # One-command: convert + index + validate
├── tests/
│   ├── test_pipeline.py
│   ├── test_stats_engine.py
│   └── test_api.py
└── deploy/
    ├── setup_ec2.sh              # One-time EC2 setup
    ├── deploy.sh                 # Laptop → EC2 deploy script
    ├── nginx.conf                # Nginx site config
    └── ipl-backend.service       # systemd unit
```

## Running Tests
```bash
cd backend
pytest ../tests/test_stats_engine.py -v   # unit tests (no data needed)
pytest ../tests/test_pipeline.py -v       # pipeline tests (needs data/raw)
pytest ../tests/test_api.py -v            # integration (needs running backend data)
```

## EC2 Deployment
```bash
# 1. Launch Ubuntu 22.04 t3.medium on AWS, note the public IP
# 2. One-time setup on the instance
ssh -i your-key.pem ubuntu@<EC2_IP> "bash -s" < deploy/setup_ec2.sh

# 3. Deploy from your laptop
./deploy/deploy.sh --host <EC2_IP> --key ~/.ssh/your-key.pem
```
