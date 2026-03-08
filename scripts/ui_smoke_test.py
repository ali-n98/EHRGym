from __future__ import annotations

import asyncio
from time import time

from playwright.async_api import async_playwright


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page()
        messages: list[str] = []

        page.on("pageerror", lambda error: messages.append(f"PAGEERROR: {error}"))
        page.on(
            "console",
            lambda message: messages.append(f"CONSOLE {message.type}: {message.text}") if message.type == "error" else None,
        )

        suffix = str(int(time()))
        note_title = f"Progress Note Follow-up {suffix}"
        order_name = f"Normal saline bolus {suffix}"

        await page.goto("http://127.0.0.1:3000/patient/pat-1001", wait_until="networkidle")
        print("loaded", page.url)

        await page.get_by_test_id("chart-tab-labs").click()
        print("labs_tab_active", await page.get_by_test_id("chart-tab-labs").get_attribute("aria-selected"))
        await page.get_by_test_id("chart-tab-notes").click()
        print("chart_notes_tab_active", await page.get_by_test_id("chart-tab-notes").get_attribute("aria-selected"))
        await page.get_by_test_id("activity-orders").click()
        await page.wait_for_timeout(150)
        print("hash_after_orders_nav", await page.evaluate("window.location.hash"))

        await page.get_by_label("Note author").fill("Dr. Test User")
        await page.get_by_label("Note title").fill(note_title)
        await page.get_by_label("Progress note content").fill(
            "S: feels better\nO: creatinine trend reviewed\nA: volume depletion with AKI\nP: repeat BMP and volume assessment"
        )
        await page.get_by_test_id("save-note-button").click()
        await page.locator("article.note-row", has_text=note_title).last.wait_for(timeout=5000)
        print("has_new_note", await page.locator("article.note-row", has_text=note_title).count())

        await page.get_by_label("Order name").fill(order_name)
        await page.get_by_label("Order category").select_option("MED")
        await page.get_by_label("Order parameters").fill("1 L IV once")
        await page.get_by_label("Order rationale").fill("Volume repletion for AKI")
        await page.get_by_label("Submit order for signature").check()
        await page.get_by_test_id("save-order-button").click()
        await page.locator("article.order-row", has_text=order_name).first.wait_for(timeout=5000)
        print("has_new_order", await page.locator("article.order-row", has_text=order_name).count())

        new_order_row = page.locator("article.order-row", has_text=order_name).first
        sign_buttons = new_order_row.locator('[data-testid^="sign-order-"]')
        print("sign_buttons", await sign_buttons.count())
        if await sign_buttons.count() > 0:
            await sign_buttons.first.click()
            await new_order_row.get_by_text("SIGNED").wait_for(timeout=5000)
            print("signed_clicked", True)

        await page.get_by_test_id("sign-encounter-button").click()
        await page.locator('[data-testid="patient-banner"] .status-pill').get_by_text("SIGNED").wait_for(timeout=5000)
        print("encounter_status", await page.locator('[data-testid="patient-banner"] .status-pill').inner_text())

        if messages:
            for message in messages:
                print(message)

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
