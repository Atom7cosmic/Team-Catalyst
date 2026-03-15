dev:
	docker compose -f docker-compose.dev.yml up -d

dev-build:
	docker compose -f docker-compose.dev.yml up --build -d

down:
	docker compose -f docker-compose.dev.yml down

restart-backend:
	docker compose -f docker-compose.dev.yml restart backend

restart-frontend:
	docker compose -f docker-compose.dev.yml restart frontend

logs:
	docker compose -f docker-compose.dev.yml logs -f

rebuild:
	docker compose -f docker-compose.dev.yml build --no-cache

clean:
	docker compose -f docker-compose.dev.yml down -v