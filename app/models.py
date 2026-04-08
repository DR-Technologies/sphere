from django.db import models
from django.contrib.auth.models import User

class Dataset(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    table_name = models.CharField(max_length=255, unique=True)
    original_filename = models.CharField(max_length=255)
    name = models.CharField(max_length=255, null=True, blank=True)  # 👈 NUEVO
    schema_json = models.JSONField()
    row_count = models.IntegerField(default=0)
    
    # 🔹 Nuevos campos resumen
    column_count = models.IntegerField(default=0)
    unique_columns_count = models.IntegerField(default=0)
    category_columns_count = models.IntegerField(default=0)
    numeric_columns_count = models.IntegerField(default=0)
    date_columns_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.table_name}"
    