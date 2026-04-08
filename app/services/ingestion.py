import io, json, re, uuid
import pandas as pd
from django.db import connection, transaction

SAFE = re.compile(r"[^\w]+")

def sanitize_col(name: str) -> str:
    s = name.strip().lower()
    s = SAFE.sub("_", s)
    return re.sub(r"^(\d)", r"c_\1", s) or "col"

def infer_pg(series: pd.Series) -> str:
    import pandas as pd
    if pd.api.types.is_integer_dtype(series): return "BIGINT"
    if pd.api.types.is_float_dtype(series): return "DOUBLE PRECISION"
    if pd.api.types.is_bool_dtype(series): return "BOOLEAN"
    if pd.api.types.is_datetime64_any_dtype(series): return "TIMESTAMP"
    return "TEXT"

def gen_table_name(user_id: int) -> str:
    return f"ds_{user_id}_{uuid.uuid4().hex[:8]}"

def create_table_and_copy(user_id: int, filename: str, fileobj, delimiter=',', has_header=True):
    """
    Lee xlsx/csv, sanitiza columnas, crea tabla en Postgres, inserta datos por lotes
    y devuelve (table_name, meta, row_count).

    meta contiene:
      - columns: [{"name": "...", "pg_type": "..."}]
      - column_count, unique_columns_count, category_columns_count,
        numeric_columns_count, date_columns_count
      - unique_columns, category_columns, numeric_columns, date_columns (listas)
    """
    # Leer (respetando header para ambos formatos)
    name = filename.lower()
    header_option = 0 if has_header else None

    if name.endswith((".xlsx", ".xls")):
        df = pd.read_excel(fileobj, header=header_option)
    else:
        # Leer CSV con las opciones del usuario
        # Aseguramos posicion inicial por si fileobj ya fue leído por Django
        try:
            fileobj.seek(0)
        except Exception:
            pass
        df = pd.read_csv(fileobj, sep=delimiter, encoding='utf-8-sig', header=header_option)

    # Normalizar nombres de columna (sanitizar)
    df.columns = [sanitize_col(str(c)) for c in df.columns]

    # Inferir tipos por columna (para crear esquema)
    schema = [{"name": c, "pg_type": infer_pg(df[c])} for c in df.columns]

    # Crear tabla en Postgres
    table_name = gen_table_name(user_id)
    cols_def = ", ".join([f"\"{c['name']}\" {c['pg_type']}" for c in schema])
    create_sql = f'CREATE TABLE "{table_name}" (id BIGSERIAL PRIMARY KEY, {cols_def});'

    # Preparar CSV en memoria (usamos df ya sanitizado)
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False)
    csv_buf.seek(0)

    records = df.where(pd.notnull(df), None).values.tolist()
    placeholders = ", ".join(["%s"] * len(df.columns))
    cols_list = ", ".join([f"\"{c['name']}\"" for c in schema])
    insert_sql = f'INSERT INTO "{table_name}" ({cols_list}) VALUES ({placeholders})'

    with transaction.atomic():
        with connection.cursor() as cur:
            cur.execute(f'DROP TABLE IF EXISTS "{table_name}";')
            cur.execute(create_sql)

            # Inserción por lotes de 1000 filas
            batch = 1000
            for i in range(0, len(records), batch):
                cur.executemany(insert_sql, records[i:i+batch])

            cur.execute(f'SELECT COUNT(*) FROM "{table_name}";')
            row_count = cur.fetchone()[0]

    # --- Ahora calculamos métricas a partir del mismo df ---
    column_count = df.shape[1]

    # Columnas únicas: todas las filas tienen valor distinto (excluye NaN)
    unique_columns = [
        col for col in df.columns
        if df[col].nunique(dropna=True) == len(df)
    ]

    # Numéricas
    numeric_columns = df.select_dtypes(include=["number"]).columns.tolist()

    # Fechas: intentamos convertir y consideramos fecha si >=50% parseables
    date_columns = []
    for col in df.columns:
        # Skip if numeric already
        if col in numeric_columns:
            continue
        parsed = pd.to_datetime(df[col], errors="coerce")
        non_null = parsed.notna().sum()
        if len(df) > 0 and (non_null / len(df)) >= 0.5:
            date_columns.append(col)

    # Categóricas: columnas no numéricas/no-datetime con pocos valores únicos
    # (menos de 50 valores únicos => tratadas como categoría)
    non_num_non_date = [c for c in df.columns if c not in numeric_columns and c not in date_columns]
    category_columns = []
    if non_num_non_date:
        sub = df[non_num_non_date]
        nunique_series = sub.nunique(dropna=True)
        category_columns = nunique_series[nunique_series < 50].index.tolist()

    # Construir meta con listas y contadores
    meta = {
        "columns": schema,
        "column_count": int(column_count),
        "unique_columns_count": int(len(unique_columns)),
        "category_columns_count": int(len(category_columns)),
        "numeric_columns_count": int(len(numeric_columns)),
        "date_columns_count": int(len(date_columns)),
        "unique_columns": unique_columns,
        "category_columns": category_columns,
        "numeric_columns": numeric_columns,
        "date_columns": date_columns,
    }

    return table_name, meta, row_count
