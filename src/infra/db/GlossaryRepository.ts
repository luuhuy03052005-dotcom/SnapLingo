import { eq } from 'drizzle-orm';
import { initDatabase } from './connection';
import { glossary } from './schema';

export interface GlossaryTerm {
  id?: number;
  sourceTerm: string;
  targetTerm: string;
  createdAt: string;
}

/**
 * Glossary Repository — CRUD for custom term pairs.
 * Why: Lets users define terms that should never be mistranslated.
 */
export class GlossaryRepository {
  private getDb() {
    return initDatabase().db;
  }

  async getAll(): Promise<GlossaryTerm[]> {
    const db = this.getDb();
    return db.select().from(glossary).all();
  }

  async add(sourceTerm: string, targetTerm: string): Promise<void> {
    const db = this.getDb();
    await db.insert(glossary).values({
      sourceTerm, targetTerm, createdAt: new Date().toISOString()
    });
  }

  async deleteById(id: number): Promise<void> {
    const db = this.getDb();
    await db.delete(glossary).where(eq(glossary.id, id));
  }

  async clear(): Promise<void> {
    const db = this.getDb();
    await db.delete(glossary);
  }
}
