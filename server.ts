import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  GenerationValidationError,
  generate_handover_note,
  orchestrateGeneration,
} from './src/services/generationService.js';
import { generateHandoverFilename, generateHandoverPdf } from './src/services/pdfService.js';
import { getSourcePreview, listSources } from './src/services/sourceService.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard middleware
  app.use(express.json());

  // 1. Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'shift-handover-note-generator',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Sources configuration endpoint
  app.get('/api/sources', async (_req, res) => {
    try {
      const sources = await listSources();
      res.json({ sources });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // 3. Source preview endpoint (useful for data contract inspection)
  app.get('/api/sources/:sourceId/preview', async (req, res) => {
    try {
      const preview = await getSourcePreview(req.params.sourceId);
      res.json(preview);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(404).json({ error: msg });
    }
  });

  // 4. Generation endpoint
  app.post('/api/generate', async (req, res) => {
    try {
      const result = await orchestrateGeneration(req.body);
      res.json(result);
    } catch (err) {
      if (err instanceof GenerationValidationError) {
        res.status(400).json({
          status: 'failed',
          error: 'Validation failed',
          details: err.errors,
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        status: 'failed',
        error: 'Generation failed',
        details: [msg],
      });
    }
  });

  // 5. PDF Export endpoint
  app.post('/api/handover/pdf', async (req, res) => {
    try {
      let note = req.body;
      // If client sent raw generation request or wrapped result
      if (!note.ordered_sections && req.body.shift_start && req.body.sources) {
        note = await generate_handover_note(req.body);
      } else if (req.body.note) {
        note = req.body.note;
      }

      if (!note || !note.sections) {
        res.status(400).json({
          status: 'failed',
          error: 'Invalid handover note provided for PDF generation',
        });
        return;
      }

      const pdfBytes = await generateHandoverPdf(note);
      const filename = generateHandoverFilename(note);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBytes.length);
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PDF Export Error]:', msg);
      res.status(500).json({
        status: 'failed',
        error: 'Failed to generate PDF document',
        details: [msg],
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Shift Handover App] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
