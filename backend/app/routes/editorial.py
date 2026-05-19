"""POST /api/editorial — generate magazine-style briefing from a conversation.

Thin HTTP wrapper around app.services.editorial_pipeline. The pipeline
is shared with the voice tool (app.voice.tools.execute_generate_editorial).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.logger import get_logger
from app.models import EditorialRequest, EditorialResponse
from app.services.editorial_pipeline import generate_editorial_for_conversation

log = get_logger("routes.editorial")
router = APIRouter()


@router.post("/editorial", response_model=EditorialResponse)
async def editorial(req: EditorialRequest, request: Request) -> EditorialResponse:
    request_id: str = request.state.request_id
    result = await generate_editorial_for_conversation(
        req.conversation_id,
        request_id=request_id,
    )

    if result.status == "needs_more_charts":
        raise HTTPException(
            status_code=400,
            detail={
                "error": "needs_more_charts",
                "message": "Run at least 2 queries before generating a report.",
                "chart_count": result.chart_count,
            },
        )

    if result.status == "declined":
        raise HTTPException(status_code=400, detail=result.declined_payload)

    if result.status == "error":
        log.error(
            "Editorial pipeline error surfaced to HTTP",
            extra={"request_id": request_id, "error": result.error},
        )
        raise HTTPException(
            status_code=500,
            detail={"error": "generation_failed", "message": result.error},
        )

    assert result.editorial is not None  # status == "ok"
    return result.editorial
