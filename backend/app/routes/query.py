"""POST /api/query — natural language to chart spec.

Thin HTTP wrapper around app.services.chart_pipeline. The pipeline is
shared with the voice tool (app.voice.tools.execute_query_data).
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.conversation import get_store
from app.logger import get_logger
from app.models import QueryMetadata, QueryRequest, QueryResponse
from app.services.chart_pipeline import generate_chart_for_question

log = get_logger("routes.query")
router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest, request: Request) -> QueryResponse:
    request_id: str = request.state.request_id
    result = await generate_chart_for_question(
        req.question,
        conversation_id=req.conversation_id,
        request_id=request_id,
    )

    return QueryResponse(
        spec=result.spec,
        data=result.data,
        panel_data=result.panel_data,
        explanation=result.explanation,
        follow_up_hint=result.follow_up_hint,
        clarification_question=result.clarification_question,
        metadata=QueryMetadata(
            latency_ms=result.latency_ms,
            token_cost=result.token_cost,
            sql_retries=result.sql_retries,
            conversation_id=result.conversation_id,
            request_id=result.request_id,
            chart_id=result.chart_id,
        ),
    )


@router.post("/conversations/{conversation_id}/reset")
async def reset_conversation(conversation_id: str, request: Request) -> dict[str, str]:
    """Drop a conversation's history. Idempotent: silently succeeds if absent."""
    request_id: str = getattr(request.state, "request_id", "unknown")
    get_store().reset(conversation_id)
    log.info(
        "Conversation reset via API",
        extra={"request_id": request_id, "conversation_id": conversation_id},
    )
    return {"status": "reset", "conversation_id": conversation_id}
