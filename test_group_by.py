from sqlalchemy import select, func, literal_column
from sqlalchemy.sql import text
from app.db.models import SMSMessage
from sqlalchemy.dialects import postgresql

q = (
    select(
        func.date_trunc('hour', SMSMessage.created_at).label("time_bucket"),
        func.count(SMSMessage.id)
    )
    .group_by(text("time_bucket"))
)
print("TEST 1:", q.compile(dialect=postgresql.dialect()))

bucket = func.date_trunc('hour', SMSMessage.created_at).label("time_bucket")
q2 = select(bucket, func.count(SMSMessage.id)).group_by(bucket)
print("TEST 2:", q2.compile(dialect=postgresql.dialect()))

q3 = (
    select(
        func.date_trunc('hour', SMSMessage.created_at).label("time_bucket"),
        func.count(SMSMessage.id)
    )
    .group_by(literal_column("1"))
)
print("TEST 3:", q3.compile(dialect=postgresql.dialect()))
