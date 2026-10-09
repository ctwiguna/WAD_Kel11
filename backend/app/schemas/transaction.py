# model Pydantic transaksi
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt

JenisTransaksi = Literal["expense", "income", "transfer"]
POLA_TANGGAL = r"^\d{4}-\d{2}-\d{2}$"


class TransaksiBaru(BaseModel):
    """Body POST /transactions. created_by dan deleted_at diisi backend."""

    model_config = ConfigDict(extra="forbid")

    household_id: str = Field(min_length=1)
    account_id: str = Field(min_length=1)
    to_account_id: str | None = None
    category_id: str | None = None
    member_id: str = Field(min_length=1)
    type: JenisTransaksi
    amount: StrictInt = Field(gt=0)
    txn_date: str = Field(pattern=POLA_TANGGAL)
    merchant: str | None = Field(default=None, max_length=140)
    notes: str | None = None


class TransaksiUbah(BaseModel):
    """Body PATCH /transactions/{id}. household_id dan created_by tidak boleh diganti."""

    model_config = ConfigDict(extra="forbid")

    account_id: str | None = None
    to_account_id: str | None = None
    category_id: str | None = None
    member_id: str | None = None
    type: JenisTransaksi | None = None
    amount: StrictInt | None = Field(default=None, gt=0)
    txn_date: str | None = Field(default=None, pattern=POLA_TANGGAL)
    merchant: str | None = Field(default=None, max_length=140)
    notes: str | None = None
