from __future__ import annotations

import asyncio

from playwright.async_api import async_playwright


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page()
        events: list[tuple[str, str, int] | tuple[str, str, str]] = []

        page.on(
            "response",
            lambda response: events.append((response.request.method, response.url, response.status))
            if response.request.method == "POST"
            else None,
        )
        page.on(
            "console",
            lambda message: events.append(("console", message.type, message.text)) if message.type == "error" else None,
        )

        await page.goto("http://127.0.0.1:3000/patient/pat-1001", wait_until="networkidle")
        await page.get_by_label("Note author").fill("Dr. Test User")
        await page.get_by_label("Note title").fill("Progress Note Follow-up")
        await page.get_by_label("Progress note content").fill("S\nO\nA\nP")
        await page.get_by_test_id("save-note-button").click()
        await page.wait_for_timeout(1500)

        print("events", events)
        print("url", page.url)
        print("count", await page.get_by_text("Progress Note Follow-up").count())

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
