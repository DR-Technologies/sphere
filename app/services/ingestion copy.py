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
    # leer
    name = filename.lower()
    if name.endswith((".xlsx", ".xls")):
        df = pd.read_excel(fileobj)
    else:
        # Leer CSV con las opciones del usuario
        header_option = 0 if has_header else None
        df = pd.read_csv(
            fileobj,
            sep=delimiter,
            encoding='utf-8-sig',
            header=header_option
        )

    # columnas y tipos
    df.columns = [sanitize_col(c) for c in df.columns]
    schema = [{"name": c, "pg_type": infer_pg(df[c])} for c in df.columns]

    table_name = gen_table_name(user_id)
    cols_def = ", ".join([f"\"{c['name']}\" {c['pg_type']}" for c in schema])
    create_sql = f"CREATE TABLE \"{table_name}\" (id BIGSERIAL PRIMARY KEY, {cols_def});"

    # CSV en memoria
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False)
    csv_buf.seek(0)

    records = df.where(pd.notnull(df), None).values.tolist()
    placeholders = ", ".join(["%s"] * len(df.columns))
    cols_list = ", ".join([f"\"{c['name']}\"" for c in schema])
    insert_sql = f"INSERT INTO \"{table_name}\" ({cols_list}) VALUES ({placeholders})"

    with transaction.atomic():
        with connection.cursor() as cur:
            cur.execute(f"DROP TABLE IF EXISTS \"{table_name}\";")
            cur.execute(create_sql)

            # Inserción por lotes de 1000 filas
            batch = 1000
            for i in range(0, len(records), batch):
                cur.executemany(insert_sql, records[i:i+batch])

            cur.execute(f"SELECT COUNT(*) FROM \"{table_name}\";")
            row_count = cur.fetchone()[0]

    meta = {"columns": schema}

    # 🔹 Leer CSV una sola vez (reutilizando fileobj)
    fileobj.seek(0)
    df = pd.read_csv(fileobj, delimiter=delimiter, header=0 if has_header else None)

    # 🔹 Detectar tipos de columnas
    column_count = df.shape[1]
    unique_columns_count = sum(df.nunique() == df.shape[0])
    numeric_columns_count = df.select_dtypes(include=["number"]).shape[1]
    date_columns_count = df.select_dtypes(include=["datetime", "datetimetz"]).shape[1]

    # Inferir categóricas (columnas no numéricas con menos de 50 valores únicos)
    category_columns_count = sum(
        (df.select_dtypes(exclude=["number", "datetime", "datetimetz"])
           .nunique() < 50)
    )

    # 🔹 Guardar métricas dentro de meta
    meta["column_count"] = int(column_count)
    meta["unique_columns_count"] = int(unique_columns_count)
    meta["category_columns_count"] = int(category_columns_count)
    meta["numeric_columns_count"] = int(numeric_columns_count)
    meta["date_columns_count"] = int(date_columns_count)

    return table_name, meta, row_count