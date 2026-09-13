FROM python:3.13-slim

WORKDIR /srv

COPY apps/parser/requirements.txt ./parser-requirements.txt
RUN pip install --no-cache-dir -r parser-requirements.txt

COPY apps/parser/app/ ./app/
COPY packages/schema/ ./packages/schema/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]