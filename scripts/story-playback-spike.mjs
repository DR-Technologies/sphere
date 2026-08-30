import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PORT = 3301;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const OUTPUT_ROOT = path.resolve('artifacts/m2-block2');
const FPS = 24;

const ORIENTATIONS = [
  { id: 'landscape', width: 1920, height: 1080 },
  { id: 'portrait', width: 1080, height: 1920 }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hrtimeMs() {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function isPortReady(url) {
  return fetch(url).then((response) => response.ok).catch(() => false);
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortReady(url)) {
      return;
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

async function ensureCleanDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileSize(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size;
}

async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function renderOrientation({ browser, orientation }) {
  const outputDir = path.join(OUTPUT_ROOT, orientation.id);
  const framesDir = path.join(outputDir, 'frames');
  await ensureCleanDir(framesDir);

  const page = await browser.newPage({
    viewport: {
      width: orientation.width,
      height: orientation.height
    },
    deviceScaleFactor: 1
  });

  const route = `${BASE_URL}/labs/story-playback?mode=render&chrome=0&template=modern&preset=smooth&orientation=${orientation.id}&width=${orientation.width}&height=${orientation.height}&timeMs=0`;
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-story-ready="true"]');

  const totalDurationMs = await page.locator('[data-story-ready="true"]').getAttribute('data-story-total-duration-ms');
  const parsedDuration = Number(totalDurationMs || 0);
  if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
    throw new Error(`Invalid total duration for ${orientation.id}: ${totalDurationMs}`);
  }

  const frameCount = Math.floor((parsedDuration / 1000) * FPS) + 1;
  const previewTimes = [
    Math.min(parsedDuration, 450),
    Math.min(parsedDuration, Math.round(parsedDuration * 0.42)),
    Math.min(parsedDuration, Math.round(parsedDuration * 0.82))
  ];
  const renderStartMs = hrtimeMs();
  let peakRssBytes = process.memoryUsage().rss;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const timeMs = Math.min(parsedDuration, Math.round((frameIndex / FPS) * 1000));
    await page.evaluate(async (nextTimeMs) => {
      const api = window.__SPHERE_STORY_RENDER__;
      if (!api) throw new Error('Story render API is not available.');
      api.setTimeMs(nextTimeMs);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, timeMs);

    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
    const framePath = path.join(framesDir, `frame-${String(frameIndex + 1).padStart(4, '0')}.png`);
    await page.locator('[data-testid="story-frame"]').screenshot({ path: framePath });
  }

  for (let index = 0; index < previewTimes.length; index += 1) {
    const timeMs = Math.round(previewTimes[index]);
    await page.evaluate(async (nextTimeMs) => {
      const api = window.__SPHERE_STORY_RENDER__;
      if (!api) throw new Error('Story render API is not available.');
      api.setTimeMs(nextTimeMs);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, timeMs);
    await page.locator('[data-testid="story-frame"]').screenshot({
      path: path.join(outputDir, `preview-${index + 1}.png`)
    });
  }

  const renderTimeMs = hrtimeMs() - renderStartMs;
  await page.close();

  return {
    orientation: orientation.id,
    width: orientation.width,
    height: orientation.height,
    durationMs: parsedDuration,
    frameCount,
    renderTimeMs,
    peakRssBytes,
    outputDir
  };
}

async function encodeMp4({ orientationResult }) {
  const ffmpegAvailable = await commandExists('ffmpeg');
  if (!ffmpegAvailable) {
    return {
      mp4Path: null,
      outputSizeBytes: null,
      ffmpegAvailable: false
    };
  }

  const mp4Path = path.join(orientationResult.outputDir, `${orientationResult.orientation}.mp4`);
  const inputPattern = path.join(orientationResult.outputDir, 'frames', 'frame-%04d.png');

  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-framerate', String(FPS),
      '-i', inputPattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      mp4Path
    ], { stdio: 'inherit' });

    ffmpeg.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });

  return {
    mp4Path,
    outputSizeBytes: await fileSize(mp4Path),
    ffmpegAvailable: true
  };
}

async function main() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });

  const server = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', HOST], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer(`${BASE_URL}/labs/story-playback?mode=render&chrome=0`);
    const browser = await chromium.launch({ headless: true });
    const summary = [];

    for (const orientation of ORIENTATIONS) {
      const orientationResult = await renderOrientation({ browser, orientation });
      const encodeResult = await encodeMp4({ orientationResult });
      summary.push({
        ...orientationResult,
        ...encodeResult
      });
    }

    await browser.close();
    await fs.writeFile(
      path.join(OUTPUT_ROOT, 'summary.json'),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        fps: FPS,
        summary
      }, null, 2)
    );
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
