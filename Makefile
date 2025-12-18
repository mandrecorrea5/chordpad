.PHONY: help build up down logs seed dev-up dev-down dev-logs clean

help:
	@echo "Available commands:"
	@echo "  make build      - Build Docker images"
	@echo "  make up         - Start containers (production)"
	@echo "  make down       - Stop containers"
	@echo "  make logs       - View container logs"
	@echo "  make seed       - Seed sample data"
	@echo "  make dev-up     - Start containers (development)"
	@echo "  make dev-down   - Stop development containers"
	@echo "  make dev-logs   - View development logs"
	@echo "  make clean      - Remove containers and volumes"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

seed:
	docker-compose exec backend npm run seed

dev-up:
	docker-compose -f docker-compose.dev.yml up -d --build

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

clean:
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v

