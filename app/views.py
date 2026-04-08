from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponseBadRequest, JsonResponse
from .models import Dataset
from .services.ingestion import create_table_and_copy
from django.views.decorators.http import require_http_methods, require_GET
from django.db import connection

def home(request):
    return render(request, "home.html", {"title": "Cubo"})

from django.db.models import Q

@login_required
def datasets_list(request):
    query = request.GET.get("q", "").strip()
    sort = request.GET.get("sort", "-created_at")
    
    items = Dataset.objects.filter(owner=request.user)
    
    if query:
        items = items.filter(
            Q(name__icontains=query) | 
            Q(original_filename__icontains=query)
        )
        
    allowed_sorts = ["created_at", "-created_at", "name", "-name", "row_count", "-row_count"]
    if sort not in allowed_sorts:
        sort = "-created_at"
        
    items = items.order_by(sort)
    
    return render(request, "datasets/list.html", {
        "items": items,
        "query": query,
        "sort": sort
    })

@login_required
def dataset_delete(request, pk):
    ds = get_object_or_404(Dataset, pk=pk, owner=request.user)
    ds.delete()
    return redirect("datasets_list")

@login_required
@require_http_methods(["POST"])
def dataset_rename(request, pk):
    ds = get_object_or_404(Dataset, pk=pk, owner=request.user)

    new_name = request.POST.get("name", "").strip()
    if not new_name:
        return HttpResponseBadRequest("El nombre no puede estar vacío.")

    ds.name = new_name
    ds.save()

    return JsonResponse({"success": True, "new_name": new_name})

@login_required
@require_http_methods(["GET", "POST"])
def dataset_upload(request):

    if request.method == "GET":
        return render(request, "datasets/upload.html")


    # Obtener archivo
    f = request.FILES.get("file")
    if not f:
        return HttpResponseBadRequest("No file")

    # Validación del tipo de archivo
    allowed_ext = ["csv", "xlsx", "xls", "json"]
    ext = f.name.split(".")[-1].lower()

    if ext not in allowed_ext:
        return HttpResponseBadRequest("Tipo de archivo no permitido.")

    # Tipo de archivo (solo frontend)
    file_type = request.POST.get("file_type")

    # Opciones SOLO para CSV
    delimiter = request.POST.get("delimiter", ",") if file_type == "csv" else ","
    has_header = request.POST.get("has_header") == "on" if file_type == "csv" else True

    # Procesar archivo
    try:
        table, meta, count = create_table_and_copy(
            user_id=request.user.id,
            filename=f.name,
            fileobj=f,
            delimiter=delimiter,
            has_header=has_header
        )
    except Exception as e:
        return HttpResponseBadRequest(f"Error procesando el archivo: {str(e)}")

    # Guardar dataset
    ds = Dataset.objects.create(
        owner=request.user,
        table_name=table,
        original_filename=f.name,
        schema_json={
            "columns": meta.get("columns", []),
            "unique_columns": meta.get("unique_columns", []),
            "category_columns": meta.get("category_columns", []),
            "numeric_columns": meta.get("numeric_columns", []),
            "date_columns": meta.get("date_columns", []),
        },
        row_count=count,
        column_count=meta.get("column_count", 0),
        unique_columns_count=meta.get("unique_columns_count", 0),
        category_columns_count=meta.get("category_columns_count", 0),
        numeric_columns_count=meta.get("numeric_columns_count", 0),
        date_columns_count=meta.get("date_columns_count", 0),
    )

    return redirect("dataset_detail", pk=ds.id)


@login_required
def dataset_detail(request, pk: int):
    ds = get_object_or_404(Dataset, pk=pk, owner=request.user)

    # Normalizar schema_json: puede ser dict (nuevo) o lista (antiguo)
    schema = ds.schema_json
    if isinstance(schema, dict) and "columns" in schema:
        cols = schema["columns"]
        unique_columns_list = schema.get("unique_columns", []) or []
        category_columns_list = schema.get("category_columns", []) or []
        numeric_columns_list = schema.get("numeric_columns", []) or []
        date_columns_list = schema.get("date_columns", []) or []
    elif isinstance(schema, list):
        cols = schema
        # inferir listas mínimas a partir de los tipos en cols
        numeric_columns_list = [c["name"] for c in cols if c.get("pg_type") in ("DOUBLE PRECISION", "BIGINT")]
        date_columns_list = [c["name"] for c in cols if c.get("pg_type") == "TIMESTAMP"]
        category_columns_list = [c["name"] for c in cols if c.get("pg_type") == "TEXT"]
        unique_columns_list = []  # no podemos inferir sin los datos reales
    else:
        cols = []
        unique_columns_list = category_columns_list = numeric_columns_list = date_columns_list = []

    # nombres de columnas para charts
    cats = [c["name"] for c in cols if c.get("pg_type") == "TEXT"]
    nums = [c["name"] for c in cols if c.get("pg_type") in ("DOUBLE PRECISION", "BIGINT")]

    # si no hay métricas numéricas, ofrecer COUNT(*)
    show_count = False
    if not nums:
        show_count = True
        nums = ["__count__"]

    # contexto con contadores del modelo y con listas para los tooltips
    context = {
        "ds": ds,
        "original_filename": ds.original_filename,
        "row_count": ds.row_count,
        "column_count": ds.column_count,
        "unique_columns_count": ds.unique_columns_count,
        "category_columns_count": ds.category_columns_count,
        "numeric_columns_count": ds.numeric_columns_count,
        "date_columns_count": ds.date_columns_count,

        # listas para tooltips
        "unique_columns_list": unique_columns_list,
        "category_columns_list": category_columns_list,
        "numeric_columns_list": numeric_columns_list,
        "date_columns_list": date_columns_list,
    }

    # mergear con los datos del chart view
    context.update({
        "cats": cats,
        "nums": nums,
        "cat_default": cats[0] if cats else "",
        "num_default": nums[0] if nums else "",
        "show_count": show_count,
    })

    return render(request, "datasets/detail.html", context)


@login_required
def dataset_sample(request, pk: int):
    ds = get_object_or_404(Dataset, pk=pk, owner=request.user)
    
    try:
        page = int(request.GET.get("page", 1))
        page_size = int(request.GET.get("page_size", 10))
    except (ValueError, TypeError):
        page = 1
        page_size = 10
    
    if page < 1: page = 1
    if page_size < 1: page_size = 10
    if page_size > 100: page_size = 100
    
    offset = (page - 1) * page_size
    
    with connection.cursor() as cur:
        cur.execute(f'SELECT * FROM "{ds.table_name}" ORDER BY id ASC LIMIT %s OFFSET %s;', [page_size, offset])
        cols = [c[0] for c in cur.description]
        rows = []
        for r in cur.fetchall():
            # Convert decimal/other non-serializable types to float/str
            row = []
            for val in r:
                if val is None:
                    row.append(None)
                elif isinstance(val, (int, float, str, bool)):
                    row.append(val)
                else:
                    row.append(str(val))
            rows.append(dict(zip(cols, row)))
            
    return JsonResponse({
        "columns": cols, 
        "rows": rows,
        "total_rows": ds.row_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (ds.row_count + page_size - 1) // page_size
    })

def _allowed_col(ds, name):
    # Solo permitir columnas que existen en schema_json
    names = {c["name"] for c in ds.schema_json}
    return name in names

@login_required
@require_GET
def dataset_col_stats(request, pk: int):
    ds = get_object_or_404(Dataset, pk=pk, owner=request.user)
    col = request.GET.get("col")
    
    if not col:
        return HttpResponseBadRequest("Falta el parámetro col.")
    
    # Validar que la columna exista
    schema = ds.schema_json
    if isinstance(schema, dict) and "columns" in schema:
        cols = [c["name"] for c in schema["columns"]]
        col_type = next((c["pg_type"] for c in schema["columns"] if c["name"] == col), "TEXT")
    else:
        cols = [c["name"] for c in (schema if isinstance(schema, list) else [])]
        col_type = next((c["pg_type"] for c in schema if c["name"] == col), "TEXT") if isinstance(schema, list) else "TEXT"
        
    if col not in cols:
        return HttpResponseBadRequest("Columna no encontrada.")

    stats = {}
    with connection.cursor() as cur:
        # Nulos y Únicos (para todos)
        cur.execute(f'SELECT COUNT(*) FROM "{ds.table_name}" WHERE "{col}" IS NULL;')
        stats["nulls"] = cur.fetchone()[0]
        
        cur.execute(f'SELECT COUNT(DISTINCT "{col}") FROM "{ds.table_name}";')
        stats["uniques"] = cur.fetchone()[0]
        
        # Estadísticas numéricas
        if col_type in ("BIGINT", "DOUBLE PRECISION"):
            cur.execute(f'SELECT AVG("{col}"), MIN("{col}"), MAX("{col}") FROM "{ds.table_name}";')
            avg, min_val, max_val = cur.fetchone()
            stats["avg"] = float(avg) if avg is not None else None
            stats["min"] = float(min_val) if min_val is not None else None
            stats["max"] = float(max_val) if max_val is not None else None
        else:
            stats["avg"] = stats["min"] = stats["max"] = "N/A"

    return JsonResponse({
        "column": col,
        "type": col_type,
        "stats": stats
    })

@login_required
@require_GET
def dataset_chart_data(request, pk: int):
    from django.db import connection
    ds = get_object_or_404(Dataset, pk=pk, owner=request.user)

    cat = request.GET.get("cat")
    num = request.GET.get("num")

    # normalizar schema_json: puede ser lista (antiguo) o dict con "columns" (nuevo)
    schema = ds.schema_json
    if isinstance(schema, dict) and "columns" in schema:
        cols = schema["columns"]
    elif isinstance(schema, list):
        cols = schema
    else:
        cols = []

    # conjunto seguro de nombres de columnas
    names = {c.get("name") for c in cols}

    if not cat or not num:
        return JsonResponse({"labels": [], "values": []})

    # validar que la categoría exista; si num == "__count__" solo validamos cat
    if cat not in names:
        return JsonResponse({"labels": [], "values": []})
    if num != "__count__" and num not in names:
        return JsonResponse({"labels": [], "values": []})

    # construir SQL de forma segura con comillas dobles para identificadores
    if num == "__count__":
        sql = f'''
            SELECT "{cat}" AS k, COUNT(*)::float AS v
            FROM "{ds.table_name}"
            GROUP BY "{cat}"
            ORDER BY v DESC NULLS LAST
            LIMIT 20;
        '''
    else:
        sql = f'''
            SELECT "{cat}" AS k, SUM("{num}")::float AS v
            FROM "{ds.table_name}"
            GROUP BY "{cat}"
            ORDER BY v DESC NULLS LAST
            LIMIT 20;
        '''

    with connection.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    # convertir resultados a tipos seguros para JSON/Chart.js
        labels = []
        values = []

        import math

        for r in rows:
            k = r[0]
            v = r[1]

            # normalizar label
            if k is None:
                label = "N/A"
            else:
                try:
                    if isinstance(k, (bytes, bytearray)):
                        label = k.decode('utf-8', errors='ignore')
                    else:
                        label = str(k)
                except Exception:
                    label = str(k)

            # normalizar valor numérico
            if v is None:
                val = 0.0
            else:
                try:
                    val = float(v)
                    if math.isnan(val):   # <--- AQUÍ EL FIX CLAVE
                        val = 0.0
                except Exception:
                    val = 0.0

            labels.append(label)
            values.append(val)


    return JsonResponse({"labels": labels, "values": values})
