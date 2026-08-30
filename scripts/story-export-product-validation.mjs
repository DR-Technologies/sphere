import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PORT = 3302;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const OUTPUT_ROOT = path.resolve('artifacts/block4-2-export');
const STATUS_ROOT = path.resolve('artifacts/story-exports');
const FPS = 24;

const ORIENTATIONS = [
  { id: 'landscape', width: 1920, height: 1080 },
  { id: 'portrait', width: 1080, height: 1920 }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

function computeFrameCount(durationMs, fps) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 1;
  return Math.max(1, Math.ceil((durationMs / 1000) * fps));
}

function createStoryDefinition(orientation) {
  return {
    schemaVersion: 1,
    userId: 'validation-user',
    datasetId: 'validation-dataset',
    title: 'Sphere Export Validation',
    subtitle: 'Pipeline productivo Story -> Render -> FFmpeg',
    templateId: 'modern',
    motionPresetId: 'smooth',
    pacingPresetId: 'standard',
    orientation,
    scenes: [
      {
        id: 'scene-1',
        kind: 'intro',
        renderer: 'hero-text',
        title: 'Sphere Story',
        subtitle: 'Export productivo controlado por tiempo global.',
        layout: 'hero',
        transition: 'fade',
        durationMode: 'fixed',
        durationMs: 2600,
        source: { kind: 'none' },
        options: { eyebrow: 'Block 4.2 Validation' }
      },
      {
        id: 'scene-2',
        kind: 'kpi',
        renderer: 'kpi-counter',
        title: 'Ingresos totales',
        subtitle: 'SUM(Revenue)',
        layout: 'focus',
        transition: 'lift',
        durationMode: 'fixed',
        durationMs: 3400,
        source: {
          kind: 'metric',
          measureField: 'Revenue',
          aggregation: 'SUM',
          labelField: 'Total'
        }
      },
      {
        id: 'scene-3',
        kind: 'evolution',
        renderer: 'line-evolution',
        title: 'Revenue por mes',
        subtitle: 'SUM(Revenue) por Month',
        layout: 'focus',
        transition: 'slide',
        durationMode: 'fixed',
        durationMs: 4200,
        source: {
          kind: 'series',
          dimensionField: 'Month',
          measureField: 'Revenue',
          aggregation: 'SUM'
        }
      }
    ]
  };
}

function createMaterializedStory(orientation) {
  return {
    schemaVersion: 1,
    renderModelVersion: 1,
    storyId: 'validation-story',
    datasetId: 'validation-dataset',
    title: 'Sphere Export Validation',
    subtitle: 'Pipeline productivo Story -> Render -> FFmpeg',
    templateId: 'modern',
    motionPresetId: 'smooth',
    pacingPresetId: 'standard',
    orientation,
    generatedAt: new Date().toISOString(),
    scenes: [
      {
        sceneId: 'scene-1',
        bindingKind: 'none',
        emptyState: null,
        renderModel: {
          renderModelVersion: 1,
          sceneId: 'scene-1',
          renderer: 'hero-text',
          layout: 'hero',
          copy: {
            title: 'Sphere Story',
            subtitle: 'Export productivo controlado por tiempo global.'
          },
          theme: {
            templateId: 'modern'
          },
          motion: {
            motionPresetId: 'smooth',
            transition: 'fade'
          },
          data: {
            eyebrow: 'Block 4.2 Validation'
          }
        }
      },
      {
        sceneId: 'scene-2',
        bindingKind: 'metric',
        emptyState: null,
        renderModel: {
          renderModelVersion: 1,
          sceneId: 'scene-2',
          renderer: 'kpi-counter',
          layout: 'focus',
          copy: {
            title: 'Ingresos totales',
            subtitle: 'SUM(Revenue)'
          },
          theme: {
            templateId: 'modern'
          },
          motion: {
            motionPresetId: 'smooth',
            transition: 'lift'
          },
          data: {
            metric: {
              label: 'Revenue',
              value: 465100,
              formattedValue: '465.100'
            }
          }
        }
      },
      {
        sceneId: 'scene-3',
        bindingKind: 'series',
        emptyState: null,
        renderModel: {
          renderModelVersion: 1,
          sceneId: 'scene-3',
          renderer: 'line-evolution',
          layout: 'focus',
          copy: {
            title: 'Revenue por mes',
            subtitle: 'SUM(Revenue) por Month'
          },
          theme: {
            templateId: 'modern'
          },
          motion: {
            motionPresetId: 'smooth',
            transition: 'slide'
          },
          data: {
            dimensionField: 'Month',
            measureField: 'Revenue',
            points: [
              { key: '2026-01', label: 'Jan', value: 42000 },
              { key: '2026-02', label: 'Feb', value: 56000 },
              { key: '2026-03', label: 'Mar', value: 61000 },
              { key: '2026-04', label: 'Apr', value: 74000 },
              { key: '2026-05', label: 'May', value: 98000 },
              { key: '2026-06', label: 'Jun', value: 134100 }
            ]
          }
        }
      }
    ]
  };
}

async function ensureCleanDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function isServerReady() {
  try {
    const response = await fetch(`${BASE_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady()) return;
    await sleep(500);
  }
  throw new Error(`Server did not become ready at ${BASE_URL} within ${timeoutMs}ms`);
}

async function waitForCompletion(jobId, timeoutMs = 10 * 60 * 1000) {
  const statusPath = path.join(STATUS_ROOT, jobId, 'status.json');
  const start = Date.now();
  const history = [];

  while (Date.now() - start < timeoutMs) {
    if (await exists(statusPath)) {
      const status = await readJson(statusPath);
      history.push({
        at: new Date().toISOString(),
        status: status.status,
        phase: status.phase,
        progress: status.progress ?? null,
        currentFrame: status.currentFrame ?? null,
        frameCount: status.frameCount ?? null,
        currentTimeMs: status.currentTimeMs ?? null
      });

      if (status.status === 'completed' || status.status === 'failed') {
        return {
          status,
          history
        };
      }
    }

    await sleep(1000);
  }

  throw new Error(`Export job ${jobId} did not finish within ${timeoutMs}ms`);
}

async function startExportForOrientation(orientation) {
  const jobId = crypto.randomUUID();
  const renderToken = randomToken();
  const story = createStoryDefinition(orientation.id);
  const materializedStory = createMaterializedStory(orientation.id);
  const queuedAt = Date.now();

  const response = await fetch(`${BASE_URL}/api/story-exports/start`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      jobId,
      renderToken,
      story,
      materializedStory,
      orientation: orientation.id
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to start export for ${orientation.id}: ${response.status}`);
  }

  const { status, history } = await waitForCompletion(jobId);
  const finishedAt = Date.now();
  const outputPath = path.join(STATUS_ROOT, jobId, 'story.mp4');
  const outputExists = await exists(outputPath);
  const outputSizeBytes = outputExists ? (await fs.stat(outputPath)).size : 0;
  const durationMs = Number(status.durationMs || 0);
  const expectedFrames = computeFrameCount(durationMs, status.fps || FPS);

  return {
    orientation: orientation.id,
    viewport: {
      width: orientation.width,
      height: orientation.height
    },
    queuedAt: new Date(queuedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    totalWallTimeMs: finishedAt - queuedAt,
    expectedFrames,
    renderedFrames: status.currentFrame || 0,
    outputExists,
    outputSizeBytes,
    status,
    history
  };
}

async function main() {
  await ensureCleanDir(OUTPUT_ROOT);

  const server = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', HOST], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const serverLogPath = path.join(OUTPUT_ROOT, 'server.log');
  const serverLog = [];
  server.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    serverLog.push(text);
    process.stdout.write(text);
  });
  server.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    serverLog.push(text);
    process.stderr.write(text);
  });

  try {
    await waitForServer();

    const results = [];
    for (const orientation of ORIENTATIONS) {
      const result = await startExportForOrientation(orientation);
      results.push(result);
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      fps: FPS,
      results
    };

    await fs.writeFile(path.join(OUTPUT_ROOT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    await fs.writeFile(serverLogPath, serverLog.join(''), 'utf8');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
