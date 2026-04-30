.PHONY: pipeline backend frontend test lint

pipeline:
	./pipeline/run_pipeline.sh

backend:
	cd backend && uvicorn main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test-unit:
	cd backend && pytest ../tests/test_stats_engine.py -v

test-pipeline:
	cd backend && pytest ../tests/test_pipeline.py -v

test-api:
	cd backend && pytest ../tests/test_api.py -v

test: test-unit test-pipeline

install-backend:
	pip install -r backend/requirements.txt

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend

build-frontend:
	cd frontend && npm run build
