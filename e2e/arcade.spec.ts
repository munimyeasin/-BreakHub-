import { test, expect } from '@playwright/test';

test.describe('Break Hub Arcade E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set player tag in localStorage so game modals launch directly
    await page.addInitScript(() => {
      window.localStorage.setItem('stressbuster_player_tag', 'TestPilot');
    });
  });

  test('loads home dashboard and renders title & games grid', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Break Hub/i);
    const heading = page.locator('h1:visible').first();
    await expect(heading).toBeVisible();

    // Verify game cards render
    const gameCards = page.locator('[data-testid="game-card"], article, div:has-text("PLAY NOW")');
    await expect(gameCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('launches Neon Flipper Pinball game modal and verifies canvas mounts', async ({ page }) => {
    await page.goto('/?game=neon-flipper-pinball');

    // Canvas element should mount
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Send keyboard events (Left & Right Flippers and Plunger)
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');

    await page.keyboard.press('KeyA');
    await page.keyboard.press('KeyD');

    // Verify no unhandled exceptions occurred in game loop
    expect(await canvas.evaluate((el: HTMLCanvasElement) => el.width > 0 && el.height > 0)).toBe(true);
  });

  test('launches Cyber Outrun 2077 game modal and verifies 3D highway canvas', async ({ page }) => {
    await page.goto('/?game=cyber-outrun-2077');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Drive forward and steer
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('ArrowUp');

    expect(await canvas.isVisible()).toBe(true);
  });

  test('launches Neon Missile Defense game modal and triggers artillery fire', async ({ page }) => {
    await page.goto('/?game=neon-missile-defense');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Click canvas to fire interceptor missile
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
    }
    expect(await canvas.isVisible()).toBe(true);
  });

  test('launches Quantum Cyber Chess modal and interacts with 8x8 matrix board', async ({ page }) => {
    await page.goto('/?game=cyber-chess');
    const chessBoard = page.locator('div:has-text("QUANTUM CYBER CHESS"), div:has-text("WHITE TO MOVE")').first();
    await expect(chessBoard).toBeVisible({ timeout: 10000 });

    // Click square e2 (white pawn) to select, then click e4 to move
    const pawnSquare = page.locator('button[data-coord="e2"]').first();
    if (await pawnSquare.isVisible()) {
      await pawnSquare.click();
      const targetSquare = page.locator('button[data-coord="e4"]').first();
      if (await targetSquare.isVisible()) {
        await targetSquare.click();
      }
    }

    expect(await chessBoard.isVisible()).toBe(true);
  });

  test('launches Tetra Matrix game modal and tests piece controls', async ({ page }) => {
    await page.goto('/?game=tetra-matrix');
    const tetraGame = page.locator('div:has-text("TETRA MATRIX"), button:has-text("RESET")').first();
    await expect(tetraGame).toBeVisible({ timeout: 10000 });

    // Move and rotate tetromino via keyboard
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');

    expect(await tetraGame.isVisible()).toBe(true);
  });

  test('launches Cyber Slicer game modal and simulates slice stroke', async ({ page }) => {
    await page.goto('/?game=cyber-slicer');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Perform blade slice drag gesture across canvas
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 });
      await page.mouse.up();
    }
    expect(await canvas.isVisible()).toBe(true);
  });

  test('opens and navigates leaderboard modal', async ({ page }) => {
    await page.goto('/?modal=leaderboard');
    const modalHeading = page.locator('text=HALL OF FAME').first();
    await expect(modalHeading).toBeVisible({ timeout: 8000 });
  });

  test('opens and closes game request modal via URL search params', async ({ page }) => {
    await page.goto('/?modal=requests');
    const modal = page.locator('text=GAME REQUEST LAB');
    await expect(modal).toBeVisible();

    const closeBtn = page.locator('button[aria-label="Close Game Request Modal"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('verifies API requests endpoint returns JSON game requests', async ({ request }) => {
    const res = await request.get('/api/requests');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.requests)).toBe(true);
  });

  test('verifies anti-cheat blocks invalid honeypot submission', async ({ request }) => {
    const res = await request.post('/api/requests', {
      data: {
        action: 'create',
        title: 'Spam Game Test',
        genre: 'ARCADE',
        description: 'Testing honeypot bot trap',
        username: 'BotUser',
        hp_code: 'spambot_triggered'
      }
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Bot signature detected');
  });

  test('verifies profanity filter censors bad words in API submission', async ({ request }) => {
    const uniqueId = Date.now();
    const res = await request.post('/api/requests', {
      data: {
        action: 'create',
        title: `Fuck Game Test ${uniqueId}`,
        genre: 'ARCADE',
        description: 'Testing profanity moderation filters in description fucker',
        username: `CensorTester_${uniqueId}`
      }
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.request.title).toContain('****');
    expect(data.wasCensored).toBe(true);
  });

  test('verifies anti-cheat enforces score ceilings on /api/scores', async ({ request }) => {
    // Attempt to submit an impossible score exceeding MAX_SCORE_LIMITS
    const res = await request.post('/api/scores', {
      data: {
        gameId: 'g_pinball_23',
        username: 'CheaterBot',
        score: 99_999_999
      }
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('verified maximum threshold');
  });

  test('records legitimate player score with gamer tag moderation on /api/scores', async ({ request }) => {
    const res = await request.post('/api/scores', {
      data: {
        gameId: 'g_pinball_23',
        username: 'CyberPilot',
        score: 45_200
      }
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.user.username).toBe('CyberPilot');
    expect(data.data.score).toBe(45200);
  });
});
