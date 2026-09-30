FROM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /src/frontend/dist ./frontend-dist
ENV PRAMAAN_HOST=0.0.0.0
EXPOSE 8000
CMD ["python", "backend/run.py"]


