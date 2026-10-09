# model Pydantic anggaran
from pydantic import BaseModel, ConfigDict, Field, StrictInt

POLA_PERIODE = r"^\d{4}-\d{2}-01$"


class AnggaranBaru(BaseModel):
    """Body POST /budgets. period_month selalu tanggal satu, sesuai batasan tabel."""

    model_config = ConfigDict(extra="forbid")

    household_id: str = Field(min_length=1)
    category_id: str = Field(min_length=1)
    period_month: str = Field(pattern=POLA_PERIODE)
    limit_amount: StrictInt = Field(ge=0)


class AnggaranUbah(BaseModel):
    """Body PATCH /budgets/{id}. Yang boleh diubah hanya batasnya."""

    model_config = ConfigDict(extra="forbid")

    limit_amount: StrictInt | None = Field(default=None, ge=0)
