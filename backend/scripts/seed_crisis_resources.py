"""Seed crisis hotline resources into the ContentResource table.

Usage:
    cd backend && ./.venv/Scripts/python.exe scripts/seed_crisis_resources.py

Idempotent: skips resources whose title already exists. These rows back the
``get_crisis_resources`` tool; the tool also carries the same list as an
in-code fallback when the table is empty or unreachable.
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.database import AsyncSessionLocal  # type: ignore[attr-defined]
from app.domains.mental_health.models import ContentResource

CRISIS_RESOURCES = [
    {
        "title": "SEJIWA 119ext.8",
        "type": "crisis_hotline",
        "description": "Hotline kesehatan jiwa Kementerian Kesehatan RI. Gratis, layanan 24 jam.",
        "content": "Hubungi 119, lalu tekan 8. Layanan konseling kesehatan jiwa nasional (Kemenkes RI).",
        "source": "Kemenkes RI",
        "resource_metadata": {"location": "Indonesia", "phone": "119 ext. 8"},
        "tags": ["crisis", "hotline", "kesehatan-jiwa"],
    },
    {
        "title": "112 Pusat Panggilan Darurat",
        "type": "crisis_hotline",
        "description": "Nomor darurat nasional Indonesia (kepolisian, ambulans, pemadam). Gratis, 24 jam.",
        "content": "Nomor darurat nasional untuk situasi kegawatdaruratan seketika.",
        "source": "Pemerintah RI",
        "resource_metadata": {"location": "Indonesia", "phone": "112"},
        "tags": ["crisis", "emergency"],
    },
    {
        "title": "Crisis Centre UGM",
        "type": "crisis_hotline",
        "description": "Layanan krisis Universitas Gadjah Mada untuk mahasiswa dan warga UGM.",
        "content": "Crisis Centre UGM: dukungan darurat bagi mahasiswa UGM yang mengalami krisis.",
        "source": "Universitas Gadjah Mada",
        "resource_metadata": {"location": "Yogyakarta", "phone": "0851-0111-0800"},
        "tags": ["crisis", "ugm", "hotline"],
    },
    {
        "title": "119 Gawat Darurat Medis",
        "type": "crisis_hotline",
        "description": "Layanan gawat darurat medis nasional (ambulans). Gratis, 24 jam.",
        "content": "Hubungi 119 untuk bantuan medis gawat darurat.",
        "source": "Kemenkes RI",
        "resource_metadata": {"location": "Indonesia", "phone": "119"},
        "tags": ["crisis", "medis", "emergency"],
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        added = 0
        for entry in CRISIS_RESOURCES:
            exists = (
                await session.execute(
                    select(ContentResource).where(ContentResource.title == entry["title"])
                )
            ).scalar_one_or_none()
            if exists:
                print(f"- skip (exists): {entry['title']}")
                continue
            session.add(ContentResource(**entry))
            added += 1
            print(f"+ added: {entry['title']}")
        await session.commit()
        print(f"Done. {added} crisis resources added.")


if __name__ == "__main__":
    asyncio.run(seed())
