import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

function loadEnvLocal(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function waitForStripeFrames(page, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stripeFrames = page.frames().filter((frame) => frame.url().includes("js.stripe.com"));
    if (stripeFrames.length > 0) {
      return stripeFrames;
    }
    await page.waitForTimeout(400);
  }
  throw new Error("Timed out waiting for Stripe iframes.");
}

async function expandCardPanel(frames) {
  for (const frame of frames) {
    try {
      const cardText = frame.locator("text=/^Card$/i").first();
      if ((await cardText.count()) > 0) {
        await cardText.click({ timeout: 1000 });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return;
      }
    } catch {
      // continue searching
    }
  }
}

async function addOneItemToCart(context, baseUrl, storeSlug) {
  const productsRes = await context.request.get(
    `${baseUrl}/api/products?store_slug=${encodeURIComponent(storeSlug)}&per_page=1&locale=en`,
  );
  if (!productsRes.ok()) {
    throw new Error(`Failed to fetch products for cart seeding: ${productsRes.status()}`);
  }
  const productsJson = await productsRes.json();
  const productId = productsJson?.products?.[0]?.id;
  if (!productId) {
    throw new Error("No product available to seed cart.");
  }

  const addRes = await context.request.post(`${baseUrl}/api/cart`, {
    data: {
      store_slug: storeSlug,
      product_id: productId,
      quantity: 1,
    },
  });
  if (!addRes.ok()) {
    throw new Error(`Failed to add product to cart: ${addRes.status()}`);
  }
}

async function prepareCheckout(page, baseUrl) {
  await page.goto(`${baseUrl}/en/checkout`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Continue as guest/i }).click({ timeout: 15000 });

  await page.getByPlaceholder("Email").fill("link-e2e@example.com");
  await page.getByPlaceholder("Full name").fill("Link E2E");
  await page.getByPlaceholder("Address line 1").fill("1 Market St");
  await page.getByPlaceholder("City").fill("San Francisco");
  await page.getByPlaceholder("State").fill("CA");
  await page.getByPlaceholder("Postal code").fill("94105");

  await page.getByRole("button", { name: /Place order/i }).click();
  await page.getByRole("button", { name: /Pay now/i }).waitFor({ timeout: 20000 });
}

async function captureStripeState(page) {
  const stripeFrames = page.frames().filter((frame) => frame.url().includes("js.stripe.com"));
  const perFrame = [];

  for (const frame of stripeFrames) {
    try {
      const data = await frame.evaluate(() => {
        const text = document.body?.innerText || "";
        const inputs = Array.from(document.querySelectorAll("input")).map((input) => ({
          type: input.type || "",
          name: input.getAttribute("name") || "",
          placeholder: input.getAttribute("placeholder") || "",
          autocomplete: input.getAttribute("autocomplete") || "",
          value: input.value || "",
        }));
        return {
          text,
          inputs,
        };
      });
      perFrame.push({
        url: frame.url(),
        ...data,
      });
    } catch {
      perFrame.push({
        url: frame.url(),
        text: "",
        inputs: [],
      });
    }
  }

  const allText = perFrame.map((item) => item.text).join("\n");
  const allInputs = perFrame.flatMap((item) => item.inputs);
  const linkMentions = {
    hasLinkPhrase: /Secure,\s*fast checkout with Link/i.test(allText),
    hasSaveInfoPhrase: /Save my information for faster checkout/i.test(allText),
    hasOtpPhrase: /verification code|one-time passcode|code/i.test(allText),
  };

  return {
    frame_count: stripeFrames.length,
    linkMentions,
    inputs: allInputs,
    textSnippet: allText.slice(0, 12000),
    frame_urls: stripeFrames.map((f) => f.url()),
  };
}

async function fillFirstMatching(frames, selector, value) {
  for (const frame of frames) {
    try {
      const locator = frame.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.fill(value);
        return true;
      }
    } catch {
      // continue searching in other stripe frames
    }
  }
  return false;
}

async function fillCardAndLinkIfPresent(frames) {
  await fillFirstMatching(
    frames,
    'input[type="email"], input[autocomplete="email"], input[name="search-linkEmail"], input[placeholder*="you@example.com"]',
    "link-e2e@example.com",
  );
  await fillFirstMatching(
    frames,
    'input[type="tel"], input[autocomplete="tel"], input[autocomplete="mobile tel"], input[name="linkMobilePhone"], input[placeholder*="(201)"]',
    "+12125550111",
  );
  await fillFirstMatching(frames, 'input[autocomplete="cc-number"], input[placeholder*="1234"], input[name*="cardnumber"]', "4242424242424242");
  await fillFirstMatching(frames, 'input[autocomplete="cc-exp"], input[placeholder*="MM"], input[name*="exp"]', "1234");
  await fillFirstMatching(frames, 'input[autocomplete="cc-csc"], input[placeholder*="CVC"], input[name*="cvc"]', "123");
  await fillFirstMatching(frames, 'input[autocomplete="postal-code"], input[placeholder*="ZIP"], input[name*="postal"]', "94105");
  // Stripe Link sandbox OTP docs: any 6 digits except 000001/000002/000003 should succeed.
  await fillFirstMatching(frames, 'input[autocomplete="one-time-code"], input[name*="code"], input[placeholder*="code"]', "123456");
}

function detectAutofillOnAttempt2(attempt2State) {
  const linkInputWithValue = attempt2State.inputs.find(
    (i) => /email|tel|card|postal|cc-/.test(`${i.type} ${i.name} ${i.autocomplete}`.toLowerCase()) && i.value.trim().length > 0,
  );
  return Boolean(linkInputWithValue);
}

async function run() {
  const projectRoot = process.cwd();
  const env = loadEnvLocal(path.join(projectRoot, ".env.local"));
  const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  const storeSlug = env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
  const artifactsDir = path.join(projectRoot, "tmp", "playwright-link-e2e");
  fs.mkdirSync(artifactsDir, { recursive: true });

  const headless = process.env.PW_HEADLESS !== "0";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
  const page = await context.newPage();

  try {
    // Attempt 1
    await addOneItemToCart(context, baseUrl, storeSlug);
    await prepareCheckout(page, baseUrl);
    const stripeFrames1 = await waitForStripeFrames(page);
    await expandCardPanel(stripeFrames1);
    await page.waitForTimeout(1500);
    const attempt1Before = await captureStripeState(page);
    await fillCardAndLinkIfPresent(stripeFrames1);
    await page.screenshot({ path: path.join(artifactsDir, "attempt1.png"), fullPage: true });
    await page.getByRole("button", { name: /Pay now/i }).click();
    await page.waitForTimeout(5000);
    const attempt1After = await captureStripeState(page);

    // Attempt 2 (same browser context)
    await addOneItemToCart(context, baseUrl, storeSlug);
    await prepareCheckout(page, baseUrl);
    const stripeFrames2 = await waitForStripeFrames(page);
    await expandCardPanel(stripeFrames2);
    await page.waitForTimeout(1500);
    const attempt2 = await captureStripeState(page);
    await page.screenshot({ path: path.join(artifactsDir, "attempt2.png"), fullPage: true });

    const autofillDetected = detectAutofillOnAttempt2(attempt2);
    const verdict = autofillDetected ? "YES" : "NO";

    const report = {
      verdict,
      basis: {
        attempt1_has_link_phrase: attempt1Before.linkMentions.hasLinkPhrase || attempt1After.linkMentions.hasLinkPhrase,
        attempt1_has_save_info_phrase: attempt1Before.linkMentions.hasSaveInfoPhrase || attempt1After.linkMentions.hasSaveInfoPhrase,
        attempt2_has_link_phrase: attempt2.linkMentions.hasLinkPhrase,
        attempt2_has_save_info_phrase: attempt2.linkMentions.hasSaveInfoPhrase,
        attempt2_any_prefilled_sensitive_field: autofillDetected,
      },
      evidence: {
        attempt1_sample_inputs: attempt1Before.inputs.slice(0, 20),
        attempt1_after_pay_sample_inputs: attempt1After.inputs.slice(0, 20),
        attempt2_sample_inputs: attempt2.inputs.slice(0, 20),
      },
      artifacts_dir: artifactsDir,
      note: autofillDetected
        ? "Observed pre-filled Link/card-related input values on second attempt."
        : "No pre-filled Link/card-related input values observed on second attempt.",
    };

    fs.writeFileSync(path.join(artifactsDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        verdict: "INCONCLUSIVE",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
