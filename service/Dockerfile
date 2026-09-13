# Beacon Material Service — HTTP wrapper around the document generators.
#
# Build from the repo root so the curriculum data is in the build context:
#     docker build -f service/Dockerfile -t beacon-materials .
#
# The generators read from two places, discovered at runtime relative to the
# repo root:
#     ./*_lessons_enriched.json       (73 files, ~34 MB)
#     ./app/data/*                    (curriculum DBs + 2 enriched files)
# Both are copied in, so the image is self-contained and needs no volume mount.

FROM python:3.11-slim

WORKDIR /app

# Dependencies first — they change far less often than the data or the code,
# so this layer stays cached across most rebuilds.
COPY service/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Generators + the curriculum data they read.
COPY tools/ ./tools/
COPY *_lessons_enriched.json ./
COPY *_curriculum_db_clean.json ./
COPY app/data/ ./app/data/

COPY service/ ./service/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    GENERATE_TIMEOUT=300

EXPOSE 8080

# --timeout must exceed the slowest request. A full grade of Records of Work
# takes ~28s; a whole-year set across every subject is far more, so callers
# should request one subject at a time.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", \
     "--threads", "4", "--timeout", "300", "service.main:app"]
