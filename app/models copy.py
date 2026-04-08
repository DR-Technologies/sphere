from django.db import models
from django.contrib.auth.models import User

class Dataset(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    table_name = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    schema_json = models.JSONField()
    row_count = models.IntegerField()

    # 🔹 Nuevos campos resumen
    column_count = models.IntegerField(default=0)
    unique_columns_count = models.IntegerField(default=0)
    category_columns_count = models.IntegerField(default=0)
    numeric_columns_count = models.IntegerField(default=0)
    date_columns_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_filename

