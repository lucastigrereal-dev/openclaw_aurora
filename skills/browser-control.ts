// Browser Control Skills - Puppeteer-based browser automation
// Skills: browser.open, browser.click, browser.type, browser.screenshot, browser.extract, browser.pdf, browser.wait, browser.close

import { SkillBase, SkillResult } from './skill-base';

let puppeteer: any = null;
let browser: any = null;
let pages: Map<string, any> = new Map();

async function ensurePuppeteer() {
  if (!puppeteer) {
    try {
      puppeteer = await import('puppeteer');
    } catch {
      throw new Error('Puppeteer not installed. Run: npm install puppeteer');
    }
  }
  return puppeteer;
}

async function ensureBrowser(headless: boolean = true) {
  if (!browser || !browser.isConnected()) {
    const pptr = await ensurePuppeteer();
    browser = await pptr.default.launch({
      headless: headless ? 'new' : false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

async function getPage(pageId: string = 'default'): Promise<any> {
  if (!pages.has(pageId)) {
    const b = await ensureBrowser();
    const page = await b.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    pages.set(pageId, page);
  }
  return pages.get(pageId);
}

// ============================================================================
// browser.open - Open a URL in the browser
// ============================================================================
export class BrowserOpenSkill extends SkillBase {
  name = 'browser.open';
  description = 'Open a URL in browser';
  category = 'browser';
  dangerous = true;

  parameters = {
    url: { type: 'string', required: true, description: 'URL to open' },
    pageId: { type: 'string', required: false, description: 'Page identifier (default: "default")' },
    headless: { type: 'boolean', required: false, description: 'Run headless (default: true)' },
    waitFor: { type: 'string', required: false, description: 'Wait for selector or "load" or "networkidle"' },
  };

  async execute(params: { url: string; pageId?: string; headless?: boolean; waitFor?: string }): Promise<SkillResult> {
    try {
      await ensureBrowser(params.headless !== false);
      const page = await getPage(params.pageId || 'default');

      const waitUntil = params.waitFor === 'networkidle' ? 'networkidle2' : 'domcontentloaded';
      await page.goto(params.url, { waitUntil, timeout: 30000 });

      if (params.waitFor && params.waitFor !== 'load' && params.waitFor !== 'networkidle') {
        await page.waitForSelector(params.waitFor, { timeout: 10000 });
      }

      const title = await page.title();
      return this.success({ url: params.url, title, pageId: params.pageId || 'default' });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// browser.click - Click on an element
// ============================================================================
export class BrowserClickSkill extends SkillBase {
  name = 'browser.click';
  description = 'Click on an element by selector or coordinates';
  category = 'browser';
  dangerous = true;

  parameters = {
    selector: { type: 'string', required: false, description: 'CSS selector to click' },
    x: { type: 'number', required: false, description: 'X coordinate' },
    y: { type: 'number', required: false, description: 'Y coordinate' },
    pageId: { type: 'string', required: false, description: 'Page identifier' },
    button: { type: 'string', required: false, description: 'Mouse button: left, right, middle' },
    clickCount: { type: 'number', required: false, description: 'Number of clicks (2 for double-click)' },
  };

  async execute(params: { selector?: string; x?: number; y?: number; pageId?: string; button?: string; clickCount?: number }): Promise<SkillResult> {
    try {
      const page = await getPage(params.pageId || 'default');

      if (params.selector) {
        await page.waitForSelector(params.selector, { timeout: 5000 });
        await page.click(params.selector, {
          button: params.button as any || 'left',
          clickCount: params.clickCount || 1,
        });
        return this.success({ clicked: params.selector });
      } else if (params.x !== undefined && params.y !== undefined) {
        await page.mouse.click(params.x, params.y, {
          button: params.button as any || 'left',
          clickCount: params.clickCount || 1,
        });
        return this.success({ clicked: { x: params.x, y: params.y } });
      } else {
        return this.error('Either selector or x,y coordinates required');
      }
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// browser.type - Type text into an element
// ============================================================================
export class BrowserTypeSkill extends SkillBase {
  name = 'browser.type';
  description = 'Type text into an input field';
  category = 'browser';
  dangerous = true;

  parameters = {
    selector: { type: 'string', required: true, description: 'CSS selector of input' },
    text: { type: 'string', required: true, description: 'Text to type' },
    pageId: { type: 'string', required: false, description: 'Page identifier' },
    clear: { type: 'boolean', required: false, description: 'Clear field before typing' },
    delay: { type: 'number', required: false, description: 'Delay between keystrokes (ms)' },
  };

  async execute(params: { selector: string; text: string; pageId?: string; clear?: boolean; delay?: number }): Promise<SkillResult> {
    try {
      const page = await getPage(params.pageId || 'default');
      await page.waitForSelector(params.selector, { timeout: 5000 });

      if (params.clear) {
        await page.click(params.selector, { clickCount: 3 });
        await page.keyboard.press('Backspace');
      }

      await page.type(params.selector, params.text, { delay: params.delay || 50 });
      return this.success({ typed: params.text, selector: params.selector });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// browser.screenshot - Take a screenshot
// ============================================================================
export class BrowserScreenshotSkill extends SkillBase {
  name = 'browser.screenshot';
  description = 'Take a screenshot of the page';
  category = 'browser';
  dangerous = false;

  parameters = {
    path: { type: 'string', required: false, description: 'Save path (default: screenshot-{timestamp}.png)' },
    selector: { type: 'string', required: false, description: 'Selector for element screenshot' },
    fullPage: { type: 'boolean', required: false, description: 'Capture full page' },
    pageId: { type: 'string', required: false, description: 'Page identifier' },
    url: { type: 'string', required: false, description: 'URL to screenshot (opens new if needed)' },
  };

  async execute(params: { path?: string; selector?: string; fullPage?: boolean; pageId?: string; url?: string }): Promise<SkillResult> {
    try {
      const page = await getPage(params.pageId || 'default');

      if (params.url) {
        await page.goto(params.url, { waitUntil: 'domcontentloaded' });
      }

      const filename = params.path || `screenshot-${Date.now()}.png`;

      if (params.selector) {
        const element = await page.$(params.selector);
        if (!element) return this.error(`Selector not found: ${params.selector}`);
        await element.screenshot({ path: filename });
      } else {
        await page.screenshot({ path: filename, fullPage: params.fullPage });
      }

      return this.success({ screenshot: filename });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// browser.extract - Extract data from page
// ============================================================================
export class BrowserExtractSkill extends SkillBase {
  name = 'browser.extract';
  description = 'Extract text/data from page elements';
  category = 'browser';
  dangerous = false;

  parameters = {
    selector: { type: 'string', required: true, description: 'CSS selector' },
    attribute: { type: 'string', required: false, description: 'Attribute to extract (default: textContent)' },
    all: { type: 'boolean', required: false, description: 'Extract from all matching elements' },
    pageId: { type: 'string', required: false, description: 'Page identifier' },
  };

  async execute(params: { selector: string; attribute?: string; all?: boolean; pageId?: string }): Promise<SkillResult> {
    try {
      const page = await getPage(params.pageId || 'default');

      const extractFn = (sel: string, attr?: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return attr ? el.getAttribute(attr) : el.textContent?.trim();
      };

      const extractAllFn = (sel: string, attr?: string) => {
        const els = document.querySelectorAll(sel);
        return Array.from(els).map(el =>
          attr ? el.getAttribute(attr) : el.textContent?.trim()
        );
      };

      let data;
      if (params.all) {
        data = await page.evaluate(extractAllFn, params.selector, params.attribute);
      } else {
        data = await page.evaluate(extractFn, params.selector, params.attribute);
      }

      return this.success({ data, selector: params.selector });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// browser.pdf - Generate PDF from page
// ============================================================================
export class BrowserPdfSkill extends SkillBase {
  name = 'browser.pdf';
  description = 'Generate PDF from current page';
  category = 'browser';
  dangerous = false;

  parameters = {
    path: { type: 'string', required: false, description: 'Save path (default: page-{timestamp}.pdf)' },
    pageId: { type: 'string', required: false, description: 'Page identifier' },
    format: { type: 'string', required: false, description: 'Paper format: A4, Letter, etc.' },
    landscape: { type: 'boolean', required: false, description: 'Landscape orientation' },
  };

  async execute(params: { path?: string; pageId?: string; format?: string; landscape?: boolean }): Promise<SkillResult> {
    try {
      const page = await getPage(params.pageId || 'default');
      const filename = params.path || `page-${Date.now()}.pdf`;

      await page.pdf({
        path: filename,
        format: params.format || 'A4',
        landscape: params.landscape || false,
        printBackground: true,
      });

      return this.success({ pdf: filename });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// browser.wait - Wait for element or time
// ============================================================================
export class BrowserWaitSkill extends SkillBase {
  name = 'browser.wait';
  description = 'Wait for selector, navigation, or time';
  category = 'browser';
  dangerous = false;

  parameters = {
    selector: { type: 'string', required: false, description: 'Wait for selector' },
    ms: { type: 'number', required: false, description: 'Wait milliseconds' },
    navigation: { type: 'boolean', required: false, description: 'Wait for navigation' },
    pageId: { type: 'string', required: false, description: 'Page identifier' },
  };

  async execute(params: { selector?: string; ms?: number; navigation?: boolean; pageId?: string }): Promise<SkillResult> {
    try {
      const page = await getPage(params.pageId || 'default');

      if (params.selector) {
        await page.waitForSelector(params.selector, { timeout: 30000 });
        return this.success({ waited: 'selector', selector: params.selector });
      } else if (params.ms) {
        await new Promise(r => setTimeout(r, params.ms));
        return this.success({ waited: 'time', ms: params.ms });
      } else if (params.navigation) {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        return this.success({ waited: 'navigation' });
      }

      return this.error('Specify selector, ms, or navigation');
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// browser.close - Close browser or page
// ============================================================================
export class BrowserCloseSkill extends SkillBase {
  name = 'browser.close';
  description = 'Close browser page or entire browser';
  category = 'browser';
  dangerous = false;

  parameters = {
    pageId: { type: 'string', required: false, description: 'Page to close (or "all" for browser)' },
  };

  async execute(params: { pageId?: string }): Promise<SkillResult> {
    try {
      if (params.pageId === 'all' && browser) {
        await browser.close();
        browser = null;
        pages.clear();
        return this.success({ closed: 'browser' });
      }

      const pageId = params.pageId || 'default';
      if (pages.has(pageId)) {
        const page = pages.get(pageId);
        await page.close();
        pages.delete(pageId);
        return this.success({ closed: pageId });
      }

      return this.error(`Page not found: ${pageId}`);
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// Export all browser skills
export const browserSkills = [
  new BrowserOpenSkill(),
  new BrowserClickSkill(),
  new BrowserTypeSkill(),
  new BrowserScreenshotSkill(),
  new BrowserExtractSkill(),
  new BrowserPdfSkill(),
  new BrowserWaitSkill(),
  new BrowserCloseSkill(),
];

export default browserSkills;
