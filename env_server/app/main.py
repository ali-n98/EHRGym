from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException

from .browser import BrowserSession
from .models import Action, EnvironmentState, ResetRequest, ResetResponse, StepResponse

EHR_BASE_URL = os.getenv("EHR_BASE_URL", "http://127.0.0.1:3000")
HEADLESS = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() != "false"
DEFAULT_WAIT_MS = int(os.getenv("OPENENV_DEFAULT_WAIT_MS", "350"))

browser = BrowserSession()
state = EnvironmentState(episode_id="bootstrap")
goal_text = "Open the chart and complete the assigned workflow."


async def _post_reset() -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{EHR_BASE_URL}/api/dev/reset")
        response.raise_for_status()


async def _fetch_patients() -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{EHR_BASE_URL}/api/patients")
        response.raise_for_status()
        return response.json()["patients"]


async def _fetch_patient(patient_id: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{EHR_BASE_URL}/api/patients/{patient_id}")
        response.raise_for_status()
        return response.json()["patient"]


async def _refresh_progress() -> tuple[list[str], bool]:
    if not state.patient_id:
        return [], False

    patient = await _fetch_patient(state.patient_id)
    scenario = next((item for item in patient["scenarios"] if item["id"] == state.scenario_id), None)
    encounter = next((item for item in patient["encounters"] if item["id"] == state.encounter_id), None)

    if not scenario or not encounter:
        return [], False

    completed: list[str] = []
    order_names = {order["name"] for order in encounter["orders"] if order["status"] == "SIGNED"}
    if set(scenario["requiredOrders"]).issubset(order_names):
        completed.append("required_orders")

    note_text = "\n".join(note["content"] for note in encounter["notes"])
    if all(element.lower() in note_text.lower() for element in scenario["requiredNoteElements"]):
        completed.append("required_note_elements")

    if encounter["status"] == "SIGNED":
        completed.append("encounter_signed")

    return completed, len(completed) == 3


@asynccontextmanager
async def lifespan(_: FastAPI):
    await browser.ensure_started(headless=HEADLESS)
    yield
    await browser.close()


app = FastAPI(title="EHRGym Environment Server", version="0.1.0", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/reset", response_model=ResetResponse)
async def reset(request: Optional[ResetRequest] = None) -> ResetResponse:
    global state, goal_text

    try:
        await _post_reset()
        patients = await _fetch_patients()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=f"Failed to reset EHR app: {error}") from error

    patient = next((item for item in patients if item["id"] == request.patient_id), None) if request else None
    patient = patient or patients[0]
    if not patient:
        raise HTTPException(status_code=500, detail="No synthetic patients available after reset")

    scenario = patient.get("scenario")
    encounter = patient.get("encounter")

    state = EnvironmentState(
        episode_id=str(uuid4()),
        patient_id=patient["id"],
        encounter_id=encounter["id"] if encounter else None,
        scenario_id=scenario["id"] if scenario else None,
        rubric_progress=[],
        cumulative_reward=0.0,
        step_count=0,
    )
    goal_text = scenario["objective"] if scenario else "Open the chart and complete the assigned workflow."

    await browser.reset(EHR_BASE_URL)
    observation = await browser.observe(goal=goal_text, metadata={"reset": True})
    return ResetResponse(observation=observation, state=state)


@app.post("/step", response_model=StepResponse)
async def step(action: Action) -> StepResponse:
    global state

    try:
        metadata = await browser.perform(action, default_wait_ms=DEFAULT_WAIT_MS)
    except Exception as error:  # noqa: BLE001
        metadata = {"success": False, "error": str(error), "action_type": action.type}

    state.step_count += 1
    reward = 0.02 if metadata.get("success") else -0.05

    try:
        rubric_progress, done = await _refresh_progress()
    except httpx.HTTPError as error:
        rubric_progress, done = [], False
        metadata["progress_error"] = str(error)

    if rubric_progress:
        reward += 0.1 * len(rubric_progress)

    state.rubric_progress = rubric_progress
    state.cumulative_reward += reward

    observation = await browser.observe(goal=goal_text, metadata=metadata)
    return StepResponse(
        observation=observation,
        state=state,
        reward=reward,
        done=done,
        info={"rubric_progress": rubric_progress},
    )


@app.get("/state", response_model=EnvironmentState)
async def get_state() -> EnvironmentState:
    return state
