from django.contrib import admin
from django.urls import path, include
from app import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),  # ← rutas de login Google
    path("", views.home, name="home"),

    path("datasets/", views.datasets_list, name="datasets_list"),
    path("datasets/<int:pk>/delete/", views.dataset_delete, name="dataset_delete"),
    path("datasets/upload/", views.dataset_upload, name="dataset_upload"),
    path("datasets/<int:pk>/", views.dataset_detail, name="dataset_detail"),
    path("datasets/<int:pk>/sample/", views.dataset_sample, name="dataset_sample"),
    path("datasets/<int:pk>/chart-data/", views.dataset_chart_data, name="dataset_chart_data"),
    path("datasets/<int:pk>/stats/", views.dataset_col_stats, name="dataset_col_stats"),
    path("datasets/<int:pk>/rename/", views.dataset_rename, name="dataset_rename"),
]
