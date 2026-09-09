/**
 * categories.js
 * Purpose: GET /api/categories — the product-type dictionary for home chips.
 * Static JSON; Cache-Control: no-store to match the rest of the BFF.
 */
import { Router } from 'express';
import { publicCategories } from '../lib/categories.js';

export function createCategoriesRouter() {
  const router = Router();
  router.get('/', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ categories: publicCategories() });
  });
  return router;
}
