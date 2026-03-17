import asyncio
from playwright.async_api import async_playwright
import os

async def generate_screenshots():
    async with async_playwright() as p:
        # Browser configuration for mobile
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 375, 'height': 812},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )
        page = await context.new_page()
        
        # Navigate to the dev server
        print("Navigating to http://localhost:3001...")
        await page.goto("http://localhost:3001")
        await page.wait_for_timeout(2000) # Wait for animation
        
        # 1. Camera Page
        print("Capturing Camera View...")
        await page.screenshot(path="public/screenshots/camera.png")
        
        # 2. Settings Page
        print("Capturing Settings View...")
        await page.click("#nav-settings")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="public/screenshots/settings.png")
        
        # 3. History Page
        print("Capturing History View...")
        await page.click("#nav-history")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="public/screenshots/history.png")
        
        # 4. Result Page (Simulate Upload)
        print("Capturing Result View...")
        await page.click("#nav-camera")
        sample_img = "/home/widifirmaan/.gemini/antigravity/brain/10fedbed-415c-4163-9dbb-d59a9d7adb1b/media__1773761743264.jpg"
        if os.path.exists(sample_img):
            async with page.expect_file_chooser() as fc_info:
                await page.click('label[for="file-input"]')
            file_chooser = await fc_info.value
            await file_chooser.set_files(sample_img)
            
            # Wait for "Analisis" button and click it
            await page.wait_for_selector("#btn-analyze")
            await page.click("#btn-analyze")
            
            # Wait for processing and then result view
            # Since it might take time, we'll wait for #view-result to be active
            await page.wait_for_selector("#view-result.active", timeout=30000)
            await page.wait_for_timeout(2000) # Wait for table rendering
            await page.screenshot(path="public/screenshots/result.png")
        else:
            print(f"Sample image not found at {sample_img}, skipping result screenshot.")
        
        await browser.close()
        print("Screenshots generated successfully!")

if __name__ == "__main__":
    generate_screenshots_path = "public/screenshots"
    if not os.path.exists(generate_screenshots_path):
        os.makedirs(generate_screenshots_path)
    asyncio.run(generate_screenshots())
