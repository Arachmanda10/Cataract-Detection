FROM python:3.12 slim


# Hugging face menjalankan berdasarkan ID 1000
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1


WORKDIR $HOME/app

# Menyalin requirements.txt ke docker
COPY --chown=user requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=user app ./app
COPY --chown=user model ./model

EXPOSE 7860

CMD["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]

 
