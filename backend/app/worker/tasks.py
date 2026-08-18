from celery import Celery

app = Celery("tasks", broker="redis://localhost:6379/0")

@app.task
def separate(s3_key, target):
    print(s3_key, target)
    return 0