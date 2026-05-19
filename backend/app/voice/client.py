"""Gemini Live client + LiveConnectConfig builder.

AI Studio direct (not Vertex AI). One config covers: voice system prompt,
audio modality, voice/VAD, single tool (query_data), transcription
streams for both directions, plus the 2.5-native-audio-only features
(proactive_audio, enable_affective_dialog) that require the v1alpha
HTTP API version.
"""

from __future__ import annotations

from google import genai
from google.genai.types import (
    AutomaticActivityDetection,
    AudioTranscriptionConfig,
    EndSensitivity,
    GoogleSearch,
    HttpOptions,
    LiveConnectConfig,
    Modality,
    PrebuiltVoiceConfig,
    ProactivityConfig,
    RealtimeInputConfig,
    SpeechConfig,
    StartSensitivity,
    Tool,
    VoiceConfig,
)

from app.logger import get_logger
from app.settings import settings
from app.voice.prompts import build_voice_system_prompt
from app.voice.tools import VOICE_FUNCTION_DECLARATIONS

log = get_logger("voice.client")

_client: genai.Client | None = None


def create_gemini_client() -> genai.Client:
    """Lazy singleton. AI Studio uses `GEMINI_API_KEY` (or `GOOGLE_API_KEY`
    as a fallback — Google's SDK treats them interchangeably). No Vertex
    args; this is AI Studio direct.

    `api_version=v1alpha` unlocks the preview-track features the
    2.5-native-audio model needs: `proactive_audio`,
    `enable_affective_dialog`, and the `NON_BLOCKING` + `scheduling`
    fields on FunctionDeclaration / FunctionResponse.
    """
    global _client
    if _client is None:
        api_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
        if not api_key:
            raise RuntimeError(
                "Neither GEMINI_API_KEY nor GOOGLE_API_KEY is set. Set one in backend/.env."
            )
        _client = genai.Client(
            api_key=api_key,
            http_options=HttpOptions(api_version="v1alpha"),
        )
        log.info(
            "Gemini client initialized",
            extra={
                "voice_model": settings.VOICE_MODEL,
                "api_version": "v1alpha",
                "key_source": "GEMINI_API_KEY" if settings.GEMINI_API_KEY else "GOOGLE_API_KEY",
            },
        )
    return _client


def build_live_connect_config() -> LiveConnectConfig:
    """Single source of truth for voice session config."""
    voice_config = VoiceConfig(
        prebuilt_voice_config=PrebuiltVoiceConfig(voice_name=settings.VOICE_NAME),
    )

    speech = SpeechConfig(voice_config=voice_config)

    vad = AutomaticActivityDetection(
        disabled=False,
        # HIGH start = triggers on quieter speech onsets (fixes "doesn't
        # pick my voice" on soft openings). LOW end = doesn't cut user
        # off mid-sentence on a brief pause.
        start_of_speech_sensitivity=StartSensitivity.START_SENSITIVITY_HIGH,
        end_of_speech_sensitivity=EndSensitivity.END_SENSITIVITY_LOW,
        # Preserve more pre-roll so the first phoneme isn't clipped.
        prefix_padding_ms=300,
        # Tighter end-of-turn so the agent replies quickly after the
        # speaker stops (1500ms felt laggy).
        silence_duration_ms=800,
    )

    realtime_input_config = RealtimeInputConfig(automatic_activity_detection=vad)

    # 2.5 native-audio-only features:
    #   proactive_audio=True lets the model judge whether ambient noise /
    #   non-utterances (background talk, "uh"s) actually want a response,
    #   reducing random babble. enable_affective_dialog matches the user's
    #   emotional tone in the reply.
    # Tools list mixes the built-in Google Search grounding (one Tool
    # wrapper, no function_declarations field) and our five voice
    # function declarations (a second Tool wrapper). Gemini decides when
    # to invoke Google Search itself — no per-call tool call is needed
    # for general-knowledge questions.
    return LiveConnectConfig(
        response_modalities=[Modality.AUDIO],
        speech_config=speech,
        system_instruction=build_voice_system_prompt(),
        tools=[
            Tool(google_search=GoogleSearch()),
            Tool(function_declarations=VOICE_FUNCTION_DECLARATIONS),
        ],
        input_audio_transcription=AudioTranscriptionConfig(),
        output_audio_transcription=AudioTranscriptionConfig(),
        realtime_input_config=realtime_input_config,
        proactivity=ProactivityConfig(proactive_audio=True),
        enable_affective_dialog=True,
    )
