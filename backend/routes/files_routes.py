from fastapi import APIRouter, HTTPException, Response
from storage import read_file

router = APIRouter(prefix="/api/files")


@router.get("/{path:path}")
async def download_file(path: str):
    try:
        data, content_type = read_file(path)
    except Exception:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return Response(content=data, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=86400"})
