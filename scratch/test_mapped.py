from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional

class Test:
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[Optional[str]] = mapped_column()

print("Import and type usage successful.")
