from __future__ import annotations

import asyncio

from playwright.async_api import async_playwright


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://127.0.0.1:3000/patient/pat-1001", wait_until="networkidle")

        checkbox_box = await page.get_by_label("Submit order for signature").bounding_box()
        order_button_box = await page.get_by_test_id("save-order-button").bounding_box()
        note_button_box = await page.get_by_test_id("save-note-button").bounding_box()

        print("checkbox", checkbox_box)
        print("order_button", order_button_box)
        print("note_button", note_button_box)

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
