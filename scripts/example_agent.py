from __future__ import annotations

import json

import httpx

ENV_SERVER_URL = "http://127.0.0.1:8000"


def main() -> None:
    with httpx.Client(base_url=ENV_SERVER_URL, timeout=30.0) as client:
        reset = client.post("/reset").json()
        print("Goal:", reset["observation"]["goal"])
        print("State:", json.dumps(reset["state"], indent=2))

        actions = [
            {"type": "click", "selector": "[data-testid='patient-card-pat-1001']"},
            {"type": "wait", "milliseconds": 500},
            {"type": "click", "selector": "[data-testid='activity-orders']"}
        ]

        for action in actions:
            step = client.post("/step", json=action).json()
            print("Action:", action)
            print("Reward:", step["reward"])
            print("Done:", step["done"])
            print("Progress:", step["state"]["rubric_progress"])
            print("URL:", step["observation"]["current_url"])
            print("-" * 40)


if __name__ == "__main__":
    main()
